import Joi, { Schema, ObjectSchema, ValidationError } from 'joi';

/**
 * نوع تكوين المخطط
 */
type SchemaConfig = Record<string, Joi.AnySchema>;

/**
 * التحقق من صحة البيانات باستخدام Joi
 * @param data - البيانات المراد التحقق منها
 * @param schemaConfig - تكوين مخطط التحقق
 * @param errorThrow - هل يتم رمي خطأ عند الفشل (الافتراضي: false)
 * @returns البيانات المتحقق منها
 * @throws Error إذا كان errorThrow = true وفشل التحقق
 */
const validate = <T = unknown>(
    data: unknown,
    schemaConfig: SchemaConfig,
    errorThrow: boolean = false
): T => {
    if (!schemaConfig) {
        throw new Error('Schema is required for validation');
    }
    
    const schema: ObjectSchema = Joi.object(schemaConfig).unknown();

    const { value: schemaData, error } = schema.validate(data, {
        abortEarly: false, // عرض جميع الأخطاء
    });
    
    if (error) {
        const errorMessage = `Data validation error: ${error.details.map((x) => x.message).join(', ')}`;
        if (errorThrow) {
            throw new Error(errorMessage);
        } else {
            console.error(errorMessage);
        }
    }

    return schemaData as T;
};

export default { validate };
export type { SchemaConfig };
