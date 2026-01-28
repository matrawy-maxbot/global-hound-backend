import { genSalt, hash as _hash, compare } from 'bcryptjs';

/**
 * تشفير كلمة المرور
 * @param password - كلمة المرور المراد تشفيرها
 * @param saltNumber - عدد جولات التشفير (الافتراضي: 10)
 * @returns كلمة المرور المشفرة
 */
const hashPassword = async (password: string, saltNumber: number = 10): Promise<string> => {
    const salt = await genSalt(saltNumber);
    return await _hash(password, salt);
};

/**
 * مقارنة كلمة المرور مع النسخة المشفرة
 * @param password - كلمة المرور الأصلية
 * @param hash - كلمة المرور المشفرة
 * @returns هل تتطابق كلمتا المرور
 */
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await compare(password, hash);
};

export { hashPassword, comparePassword };
