// file : errorHandler.util.ts

/**
 * واجهة البيانات الإضافية للخطأ
 */
interface ErrorData {
     [key: string]: unknown;
     _truncated?: boolean;
     _originalSize?: number;
     _message?: string;
     preview?: string;
}

/**
 * واجهة الخطأ المخصص بصيغة JSON
 */
interface CustomErrorJSON {
     name: string;
     message: string;
     status: number;
     code: string | null;
     data: ErrorData;
     timestamp: string;
     stack?: string;
}

/**
 * فئة مخصصة للأخطاء مع معلومات إضافية
 * توفر هيكلة موحدة للأخطاء في التطبيق مع إمكانية إضافة بيانات مخصصة
 * 
 * @example
 * // إنشاء خطأ بسيط
 * const error = new CustomError(404, 'User not found');
 * 
 * @example
 * // إنشاء خطأ مع بيانات إضافية
 * const error = new CustomError(400, 'Validation failed', 'VALIDATION_ERROR', {
 *     field: 'email',
 *     value: 'invalid-email'
 * });
 * 
 * @example
 * // استخدام في middleware
 * const { call } = require('./middlewares/errors/functionErrorHandler.middleware.js');
 * app.get('/users/:id', call(async (req, res) => {
 *     const user = await User.findById(req.params.id);
 *     if (!user) {
 *         throw new CustomError(404, 'User not found', 'USER_NOT_FOUND', { userId: req.params.id });
 *     }
 *     res.json(user);
 * }));
 */
class CustomError extends Error {
     public status: number;
     public code: string | null;
     public data: ErrorData;
     public timestamp: string;

     /**
      * إنشاء خطأ مخصص جديد
      * @param status - رمز حالة HTTP
      * @param message - رسالة الخطأ
      * @param code - رمز الخطأ للتصنيف (اختياري)
      * @param data - بيانات إضافية مرتبطة بالخطأ (محدودة بـ 1KB)
      * @param stack - stack trace مخصص (اختياري)
      */
     constructor(
          status: number,
          message: string,
          code: string | null = null,
          data: ErrorData = {},
          stack: string | null = null
     ) {
          super(message);
          this.status = status;
          this.code = code;
          this.data = this._validateDataSize(data);
          this.name = this.constructor.name;
          this.timestamp = new Date().toISOString();
          
          // إنشاء stack trace تلقائياً أو استخدام المخصص
          if (!stack) {
               Error.captureStackTrace(this, this.constructor);
          } else {
               this.stack = stack;
          }
     }

     /**
      * التحقق من حجم البيانات وتقليمها إذا لزم الأمر
      * @param data - البيانات المراد فحصها
      * @returns البيانات المفحوصة والمحدودة الحجم
      * @private
      */
     private _validateDataSize(data: ErrorData): ErrorData {
          if (typeof data !== 'object' || data === null) {
               return {};
          }
          
          const dataString = JSON.stringify(data);
          const maxSize = 1024; // 1KB
          
          if (dataString.length > maxSize) {
               console.warn(`Error data size (${dataString.length} bytes) exceeds limit (${maxSize} bytes). Data will be truncated.`);
               return {
                    _truncated: true,
                    _originalSize: dataString.length,
                    _message: 'Data truncated due to size limit',
                    preview: dataString.substring(0, maxSize - 100) + '...'
               };
          }
          
          return data;
     }

     /**
      * تحويل الخطأ إلى كائن JSON للتسجيل أو الإرسال
      * @returns كائن يحتوي على جميع معلومات الخطأ
      */
     public toJSON(): CustomErrorJSON {
          return {
               name: this.name,
               message: this.message,
               status: this.status,
               code: this.code,
               data: this.data,
               timestamp: this.timestamp,
               stack: this.stack
          };
     }
}

export default CustomError;
export type { ErrorData, CustomErrorJSON };
