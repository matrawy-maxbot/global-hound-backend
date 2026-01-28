// file : errorHandler.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { NODE_ENV } from '../../config/server.config.js';
import { handleError } from '../../utils/errors/errorsAPIHandler.util.js';
import status from '../../config/status.config.js';

interface CustomError extends Error {
    status?: number;
}

const errorHandlerMiddleware = async (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {

    // console.error('Error in errorHandlerMiddleware:', err, req, res, next);

    // التحقق من إرسال headers مسبقاً لتجنب خطأ "Cannot set headers after they are sent"
    if (res.headersSent) {
        return next(err);
    }
    
    // تحديد رمز الحالة المناسب بناءً على الخطأ أو حالة الاستجابة
    const statusCode = err.status || (res.statusCode >= status.BAD_REQUEST ? res.statusCode : status.INTERNAL_SERVER_ERROR);
    
    // إخفاء تفاصيل الخطأ في بيئة الإنتاج لأغراض الأمان
    const message = NODE_ENV === 'production' ? 'Something went wrong' : err.message;
    const stack = NODE_ENV === 'production' ? undefined : err.stack;
    
    // استدعاء معالج الأخطاء المركزي
    await handleError({ status: statusCode, message, response: res, req, stack });
};
  
export default errorHandlerMiddleware;
