import jwt, { JwtPayload, SignOptions, Secret } from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../../../config/security.config.js';

export interface TokenPayload {
    userID: string;
    iat?: number;
    exp?: number;
}

export function generateToken(data: Omit<TokenPayload, 'iat' | 'exp'>, refreshToken: boolean = false): string {
    const expiresIn = refreshToken ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
    const options: SignOptions = {
        expiresIn: expiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign(data, JWT_SECRET as Secret, options);
}

export function validateToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        return null;
    }
}
