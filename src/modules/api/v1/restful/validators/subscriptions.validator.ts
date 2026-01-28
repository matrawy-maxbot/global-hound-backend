import Joi, { ObjectSchema } from 'joi';

/**
 * مخططات التحقق من صحة البيانات لإدارة الاشتراكات - متوافقة مع Stripe
 * Validation schemas for subscriptions management data - Stripe compatible
 */

interface ValidationSchema {
  params?: ObjectSchema;
  body?: ObjectSchema;
  query?: ObjectSchema;
}

// القيم المسموح بها للـ enums - متوافقة مع Stripe
const SUBSCRIPTION_STATUS = ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'];
const BILLING_INTERVAL = ['day', 'week', 'month', 'year'];

/**
 * مخطط التحقق من معرف الاشتراك (UUID)
 * Subscription ID validation schema
 * يقبل UUID أو stripe_subscription_id (يبدأ بـ sub_)
 */
export const getSubscriptionByIdSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  })
};

/**
 * مخطط التحقق من معرف المستخدم
 * User ID validation schema
 */
export const getSubscriptionsByUserIdSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف المستخدم يجب أن يكون نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      })
  })
};

/**
 * مخطط التحقق من إنشاء اشتراك جديد - متوافق مع Stripe
 * Create subscription validation schema - Stripe compatible
 */
export const createSubscriptionSchema: ValidationSchema = {
  body: Joi.object({
    user_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف المستخدم يجب أن يكون نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      }),

    // Stripe IDs
    stripe_subscription_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف اشتراك Stripe يجب أن يكون نصاً',
        'string.max': 'معرف اشتراك Stripe يجب أن لا يزيد عن 255 حرف'
      }),

    stripe_customer_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف عميل Stripe يجب أن يكون نصاً',
        'string.max': 'معرف عميل Stripe يجب أن لا يزيد عن 255 حرف'
      }),

    stripe_price_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف سعر Stripe يجب أن يكون نصاً',
        'string.max': 'معرف سعر Stripe يجب أن لا يزيد عن 255 حرف'
      }),

    // Plan info - flexible string
    plan_name: Joi.string()
      .max(100)
      .required()
      .messages({
        'string.base': 'اسم الخطة يجب أن يكون نصاً',
        'string.max': 'اسم الخطة يجب أن لا يزيد عن 100 حرف',
        'any.required': 'اسم الخطة مطلوب'
      }),

    status: Joi.string()
      .valid(...SUBSCRIPTION_STATUS)
      .default('incomplete')
      .messages({
        'string.base': 'حالة الاشتراك يجب أن تكون نصاً',
        'any.only': `حالة الاشتراك يجب أن تكون إحدى القيم: ${SUBSCRIPTION_STATUS.join(', ')}`
      }),

    // Billing
    billing_interval: Joi.string()
      .valid(...BILLING_INTERVAL)
      .required()
      .messages({
        'string.base': 'فترة الفوترة يجب أن تكون نصاً',
        'any.only': `فترة الفوترة يجب أن تكون إحدى القيم: ${BILLING_INTERVAL.join(', ')}`,
        'any.required': 'فترة الفوترة مطلوبة'
      }),

    billing_interval_count: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'عدد فترات الفوترة يجب أن يكون رقماً',
        'number.integer': 'عدد فترات الفوترة يجب أن يكون عدداً صحيحاً',
        'number.min': 'عدد فترات الفوترة يجب أن يكون 1 على الأقل'
      }),

    amount: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'المبلغ يجب أن يكون رقماً',
        'number.integer': 'المبلغ يجب أن يكون عدداً صحيحاً (بالسنت)',
        'number.min': 'المبلغ لا يمكن أن يكون سالباً',
        'any.required': 'المبلغ مطلوب'
      }),

    currency: Joi.string()
      .length(3)
      .lowercase()
      .default('usd')
      .messages({
        'string.base': 'العملة يجب أن تكون نصاً',
        'string.length': 'العملة يجب أن تكون 3 أحرف'
      }),

    // Dates
    current_period_start: Joi.date()
      .iso()
      .messages({
        'date.base': 'تاريخ بداية الفترة غير صالح',
        'date.format': 'تاريخ بداية الفترة يجب أن يكون بتنسيق ISO'
      }),

    current_period_end: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'تاريخ نهاية الفترة غير صالح',
        'date.format': 'تاريخ نهاية الفترة يجب أن يكون بتنسيق ISO',
        'any.required': 'تاريخ نهاية الفترة مطلوب'
      }),

    trial_start: Joi.date()
      .iso()
      .messages({
        'date.base': 'تاريخ بداية التجربة غير صالح',
        'date.format': 'تاريخ بداية التجربة يجب أن يكون بتنسيق ISO'
      }),

    trial_end: Joi.date()
      .iso()
      .messages({
        'date.base': 'تاريخ انتهاء التجربة غير صالح',
        'date.format': 'تاريخ انتهاء التجربة يجب أن يكون بتنسيق ISO'
      }),

    cancel_at_period_end: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'إلغاء في نهاية الفترة يجب أن يكون قيمة منطقية'
      }),

    default_payment_method: Joi.string()
      .max(255)
      .messages({
        'string.base': 'طريقة الدفع الافتراضية يجب أن تكون نصاً',
        'string.max': 'طريقة الدفع الافتراضية يجب أن لا تزيد عن 255 حرف'
      }),

    metadata: Joi.object()
      .messages({
        'object.base': 'البيانات الإضافية يجب أن تكون كائن'
      })
  })
};

