import Joi, { ObjectSchema } from 'joi';

/**
 * مخططات التحقق من صحة البيانات لإدارة السيارات
 * Validation schemas for cars management data
 */

interface ValidationSchema {
  params?: ObjectSchema;
  body?: ObjectSchema;
  query?: ObjectSchema;
}

/**
 * مخطط التحقق من معرف السيارة (UUID)
 * Car ID validation schema
 */
export const getCarByIdSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف السيارة يجب أن يكون نصاً',
        'string.guid': 'معرف السيارة يجب أن يكون UUID صالح',
        'any.required': 'معرف السيارة مطلوب'
      })
  })
};

/**
 * مخطط التحقق من رقم VIN
 * VIN validation schema
 */
export const getCarByVinSchema: ValidationSchema = {
  params: Joi.object({
    vin: Joi.string()
      .length(17)
      .uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      .required()
      .messages({
        'string.base': 'رقم VIN يجب أن يكون نصاً',
        'string.length': 'رقم VIN يجب أن يكون 17 حرف',
        'string.pattern.base': 'رقم VIN غير صالح',
        'any.required': 'رقم VIN مطلوب'
      })
  })
};

/**
 * مخطط التحقق من إنشاء سيارة جديدة
 * Create car validation schema
 */
export const createCarSchema: ValidationSchema = {
  body: Joi.object({
    car_make: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.base': 'شركة التصنيع يجب أن تكون نصاً',
        'string.min': 'شركة التصنيع يجب أن تكون على الأقل حرف واحد',
        'string.max': 'شركة التصنيع يجب أن لا تزيد عن 100 حرف',
        'any.required': 'شركة التصنيع مطلوبة'
      }),

    car_model: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.base': 'موديل السيارة يجب أن يكون نصاً',
        'string.min': 'موديل السيارة يجب أن يكون على الأقل حرف واحد',
        'string.max': 'موديل السيارة يجب أن لا يزيد عن 100 حرف',
        'any.required': 'موديل السيارة مطلوب'
      }),

    car_model_year: Joi.number()
      .integer()
      .min(1900)
      .max(2100)
      .required()
      .messages({
        'number.base': 'سنة الصنع يجب أن تكون رقماً',
        'number.integer': 'سنة الصنع يجب أن تكون عدداً صحيحاً',
        'number.min': 'سنة الصنع يجب أن تكون 1900 على الأقل',
        'number.max': 'سنة الصنع يجب أن لا تزيد عن 2100',
        'any.required': 'سنة الصنع مطلوبة'
      }),

    car_vin: Joi.string()
      .length(17)
      .uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      .required()
      .messages({
        'string.base': 'رقم VIN يجب أن يكون نصاً',
        'string.length': 'رقم VIN يجب أن يكون 17 حرف',
        'string.pattern.base': 'رقم VIN غير صالح (لا يحتوي على I, O, Q)',
        'any.required': 'رقم VIN مطلوب'
      })
  })
};

/**
 * مخطط التحقق من تحديث سيارة
 * Update car validation schema
 */
export const updateCarSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف السيارة يجب أن يكون نصاً',
        'string.guid': 'معرف السيارة يجب أن يكون UUID صالح',
        'any.required': 'معرف السيارة مطلوب'
      })
  }),
  body: Joi.object({
    car_make: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.base': 'شركة التصنيع يجب أن تكون نصاً',
        'string.min': 'شركة التصنيع يجب أن تكون على الأقل حرف واحد',
        'string.max': 'شركة التصنيع يجب أن لا تزيد عن 100 حرف'
      }),

    car_model: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.base': 'موديل السيارة يجب أن يكون نصاً',
        'string.min': 'موديل السيارة يجب أن يكون على الأقل حرف واحد',
        'string.max': 'موديل السيارة يجب أن لا يزيد عن 100 حرف'
      }),

    car_model_year: Joi.number()
      .integer()
      .min(1900)
      .max(2100)
      .messages({
        'number.base': 'سنة الصنع يجب أن تكون رقماً',
        'number.integer': 'سنة الصنع يجب أن تكون عدداً صحيحاً',
        'number.min': 'سنة الصنع يجب أن تكون 1900 على الأقل',
        'number.max': 'سنة الصنع يجب أن لا تزيد عن 2100'
      }),

    car_vin: Joi.string()
      .length(17)
      .uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      .messages({
        'string.base': 'رقم VIN يجب أن يكون نصاً',
        'string.length': 'رقم VIN يجب أن يكون 17 حرف',
        'string.pattern.base': 'رقم VIN غير صالح (لا يحتوي على I, O, Q)'
      })
  }).min(1).messages({
    'object.min': 'يجب توفير بيانات للتحديث'
  })
};

/**
 * مخطط التحقق من حذف سيارة
 * Delete car validation schema
 */
export const deleteCarSchema: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرف السيارة يجب أن يكون نصاً',
        'string.guid': 'معرف السيارة يجب أن يكون UUID صالح',
        'any.required': 'معرف السيارة مطلوب'
      })
  })
};
