import { Request, Response, NextFunction } from 'express';
import passport from '../index.js';
import { AuthenticatedUser, AuthenticatedRequest } from './role.middleware.js';

// Middleware للتحقق من المصادقة وإضافة المستخدم للـ req
export const authenticateUser = (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
): void => {
    console.log('🔐 optional authenticate middleware called for:', req.method, req.originalUrl);
    
    // إذا لم يوجد Authorization header، يعتبر المستخدم guest ويستمر
    if (!req.headers.authorization) {
        console.log('👤 No Authorization header - treating as guest');
        req.user = {
            userID: 'guest',
            isSystemClient: false,
            role: 'guest',
            permissions: {}
        };
        next();
        return;
    }
    
    // إذا وجد token، نحاول التحقق منه
    passport.authenticate(
        'request_auth', 
        { session: false }, 
        (err: Error | null, user: AuthenticatedUser | false) => {
            if (err) {
                console.error('🚫 Authentication error:', err);
                // في حالة الخطأ، نعتبره guest
                req.user = {
                    userID: 'guest',
                    isSystemClient: false,
                    role: 'guest',
                    permissions: {}
                };
                next();
                return;
            }
            
            if (!user) {
                console.log('⚠️ Invalid token - treating as guest');
                req.user = {
                    userID: 'guest',
                    isSystemClient: false,
                    role: 'guest',
                    permissions: {}
                };
                next();
                return;
            }
            
            console.log('✅ Authentication successful');
            req.user = user;
            next();
        }
    )(req, res, next);
};

// للتوافق مع الكود الموجود، نصدر نفس الاسم
export const authenticateJwt = authenticateUser;