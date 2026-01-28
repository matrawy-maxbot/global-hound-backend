import express, { Request, Response, NextFunction, Router } from 'express';
import { authRateLimiter } from '../../../middlewares/security/rateLimiter.middleware.js';
import status from '../../../config/status.config.js';
import { generateToken, validateToken, TokenPayload } from '../services/auth.service.js';
import { TokensService, TokenType, UsersService, AuthProvider, ProjectAdminsService, SubscriptionsService, SubscriptionStatus } from '../../database/postgreSQL/services/index.js';
import { stripeCustomerService, stripeSubscriptionsService } from '../../stripe/index.js';
import { JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../../../config/security.config.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../../../config/integratedAuth.config.js';
import { hashPassword, comparePassword } from '../../../utils/hash.util.js';
import { OAuth2Client, LoginTicket } from 'google-auth-library';
import { ownerIDs } from '../../../config/owners.config.js';
import ms from 'ms';

// ===================== Google OAuth2 Client =====================

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ===================== Interfaces =====================

interface RegisterRequestBody {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
}

interface LoginWithEmailRequestBody {
    email: string;
    password: string;
}

interface GoogleAuthRequestBody {
    credential: string; // id_token من Google
}

interface RefreshTokenRequestBody {
    refreshToken: string;
}

interface ValidateTokenQuery {
    token?: string;
}

const router: Router = express.Router();

// ===================== تسجيل مستخدم جديد (إيميل + كلمة مرور) =====================

router.post('/register', /* authRateLimiter, */ async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<void> => {
    try {
        const { email, password, first_name, last_name, display_name } = req.body;

        // التحقق من البيانات المطلوبة
        if (!email || !password) {
            res.status(status.BAD_REQUEST).json({
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
            return;
        }

        // التحقق من طول كلمة المرور
        if (password.length < 6) {
            res.status(status.BAD_REQUEST).json({
                error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
            return;
        }

        // تشفير كلمة المرور
        const password_hash = await hashPassword(password);

        // تسجيل المستخدم
        const [user, error] = await UsersService.registerLocal({
            email,
            password_hash,
            first_name,
            last_name,
            display_name
        });

        if (error) {
            res.status(status.BAD_REQUEST).json({
                error: error.message
            });
            return;
        }

        // توليد التوكنات
        const token = generateToken({ userID: user!.id! }, false);
        const refreshToken = generateToken({ userID: user!.id! }, true);

        // حفظ التوكنات في قاعدة البيانات
        await TokensService.create({
            token,
            type: TokenType.ACCESS,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + ms(JWT_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        await TokensService.create({
            token: refreshToken,
            type: TokenType.REFRESH,
            expires_at: new Date(Date.now() + ms(JWT_REFRESH_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        res.status(status.CREATED).json({
            message: 'تم التسجيل بنجاح',
            user,
            token,
            refreshToken
        });
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({
            error: (error as Error).message
        });
    }
});

// ===================== تسجيل الدخول (إيميل + كلمة مرور) =====================

router.post('/login/email', /* authRateLimiter, */ async (req: Request<{}, {}, LoginWithEmailRequestBody>, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(status.BAD_REQUEST).json({
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
            return;
        }

        // البحث عن المستخدم
        const [user, error] = await UsersService.getByEmail(email, true);

        if (error || !user) {
            res.status(status.UNAUTHORIZED).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
            return;
        }

        // التحقق من أن المستخدم مسجل محلياً
        if (user.auth_provider !== AuthProvider.LOCAL) {
            res.status(status.UNAUTHORIZED).json({
                error: 'هذا الحساب مسجل عبر Google، يرجى استخدام تسجيل الدخول عبر Google'
            });
            return;
        }

        // التحقق من كلمة المرور
        const isPasswordValid = await comparePassword(password, user.password_hash!);

        if (!isPasswordValid) {
            res.status(status.UNAUTHORIZED).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
            return;
        }

        // توليد التوكنات
        const token = generateToken({ userID: user.id! }, false);
        const refreshToken = generateToken({ userID: user.id! }, true);

        // حفظ التوكنات
        await TokensService.create({
            token,
            type: TokenType.ACCESS,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + ms(JWT_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        await TokensService.create({
            token: refreshToken,
            type: TokenType.REFRESH,
            expires_at: new Date(Date.now() + ms(JWT_REFRESH_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        // إزالة كلمة المرور من الرد
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            user: userWithoutPassword,
            token,
            refreshToken
        });
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({
            error: (error as Error).message
        });
    }
});

// ===================== تسجيل الدخول عبر Google OAuth2 =====================

router.post('/google', /* authRateLimiter, */ async (req: Request<{}, {}, GoogleAuthRequestBody>, res: Response): Promise<void> => {
    try {
        const { credential } = req.body;

        if (!credential) {
            res.status(status.BAD_REQUEST).json({
                error: 'التوكن من Google مطلوب'
            });
            return;
        }

        // التحقق من GOOGLE_CLIENT_ID
        if (!GOOGLE_CLIENT_ID) {
            res.status(status.INTERNAL_SERVER_ERROR).json({
                error: 'خطأ في إعدادات الخادم: GOOGLE_CLIENT_ID غير موجود'
            });
            return;
        }

        // التحقق من صحة التوكن مع Google
        let ticket: LoginTicket;
        try {
            ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID
            });
        } catch (verifyError) {
            res.status(status.UNAUTHORIZED).json({
                error: 'توكن Google غير صالح أو منتهي الصلاحية'
            });
            return;
        }

        const payload = ticket.getPayload();
        if (!payload) {
            res.status(status.UNAUTHORIZED).json({
                error: 'فشل في استخراج بيانات المستخدم من التوكن'
            });
            return;
        }

        // استخراج بيانات المستخدم من التوكن المُتحقق منه
        const { email, sub: google_id, given_name: first_name, family_name: last_name, name: display_name, picture: avatar_url } = payload;

        if (!email || !google_id) {
            res.status(status.UNAUTHORIZED).json({
                error: 'بيانات المستخدم غير مكتملة في التوكن'
            });
            return;
        }

        // تسجيل أو تسجيل الدخول عبر Google
        const [result, error] = await UsersService.registerOrLoginGoogle({
            email,
            google_id,
            first_name,
            last_name,
            display_name,
            avatar_url
        });

        if (error || !result) {
            res.status(status.BAD_REQUEST).json({
                error: error?.message || 'فشل في التسجيل عبر Google'
            });
            return;
        }

        const { user, isNewUser } = result;
        console.log('Google auth - User object:', user);
        console.log('Google auth - User ID:', user.id);
        console.log('Google auth - Is new user:', isNewUser);

        // توليد التوكنات
        const token = generateToken({ userID: user.id! }, false);
        const refreshToken = generateToken({ userID: user.id! }, true);
        console.log('Generated token for userID:', user.id);

        // حفظ التوكنات
        await TokensService.create({
            token,
            type: TokenType.ACCESS,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + ms(JWT_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        await TokensService.create({
            token: refreshToken,
            type: TokenType.REFRESH,
            expires_at: new Date(Date.now() + ms(JWT_REFRESH_EXPIRES_IN as ms.StringValue)),
            used: false
        });

        res.status(isNewUser ? status.CREATED : status.OK).json({
            message: isNewUser ? 'تم التسجيل بنجاح عبر Google' : 'تم تسجيل الدخول بنجاح عبر Google',
            user,
            token,
            refreshToken,
            isNewUser
        });
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({
            error: (error as Error).message
        });
    }
});

// ===================== تحديث التوكن =====================

router.post('/refresh-token', /* authRateLimiter, */ async (req: Request<{}, {}, RefreshTokenRequestBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(status.BAD_REQUEST).json({
                error: 'Refresh token is required'
            });
            return;
        }

        const [tokenResult, tokenError] = await TokensService.getByToken(refreshToken);
        if (tokenError) {
            res.status(status.INTERNAL_SERVER_ERROR).json({
                error: (tokenError as Error).message
            });
            return;
        }
        if (!tokenResult || tokenResult.type !== TokenType.REFRESH) {
            res.status(status.UNAUTHORIZED).json({
                error: 'Invalid refresh token'
            });
            return;
        }

        const decoded = validateToken(refreshToken);
        if (!decoded) {
            res.status(status.UNAUTHORIZED).json({
                error: 'Invalid refresh token'
            });
            return;
        }

        const newToken = generateToken({ userID: decoded.userID }, false);

        const [newTokenResult, newTokenError] = await TokensService.create({
            token: newToken,
            type: TokenType.ACCESS,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + ms(JWT_EXPIRES_IN as ms.StringValue)),
            used: false
        });
        
        if (newTokenError) {
            res.status(status.INTERNAL_SERVER_ERROR).json({
                error: (newTokenError as Error).message
            });
            return;
        }

        res.json({
            message: 'Refresh token successful',
            token: newToken
        });

    } catch (error) {
        res.status(status.UNAUTHORIZED).json({
            error: (error as Error).message
        });
    }
});

// ===================== التحقق من التوكن =====================

router.get('/validate', /* authRateLimiter, */ async (req: Request<{}, {}, {}, ValidateTokenQuery>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;
        
        if (!token) {
            res.status(status.BAD_REQUEST).json({
                error: 'Token is required'
            });
            return;
        }

        const decoded = validateToken(token);
        if (!decoded) {
            res.status(status.UNAUTHORIZED).json({
                error: 'Invalid token'
            });
            return;
        }

        // تحديد الدور والصلاحيات
        let role: 'owner' | 'admin' | 'user' = 'user';
        let permissions: string[] = [];

        // التحقق إذا كان owner
        if (ownerIDs.includes(decoded.userID)) {
            role = 'owner';
        } else {
            // التحقق إذا كان admin
            const [adminData] = await ProjectAdminsService.getByUserId(decoded.userID);
            if (adminData) {
                role = 'admin';
                permissions = (adminData as any).permissions || [];
            }
        }

        // جلب معلومات الاشتراكات من Stripe Server (البورت 4242)
        let subscriptions: Array<{
            hasActiveSubscription: boolean;
            planName: string | null;
            status: string | null;
            currentPeriodEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            billingInterval: string | null;
            amount: number | null;
            currency: string | null;
            stripeSubscriptionId: string | null;
        }> = [];

        try {
            // أولاً: جلب بيانات المستخدم للحصول على الإيميل
            const [user] = await UsersService.getById(decoded.userID);
            
            if (user) {
                // ثانياً: البحث عن جميع العملاء في Stripe باستخدام الإيميل
                // (قد يكون هناك أكثر من عميل بنفس الإيميل)
                const [stripeCustomers] = await stripeCustomerService.findAllByEmail((user as any).email);

                console.log('Stripe Customers found:', stripeCustomers?.length || 0, stripeCustomers);
                
                if (stripeCustomers && stripeCustomers.length > 0) {
                    // ثالثاً: البحث في اشتراكات كل عميل
                    for (const customer of stripeCustomers) {
                        const [customerSubscriptions] = await stripeSubscriptionsService.getCustomerSubscriptions(
                            customer.id
                        );

                        console.log(`Customer ${customer.id} subscriptions:`, customerSubscriptions?.length || 0, customerSubscriptions);
                        
                        if (customerSubscriptions && customerSubscriptions.length > 0) {
                            // البحث عن جميع الاشتراكات النشطة أو في فترة تجريبية
                            // والتحقق من أن user_id في metadata يطابق المستخدم الحالي
                            const activeSubscriptions = customerSubscriptions.filter(
                                sub => (sub.status === 'active' || sub.status === 'trialing') &&
                                       (sub.metadata?.user_id === decoded.userID || !sub.metadata?.user_id)
                            );
                            
                            for (const activeSub of activeSubscriptions) {
                                console.log('Active subscription found:', activeSub.stripeSubscriptionId);
                                
                                // ✅ التحقق من قاعدة البيانات المحلية - هل تم إلغاء أو إيقاف الاشتراك محلياً؟
                                const [localSubscription] = await SubscriptionsService.getByStripeSubscriptionId(activeSub.stripeSubscriptionId);
                                if (localSubscription) {
                                    const localStatus = (localSubscription as any).status;
                                    // إذا كان الاشتراك ملغى أو موقف محلياً، نعتبره غير نشط
                                    if (localStatus === 'canceled' || localStatus === 'paused') {
                                        console.log(`⚠️ Subscription ${activeSub.stripeSubscriptionId} is ${localStatus} locally, marking as inactive...`);
                                        subscriptions.push({
                                            hasActiveSubscription: false,
                                            planName: activeSub.metadata?.plan_name || activeSub.planName,
                                            status: localStatus, // استخدام الحالة المحلية
                                            currentPeriodEnd: activeSub.currentPeriodEnd,
                                            cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
                                            billingInterval: activeSub.billingInterval,
                                            amount: activeSub.amount,
                                            currency: activeSub.currency,
                                            stripeSubscriptionId: activeSub.stripeSubscriptionId
                                        });
                                        continue; // تجاوز هذا الاشتراك والانتقال للتالي
                                    }
                                }
                                
                                // إضافة الاشتراك للمصفوفة
                                subscriptions.push({
                                    hasActiveSubscription: true,
                                    planName: activeSub.metadata?.plan_name || activeSub.planName,
                                    status: activeSub.status,
                                    currentPeriodEnd: activeSub.currentPeriodEnd,
                                    cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
                                    billingInterval: activeSub.billingInterval,
                                    amount: activeSub.amount,
                                    currency: activeSub.currency,
                                    stripeSubscriptionId: activeSub.stripeSubscriptionId
                                });
                                
                                // مزامنة مع قاعدة البيانات المحلية
                                await SubscriptionsService.upsertFromStripe(
                                    activeSub.stripeSubscriptionId,
                                    {
                                        user_id: decoded.userID,
                                        stripe_subscription_id: activeSub.stripeSubscriptionId,
                                        stripe_customer_id: customer.id,
                                        stripe_price_id: activeSub.stripePriceId,
                                        plan_name: activeSub.metadata?.plan_name || activeSub.planName,
                                        status: activeSub.status as any,
                                        billing_interval: activeSub.billingInterval as any,
                                        billing_interval_count: activeSub.billingIntervalCount,
                                        amount: activeSub.amount,
                                        currency: activeSub.currency,
                                        current_period_start: activeSub.currentPeriodStart,
                                        current_period_end: activeSub.currentPeriodEnd,
                                        cancel_at_period_end: activeSub.cancelAtPeriodEnd,
                                        canceled_at: activeSub.canceledAt || null,
                                        trial_start: activeSub.trialStart || null,
                                        trial_end: activeSub.trialEnd || null
                                    }
                                );
                            }
                        }
                    }
                    
                    // إذا لم نجد أي اشتراك نشط، نحدث قاعدة البيانات المحلية
                    if (subscriptions.length === 0) {
                        const [localSubscription] = await SubscriptionsService.getActiveByUserId(decoded.userID);
                        if (localSubscription) {
                            await SubscriptionsService.update((localSubscription as any).id, {
                                status: SubscriptionStatus.CANCELED
                            });
                        }
                    }
                }
            }
        } catch (stripeError) {
            console.error('Error fetching subscription from Stripe:', stripeError);
            // في حالة فشل الاتصال بـ Stripe، نستخدم قاعدة البيانات المحلية كـ fallback
            const [localSubscription] = await SubscriptionsService.getActiveByUserId(decoded.userID);
            if (localSubscription) {
                subscriptions.push({
                    hasActiveSubscription: true,
                    planName: (localSubscription as any).metadata?.plan_name || (localSubscription as any).plan_name,
                    status: (localSubscription as any).status,
                    currentPeriodEnd: (localSubscription as any).current_period_end,
                    cancelAtPeriodEnd: (localSubscription as any).cancel_at_period_end,
                    billingInterval: (localSubscription as any).billing_interval,
                    amount: (localSubscription as any).amount,
                    currency: (localSubscription as any).currency,
                    stripeSubscriptionId: (localSubscription as any).stripe_subscription_id
                });
            }
        }

        res.json({
            message: 'Token is valid',
            userID: decoded.userID,
            role,
            permissions,
            subscriptions,
            createdAt: decoded.iat,
            expiresIn: decoded.exp,
            expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
        });
    } catch (error) {
        res.status(status.UNAUTHORIZED).json({
            error: (error as Error).message
        });
    }
});

// ===================== الحصول على بيانات المستخدم الحالي =====================

router.get('/me', /* authRateLimiter, */ async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth Header:', authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(status.UNAUTHORIZED).json({
                error: 'التوكن مطلوب'
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = validateToken(token);
        console.log('Decoded token:', decoded);

        if (!decoded) {
            res.status(status.UNAUTHORIZED).json({
                error: 'توكن غير صالح'
            });
            return;
        }

        console.log('Fetching user with ID:', decoded.userID);
        const [user, error] = await UsersService.getById(decoded.userID);
        console.log('User result:', user);
        console.log('User error:', error);

        if (error || !user) {
            res.status(status.NOT_FOUND).json({
                error: 'المستخدم غير موجود'
            });
            return;
        }

        res.json({
            user
        });
    } catch (error) {
        console.error('Error in /me:', error);
        res.status(status.INTERNAL_SERVER_ERROR).json({
            error: (error as Error).message
        });
    }
});

export default router;
