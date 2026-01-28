// file : errorsAPIHandler.util.ts

import { Request, Response } from 'express';
import statusCodes from '../../config/status.config.js';
import CustomError, { type ErrorData } from '../../utils/errors/errorHandler.util.js';
import { logError } from './repositories/logError.repository.js';
import { writeError } from './repositories/writeError.repository.js';
import logger from '../../utils/logger.util.js';

/**
 * واجهة خيارات معالجة الخطأ
 */
interface HandleErrorOptions {
     /** رمز حالة HTTP */
     status?: number;
     /** رسالة الخطأ */
     message?: string;
     /** رمز الخطأ للتصنيف */
     code?: string | null;
     /** بيانات إضافية مرتبطة بالخطأ */
     data?: ErrorData;
     /** هل يتم تسجيل الخطأ */
     log?: boolean;
     /** كائن الاستجابة Express */
     response?: Response;
     /** كائن الطلب Express */
     req?: Request;
     /** stack trace مخصص */
     stack?: string;
}

/**
 * واجهة سياق الخطأ
 */
interface ErrorContext {
     originalError: string;
     url: string;
     method: string;
     ip: string;
     timestamp: string;
}

/**
 * معالج مركزي للأخطاء في التطبيق
 * يتولى تسجيل الأخطاء وإرسال الاستجابات المناسبة
 * @param options - خيارات معالجة الخطأ
 * @returns Promise<void>
 */
const handleError = async (options: HandleErrorOptions): Promise<void> => {
     try {
          const {
               status = statusCodes.INTERNAL_SERVER_ERROR,
               message = 'Internal Server Error',
               code = null,
               data = {},
               log = true,
               response,
               req,
               stack
          } = options;

          const error = new CustomError(status, message, code, data, stack ?? null);
          
          // تسجيل الخطأ إذا كان مطلوباً
          if (log) {
               logError(error, req);
               logger.error({
                    message: error.message,
                    status: error.status,
                    stack: error.stack,
                    url: req ? req.originalUrl : null,
                    method: req ? req.method : null,
                    ip: req ? req.ip : null,
                    data: error.data,
               });
          }
          
          // إرسال الاستجابة إذا كان response متاحاً
          if (response) {
               await writeError(response, status, message, error, req);
          }
     } catch (err) {
          const error = err as Error & { status?: number; data?: ErrorData };
          
          // معالجة محسنة للأخطاء المتداخلة
          const errorContext: ErrorContext = {
               originalError: error.message || 'Unknown error',
               url: options.req ? options.req.originalUrl : 'Unknown URL',
               method: options.req ? options.req.method : 'Unknown Method',
               ip: options.req ? (options.req.ip ?? 'Unknown IP') : 'Unknown IP',
               timestamp: new Date().toISOString()
          };
          
          console.error('! Critical error in handleError function:', errorContext);
          
          // تسجيل الخطأ المتداخل مع معلومات إضافية
          try {
               logger.error({
                    message: `Critical error in handleError: ${error.message}`,
                    status: error.status || statusCodes.INTERNAL_SERVER_ERROR,
                    stack: error.stack,
                    context: errorContext,
                    data: error.data || {},
                    errorType: error?.constructor?.name || 'UnknownError',
                    url: options.req?.originalUrl,
                    method: options.req?.method
               });
          } catch (logErr) {
               const logError = logErr as Error;
               console.error('Failed to log critical error:', logError.message);
          }
          
          // إرسال استجابة طوارئ إذا لم يتم إرسال headers بعد
          if (options.response && !options.response.headersSent) {
               try {
                    options.response.status(statusCodes.INTERNAL_SERVER_ERROR).json({
                         success: false,
                         error: { 
                              message: 'Internal server error occurred',
                              timestamp: new Date().toISOString()
                         }
                    });
               } catch (responseErr) {
                    const respError = responseErr as Error;
                    console.error('Failed to send emergency response:', respError.message);
               }
          }
          
          // إرجاع الخطأ للمعالجة في مستوى أعلى إذا كان خطأ حرج
          if (error.name === 'TypeError' || error.name === 'ReferenceError') {
               throw error;
          }
     }
};

export { handleError };
export type { HandleErrorOptions, ErrorContext };
