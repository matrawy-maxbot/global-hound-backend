// file : logError.repository.ts

import { Request } from 'express';
import type CustomError from '../errorHandler.util.js';

/**
 * واجهة الخطأ القابل للتسجيل
 */
interface LoggableError {
     status?: number;
     message: string;
     data?: Record<string, unknown>;
     stack?: string;
}

/**
 * دالة تسجيل الأخطاء في وحدة التحكم (Console)
 * تعرض معلومات مفصلة عن الخطأ بتنسيق واضح ومنظم
 * @param error - كائن الخطأ المراد تسجيله
 * @param req - كائن الطلب (اختياري) لعرض معلومات إضافية
 */
export const logError = (error: CustomError | LoggableError, req?: Request): void => {
     try {
          // التأكد من وجود خاصية data في الخطأ
          const errorData = error.data || {};
          
          // عرض معلومات أساسية عن الخطأ مع timestamp
          console.error(
               "\n--------------------------------------------\n",
               `[${new Date().toISOString()}] Error status : ${error.status ?? 'N/A'} - ${error.message}`,
               "\n--------------------------------------------\n"
          );

          // عرض معلومات الطلب إذا كانت متاحة
          if (req) {
               console.error(`Request URL: ${req.originalUrl}, Method: ${req.method}, IP: ${req.ip}`);
          }
          
          // عرض البيانات الإضافية إذا كانت موجودة
          if (Object.keys(errorData).length > 0) {
               console.error('Additional Data:', JSON.stringify(errorData, null, 2), "\n");
          }

          // عرض stack trace للمساعدة في التتبع
          if (error.stack) {
               console.error(error.stack);
          }
     } catch (err) {
          console.error("Error in logError function: ", err);
     }
};

export type { LoggableError };
