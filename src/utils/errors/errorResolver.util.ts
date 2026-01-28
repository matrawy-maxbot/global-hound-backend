// file : errorResolver.util.ts

/**
 * دالة لتعديل رسالة الخطأ بإضافة رسالة مخصصة
 * @param error - كائن الخطأ
 * @param message - الرسالة المراد إضافتها
 * @returns الخطأ المعدل
 */
export function resolveError<T extends Error>(error: T, message: string = 'An error occurred'): T {
    if (error instanceof Error && error.message) {
        error.message = message + ': ' + error.message;
    }
    return error;
}
