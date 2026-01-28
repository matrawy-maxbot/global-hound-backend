import Joi, { ObjectSchema } from 'joi';

/**
 * مخططات التحقق من صحة البيانات لإدارة مشرفي المشاريع
 * Validation schemas for project admins management data
 */

interface ValidationSchema {
  params?: ObjectSchema;
  body?: ObjectSchema;
  query?: ObjectSchema;
}

/**
 * مخطط التحقق من معرف مشرف المشروع (UUID)
 * Project Admin ID validation schema
 */
export const getProjectAdminByIdSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف مشرف المشروع يجب أن يكون نصاً',
        'string.guid': 'معرف مشرف المشروع يجب أن يكون UUID صالح',
        'any.required': 'معرف مشرف المشروع مطلوب'
      })
  })
};

/**
 * مخطط التحقق من معرف المستخدم
 * User ID validation schema
 */
export const getProjectAdminByUserIdSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'يجب أن يكون معرف المستخدم نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      })
  })
};

/**
 * مخطط التحقق من البحث بالصلاحية
 * Get by permission validation schema
 */
export const getProjectAdminsByPermissionSchema: ValidationSchema = {
  params: Joi.object({
    permission: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.base': 'يجب أن تكون الصلاحية نصاً',
        'string.trim': 'الصلاحية لا يمكن أن تحتوي على أحرف إضافية',
        'string.min': 'الصلاحية يجب أن تكون على الأقل حرف واحد',
        'string.max': 'الصلاحية يجب أن لا تزيد عن 100 حرف',
        'any.required': 'الصلاحية مطلوبة'
      })
  })
};

/**
 * مخطط التحقق من إنشاء مشرف مشروع جديد
 * Create project admin validation schema
 */
export const createProjectAdminSchema: ValidationSchema = {
  body: Joi.object({
    user_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'يجب أن يكون معرف المستخدم نصاً',
        'string.guid': 'معرف المستخدم يجب أن يكون UUID صالح',
        'any.required': 'معرف المستخدم مطلوب'
      }),

    permissions: Joi.array()
      .items(Joi.string().trim().min(1).max(100))
      .default([])
      .messages({
        'array.base': 'الصلاحيات يجب أن تكون مصفوفة',
        'string.base': 'كل صلاحية يجب أن تكون نصاً',
        'string.min': 'الصلاحية يجب أن تكون على الأقل حرف واحد',
        'string.max': 'الصلاحية يجب أن لا تزيد عن 100 حرف'
      })
  })
};

/**
 * مخطط التحقق من تحديث مشرف المشروع
 * Update project admin validation schema
 */
export const updateProjectAdminSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف مشرف المشروع يجب أن يكون نصاً',
        'string.guid': 'معرف مشرف المشروع يجب أن يكون UUID صالح',
        'any.required': 'معرف مشرف المشروع مطلوب'
      })
  }),
  body: Joi.object({
    permissions: Joi.array()
      .items(Joi.string().trim().min(1).max(100))
      .messages({
        'array.base': 'الصلاحيات يجب أن تكون مصفوفة',
        'string.base': 'كل صلاحية يجب أن تكون نصاً',
        'string.min': 'الصلاحية يجب أن تكون على الأقل حرف واحد',
        'string.max': 'الصلاحية يجب أن لا تزيد عن 100 حرف'
      })
  }).min(1).messages({
    'object.min': 'يجب توفير بيانات للتحديث'
  })
};

/**
 * مخطط التحقق من إضافة/إزالة صلاحية
 * Add/Remove permission validation schema
 */
export const permissionActionSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف مشرف المشروع يجب أن يكون نصاً',
        'string.guid': 'معرف مشرف المشروع يجب أن يكون UUID صالح',
        'any.required': 'معرف مشرف المشروع مطلوب'
      })
  }),
  body: Joi.object({
    permission: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.base': 'يجب أن تكون الصلاحية نصاً',
        'string.trim': 'الصلاحية لا يمكن أن تحتوي على أحرف إضافية',
        'string.min': 'الصلاحية يجب أن تكون على الأقل حرف واحد',
        'string.max': 'الصلاحية يجب أن لا تزيد عن 100 حرف',
        'any.required': 'الصلاحية مطلوبة'
      })
  })
};

/**
 * مخطط التحقق من حذف مشرف المشروع
 * Delete project admin validation schema
 */
export const deleteProjectAdminSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف مشرف المشروع يجب أن يكون نصاً',
        'string.guid': 'معرف مشرف المشروع يجب أن يكون UUID صالح',
        'any.required': 'معرف مشرف المشروع مطلوب'
      })
  })
};

/**
 * مخطط التحقق من وجود صلاحية للمستخدم
 * Check user permission validation schema
 */
export const checkPermissionSchema: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string()
      .pattern(/^\d+$/)
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.base': 'يجب أن يكون معرف المستخدم نصاً',
        'string.pattern.base': 'معرف المستخدم يجب أن يحتوي على أرقام فقط',
        'string.trim': 'معرف المستخدم لا يمكن أن يحتوي على أحرف إضافية',
        'string.min': 'معرف المستخدم يجب أن يكون على الأقل حرف واحد',
        'string.max': 'معرف المستخدم يجب أن لا يزيد عن 50 حرف',
        'any.required': 'معرف المستخدم مطلوب'
      }),
    permission: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.base': 'يجب أن تكون الصلاحية نصاً',
        'string.trim': 'الصلاحية لا يمكن أن تحتوي على أحرف إضافية',
        'string.min': 'الصلاحية يجب أن تكون على الأقل حرف واحد',
        'string.max': 'الصلاحية يجب أن لا تزيد عن 100 حرف',
        'any.required': 'الصلاحية مطلوبة'
      })
  })
};
