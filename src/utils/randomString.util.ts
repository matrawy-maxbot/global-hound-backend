import { randomBytes } from 'crypto';

/**
 * إنشاء نص عشوائي
 * @param length - طول النص المطلوب (الافتراضي: 32)
 * @returns نص عشوائي بصيغة hex
 */
const generateRandomString = (length: number = 32): string => {
    return randomBytes(length).toString('hex');
};

export default { generateRandomString };
