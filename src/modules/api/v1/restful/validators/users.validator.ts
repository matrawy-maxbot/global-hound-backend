import Joi, { ObjectSchema } from 'joi';

/**
 * مخططات التحقق من صحة البيانات لإدارة المستخدمين
 * Validation schemas for users management data
 */

interface ValidationSchema {
  params?: ObjectSchema;
  body?: ObjectSchema;
  query?: ObjectSchema;
}

/**
 * مخطط التحقق من معرف المستخدم (UUID)
 * User ID validation schema
 */
export const getUserByIdSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
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
 * مخطط التحقق من البريد الإلكتروني
 * Email validation schema
 */
export const getUserByEmailSchema: ValidationSchema = {
  params: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.base': 'البريد الإلكتروني يجب أن يكون نصاً',
        'string.email': 'البريد الإلكتروني غير صالح',
        'any.required': 'البريد الإلكتروني مطلوب'
      })
  })
};

/**
 * مخطط التحقق من تحديث المستخدم
 * Update user validation schema
 */
export const updateUserSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف المستخدم يجب أن يكون نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      })
  }),
  body: Joi.object({
    first_name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.base': 'الاسم الأول يجب أن يكون نصاً',
        'string.min': 'الاسم الأول يجب أن يكون على الأقل حرف واحد',
        'string.max': 'الاسم الأول يجب أن لا يزيد عن 100 حرف'
      }),
    last_name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.base': 'اسم العائلة يجب أن يكون نصاً',
        'string.min': 'اسم العائلة يجب أن يكون على الأقل حرف واحد',
        'string.max': 'اسم العائلة يجب أن لا يزيد عن 100 حرف'
      }),
    display_name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.base': 'اسم العرض يجب أن يكون نصاً',
        'string.min': 'اسم العرض يجب أن يكون على الأقل حرف واحد',
        'string.max': 'اسم العرض يجب أن لا يزيد عن 100 حرف'
      }),
    avatar_url: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.base': 'رابط الصورة يجب أن يكون نصاً',
        'string.uri': 'رابط الصورة غير صالح'
      })
  }).min(1).messages({
    'object.min': 'يجب توفير بيانات للتحديث'
  })
};

/**
 * مخطط التحقق من حذف المستخدم
 * Delete user validation schema
 */
export const deleteUserSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف المستخدم يجب أن يكون نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      })
  })
};
