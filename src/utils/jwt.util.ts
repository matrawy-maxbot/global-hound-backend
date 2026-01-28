import { sign, verify, JwtPayload, SignOptions } from 'jsonwebtoken';
import type { StringValue } from "ms";
import { JWT_SECRET } from '../config/security.config.js';

/**
 * نوع الحمولة للـ JWT
 */
type TokenPayload = string | object | Buffer;

/**
 * نوع القيمة المرجعة من التحقق
 */
type VerifyResult = JwtPayload | string | null;

/**
 * إنشاء رمز JWT
 * @param payload - البيانات المراد تخزينها في الرمز
 * @param expiresIn - مدة صلاحية الرمز (الافتراضي: ساعة واحدة)
 * @returns رمز JWT
 */
const generateToken = (payload: TokenPayload, expiresIn: StringValue | number = '1h'): string => {
    const options: SignOptions = { expiresIn };
    return sign(payload, JWT_SECRET, options);
};

/**
 * التحقق من صلاحية رمز JWT
 * @param token - الرمز المراد التحقق منه
 * @returns البيانات المخزنة في الرمز أو null إذا كان غير صالح
 */
const verifyToken = (token: string): VerifyResult => {
    try {
        return verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

export default { generateToken, verifyToken };
export type { TokenPayload, VerifyResult };
