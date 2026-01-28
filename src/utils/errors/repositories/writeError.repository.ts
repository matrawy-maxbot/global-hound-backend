// file : writeError.repository.ts

import { Request, Response } from 'express';
import { NODE_ENV } from '../../../config/server.config.js';
import type CustomError from '../errorHandler.util.js';

/**
 * واجهة جسم رسالة الخطأ
 */
interface ErrorMessageBody {
     success: boolean;
     error: {
          message: string;
          stack?: string | null;
          url?: string;
          method?: string;
     };
}

/**
 * كتابة استجابة الخطأ إلى العميل
 * تتولى إرسال استجابة JSON منسقة مع معلومات الخطأ المناسبة
 * @param response - كائن الاستجابة Express
 * @param status - رمز حالة HTTP
 * @param message - رسالة الخطأ
 * @param error - كائن الخطأ
 * @param req - كائن الطلب Express
 * @returns Promise<void>
 */
export const writeError = (
     response: Response,
     status: number,
     message: string,
     error: CustomError | Error,
     req?: Request
): Promise<void> => {
     return new Promise((resolve, reject) => {
          try {
               // التحقق من إرسال headers مسبقاً لتجنب الأخطاء
               if (response.headersSent) {
                    console.warn('Headers already sent, cannot send error response');
                    return resolve();
               }

               const messageBody: ErrorMessageBody = {
                    success: false,
                    error: { 
                         message, 
                         stack: NODE_ENV === 'development' ? error.stack : null,
                         ...(NODE_ENV === 'development' && req && {
                              url: req.originalUrl,
                              method: req.method
                         })
                    }
               };

               // استخدام json() بدلاً من write() لإرسال استجابة JSON صحيحة
               response.status(status).json(messageBody);
               resolve();
          } catch (err) {
               console.error("Error in writeError function: ", err);
               reject(err);
          }
     });
};

export type { ErrorMessageBody };
