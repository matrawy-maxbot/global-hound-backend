import { Response } from 'express';

/**
 * واجهة بيانات الاستجابة
 */
interface ResponseData {
    [key: string]: unknown;
    message?: string;
}

/**
 * إرسال استجابة نجاح
 * @param res - كائن الاستجابة Express
 * @param data - البيانات المراد إرسالها
 * @param message - رسالة النجاح (الافتراضي: 'success')
 * @param status - رمز حالة HTTP (الافتراضي: 200)
 * @returns كائن الاستجابة
 */
const successResponse = (
    res: Response,
    data: ResponseData,
    message: string = 'success',
    status: number = 200
): Response => {
    data.message = message;
    res.status(status).write(JSON.stringify({ ...data }));
    return res.end();
};

export default successResponse;
export type { ResponseData };
