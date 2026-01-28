import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { Request } from 'express';
import { validateToken } from './services/auth.service.js';
import { TokensService, ProjectAdminsService, UsersService } from '../database/postgreSQL/services/index.js';
import { API_BOT_AUTHORIZATION } from '../../config/security.config.js';
import { ownerIDs } from '../../config/owners.config.js';

export const baseAPI_URL = '/api/v1';

export interface AuthenticatedUser {
    userID: string;
    email?: string;
    username?: string;
    isSystemClient: boolean;
    role: 'owner' | 'admin' | 'user' | 'guest';
    permissions: Record<string, boolean> | string[];
}

// استراتيجية المصادقة المخصصة
passport.use('request_auth', new CustomStrategy(async (req: Request, done) => {
    try {
        console.log('🔍 Auth Strategy called');
        console.log('🔍🔍🔍🔍🔍 Owner IDs:', ownerIDs);
        
        // استخراج التوكن من الهيدر
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No valid Authorization header found');
            return done(null, false);
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('🔑 Token received:', token.substring(0, 20) + '...');
        
        // التحقق من توكن الـ API الداخلي
        if (token === API_BOT_AUTHORIZATION) {
            return done(null, {
                userID: 'system',
                isSystemClient: true,
                role: 'owner',
                permissions: {
                    administrator: true,
                }
            } as AuthenticatedUser);
        }
        
        // التحقق من التوكن
        const decoded = validateToken(token);
        if (!decoded) {
            console.log('❌ Invalid token');
            return done(null, false);
        }

        // التحقق من وجود التوكن في قاعدة البيانات
        const [tokenResult, tokenError] = await TokensService.getByToken(token);
        if (tokenError) {
            console.log('❌ Error fetching token:', tokenError);
            return done(null, false);
        }
        if (!tokenResult || (tokenResult as any)?.type !== 'access' || !tokenResult) {
            console.log('❌ Token not found or not an access token');
            return done(null, false);
        }

        // التحقق من نوع المستخدم (owner, admin, user)
        const userID = decoded.userID;

        if(!userID) {
            console.log('❌ No userID in token payload');
            return done(null, false);
        }

        // جلب بيانات المستخدم من قاعدة البيانات
        let userEmail: string | undefined;
        let userName: string | undefined;
        
        try {
            const [userData, userError] = await UsersService.getById(userID);
            if (!userError && userData) {
                userEmail = (userData as any).email;
                userName = (userData as any).display_name || (userData as any).username;
            }
        } catch (e) {
            console.log('⚠️ Could not fetch user data:', e);
        }
        
        // التحقق إذا كان owner
        if (ownerIDs.includes(userID)) {
            return done(null, {
                userID: userID,
                email: userEmail,
                username: userName,
                isSystemClient: false,
                role: 'owner',
                permissions: {}
            } as AuthenticatedUser);
        }

        // التحقق إذا كان admin
        const [adminData, adminError] = await ProjectAdminsService.getByUserId(userID);
        if (adminError) {
            console.log('❌ Error fetching admin:', adminError);
        }

        if (adminData) {
            return done(null, {
                userID: userID,
                email: userEmail,
                username: userName,
                isSystemClient: false,
                role: 'admin',
                permissions: (adminData as any).permissions || []
            } as AuthenticatedUser);
        }

        // إرجاع بيانات المستخدم العادي
        return done(null, {
            userID: userID,
            email: userEmail,
            username: userName,
            isSystemClient: false,
            role: 'user',
            permissions: {}
        } as AuthenticatedUser);
        
    } catch (error) {
        console.error('🚫 Auth Strategy error:', (error as Error).message);
        return done(error as Error, false);
    }
}));

export default passport;