/**
 * مخطط التحقق من تحديث الاشتراك - متوافق مع Stripe
 * Update subscription validation schema - Stripe compatible
 */
export const updateSubscriptionSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'string.guid': 'معرف الاشتراك يجب أن يكون UUID صالح',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  }),
  body: Joi.object({
    stripe_subscription_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف اشتراك Stripe يجب أن يكون نصاً'
      }),

    stripe_customer_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف عميل Stripe يجب أن يكون نصاً'
      }),

    stripe_price_id: Joi.string()
      .max(255)
      .messages({
        'string.base': 'معرف سعر Stripe يجب أن يكون نصاً'
      }),

    plan_name: Joi.string()
      .max(100)
      .messages({
        'string.base': 'اسم الخطة يجب أن يكون نصاً',
        'string.max': 'اسم الخطة يجب أن لا يزيد عن 100 حرف'
      }),

    status: Joi.string()
      .valid(...SUBSCRIPTION_STATUS)
      .messages({
        'string.base': 'حالة الاشتراك يجب أن تكون نصاً',
        'any.only': `حالة الاشتراك يجب أن تكون إحدى القيم: ${SUBSCRIPTION_STATUS.join(', ')}`
      }),

    billing_interval: Joi.string()
      .valid(...BILLING_INTERVAL)
      .messages({
        'string.base': 'فترة الفوترة يجب أن تكون نصاً',
        'any.only': `فترة الفوترة يجب أن تكون إحدى القيم: ${BILLING_INTERVAL.join(', ')}`
      }),

    billing_interval_count: Joi.number()
      .integer()
      .min(1)
      .messages({
        'number.base': 'عدد فترات الفوترة يجب أن يكون رقماً',
        'number.integer': 'عدد فترات الفوترة يجب أن يكون عدداً صحيحاً'
      }),

    amount: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.base': 'المبلغ يجب أن يكون رقماً',
        'number.integer': 'المبلغ يجب أن يكون عدداً صحيحاً (بالسنت)',
        'number.min': 'المبلغ لا يمكن أن يكون سالباً'
      }),

    currency: Joi.string()
      .length(3)
      .lowercase()
      .messages({
        'string.base': 'العملة يجب أن تكون نصاً',
        'string.length': 'العملة يجب أن تكون 3 أحرف'
      }),

    current_period_end: Joi.date()
      .iso()
      .messages({
        'date.base': 'تاريخ نهاية الفترة غير صالح',
        'date.format': 'تاريخ نهاية الفترة يجب أن يكون بتنسيق ISO'
      }),

    trial_end: Joi.date()
      .iso()
      .messages({
        'date.base': 'تاريخ انتهاء التجربة غير صالح',
        'date.format': 'تاريخ انتهاء التجربة يجب أن يكون بتنسيق ISO'
      }),

    cancel_at_period_end: Joi.boolean()
      .messages({
        'boolean.base': 'إلغاء في نهاية الفترة يجب أن يكون قيمة منطقية'
      }),

    default_payment_method: Joi.string()
      .max(255)
      .messages({
        'string.base': 'طريقة الدفع الافتراضية يجب أن تكون نصاً'
      }),

    metadata: Joi.object()
      .messages({
        'object.base': 'البيانات الإضافية يجب أن تكون كائن'
      })
  }).min(1).messages({
    'object.min': 'يجب توفير بيانات للتحديث'
  })
};

/**
 * مخطط التحقق من إلغاء الاشتراك
 * Cancel subscription validation schema
 * يقبل UUID أو stripe_subscription_id (يبدأ بـ sub_)
 */
export const cancelSubscriptionSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  })
};

/**
 * مخطط التحقق من تجديد الاشتراك
 * Renew subscription validation schema
 * يقبل UUID أو stripe_subscription_id (يبدأ بـ sub_)
 */
export const renewSubscriptionSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  }),
  body: Joi.object({
    period_end: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'تاريخ نهاية الفترة غير صالح',
        'date.format': 'تاريخ نهاية الفترة يجب أن يكون بتنسيق ISO',
        'any.required': 'تاريخ نهاية الفترة الجديد مطلوب'
      })
  })
};

/**
 * مخطط التحقق من تغيير خطة الاشتراك
 * Change subscription plan validation schema
 */
export const changePlanSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'string.guid': 'معرف الاشتراك يجب أن يكون UUID صالح',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  }),
  body: Joi.object({
    plan_name: Joi.string()
      .max(100)
      .required()
      .messages({
        'string.base': 'اسم الخطة يجب أن يكون نصاً',
        'string.max': 'اسم الخطة يجب أن لا يزيد عن 100 حرف',
        'any.required': 'اسم الخطة الجديدة مطلوب'
      }),

    stripe_price_id: Joi.string()
      .max(255)
      .required()
      .messages({
        'string.base': 'معرف سعر Stripe يجب أن يكون نصاً',
        'any.required': 'معرف سعر Stripe مطلوب'
      }),

    amount: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'المبلغ يجب أن يكون رقماً',
        'number.integer': 'المبلغ يجب أن يكون عدداً صحيحاً (بالسنت)',
        'number.min': 'المبلغ لا يمكن أن يكون سالباً',
        'any.required': 'المبلغ الجديد مطلوب'
      })
  })
};

/**
 * مخطط التحقق من حذف الاشتراك
 * Delete subscription validation schema
 */
export const deleteSubscriptionSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف الاشتراك يجب أن يكون نصاً',
        'string.guid': 'معرف الاشتراك يجب أن يكون UUID صالح',
        'any.required': 'معرف الاشتراك مطلوب'
      })
  })
};
