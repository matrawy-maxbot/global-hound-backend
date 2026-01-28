import { Response, NextFunction, RequestHandler } from 'express';
import status from '../../../config/status.config.js';
import { AuthenticatedRequest, AuthenticatedUser } from './role.middleware.js';
import SubscriptionsService from '../../database/postgreSQL/services/subscriptions.service.js';
import { SubscriptionStatus } from '../../database/postgreSQL/models/Subscription.model.js';
import { stripeCustomerService, stripeSubscriptionsService } from '../../stripe/index.js';

type UserRole = 'owner' | 'admin' | 'user' | 'guest';

interface SubscriptionOptions {
    /**
     * هل يتم التحقق من Stripe مباشرة أم من قاعدة البيانات فقط؟
     * @default true
     */
    verifyFromStripe?: boolean;
    
    /**
     * رسالة الخطأ المخصصة
     */
    customMessage?: string;
}

/**
 * Middleware للتحقق من اشتراك المستخدم في خطة معينة
 * 
 * @example
 * // السماح فقط للمستخدمين المشتركين في خطة Pro أو Enterprise
 * router.get('/premium-feature', 
 *   authMiddleware,
 *   checkSubscription(
 *     applyToRoles: ['user'], // فقط المستخدمين يحتاجون اشتراك
 *     plans: ['Pro', 'Enterprise']
 *   ),
 *   controller
 * );
 * 
 * @example
 * // جميع الأدوار تحتاج اشتراك
 * router.get('/exclusive-feature',
 *   authMiddleware,
 *   checkSubscription(
 *     applyToRoles: ['user', 'admin'], // حتى الأدمن يحتاج اشتراك، المالك فقط معفى
 *     plans: ['Enterprise']
 *   ),
 *   controller
 * );
 */
export const checkSubscription = (applyToRoles: UserRole[] = ['user'], plans: string[], options: SubscriptionOptions = {verifyFromStripe: true}): RequestHandler => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user;
            
            if (!user) {
                res.status(status.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    error: 'NOT_AUTHENTICATED'
                });
                return;
            }


            options.verifyFromStripe = options.verifyFromStripe ?? true;

            const userRole = user.role || 'guest';

            // المالك دائماً معفى من شروط الاشتراك
            if (userRole === 'owner') {
                next();
                return;
            }

            // التحقق إذا كان الدور الحالي يحتاج التحقق من الاشتراك
            if (!applyToRoles.includes(userRole)) {
                // الدور غير مشمول في قائمة الأدوار المطلوب منها اشتراك، السماح بالمرور
                next();
                return;
            }

            // جلب الاشتراكات النشطة
            let hasValidSubscription = false;

            if (options.verifyFromStripe) {
                // التحقق من Stripe مباشرة
                hasValidSubscription = await verifySubscriptionFromStripe(user, plans);
            } else {
                // التحقق من قاعدة البيانات المحلية
                hasValidSubscription = await verifySubscriptionFromDatabase(user.userID, plans);
            }

            if (!hasValidSubscription) {
                const message = options.customMessage || 
                    `Access denied. Required subscription plan: ${plans.join(' or ')}`;
                
                res.status(status.FORBIDDEN).json({
                    success: false,
                    message,
                    error: 'SUBSCRIPTION_REQUIRED',
                    requiredPlans: plans
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Subscription middleware error:', error);
            res.status(status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error verifying subscription',
                error: 'SUBSCRIPTION_CHECK_FAILED'
            });
        }
    };
};

/**
 * التحقق من الاشتراك من قاعدة البيانات المحلية
 */
async function verifySubscriptionFromDatabase(userId: string, allowedPlans: string[]): Promise<boolean> {
    try {
        const [subscriptions, error] = await SubscriptionsService.getByUserId(userId);

        if (error || !subscriptions || subscriptions.length === 0) {
            return false;
        }

        // التحقق من أن أحد الاشتراكات النشطة في الخطط المسموح بها
        return subscriptions.some(sub => 
            (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) && 
            allowedPlans.some(plan => 
                sub.plan_name?.toLowerCase() === plan.toLowerCase()
            )
        );
    } catch (error) {
        console.error('Error verifying subscription from database:', error);
        return false;
    }
}

/**
 * التحقق من الاشتراك من Stripe مباشرة
 * مع التحقق من قاعدة البيانات المحلية للتأكد من أن الاشتراك لم يتم إلغاؤه أو إيقافه محلياً
 */
async function verifySubscriptionFromStripe(user: AuthenticatedUser, allowedPlans: string[]): Promise<boolean> {
    try {
        if (!user.email) {
            return false;
        }

        // البحث عن جميع العملاء بنفس الإيميل
        const [customers, customersError] = await stripeCustomerService.findAllByEmail(user.email);
        
        if (customersError || !customers || customers.length === 0) {
            return false;
        }

        // البحث في اشتراكات جميع العملاء
        for (const customer of customers) {
            const [subscriptions, error] = await stripeSubscriptionsService.getCustomerSubscriptions(customer.id, 'active');
            
            if (error || !subscriptions || subscriptions.length === 0) {
                continue;
            }

            for (const subscription of subscriptions) {
                // التحقق من حالة الاشتراك في Stripe
                if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIALING) {
                    continue;
                }

                // ✅ التحقق من قاعدة البيانات المحلية - هل تم إلغاء أو إيقاف الاشتراك محلياً؟
                const [localSubscription] = await SubscriptionsService.getByStripeSubscriptionId(subscription.stripeSubscriptionId);
                if (localSubscription) {
                    const localStatus = (localSubscription as any).status;
                    // إذا كان الاشتراك ملغى أو موقف محلياً، نتجاهله
                    if (localStatus === SubscriptionStatus.CANCELED || localStatus === SubscriptionStatus.PAUSED) {
                        console.log(`⚠️ Subscription ${subscription.stripeSubscriptionId} is ${localStatus} locally, skipping...`);
                        continue;
                    }
                }

                const planName = subscription.metadata?.plan_name || subscription.planName || '';

                // التحقق إذا كانت الخطة ضمن المسموح بها
                if (planName && allowedPlans.some(plan => 
                    planName.toLowerCase().includes(plan.toLowerCase())
                )) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Error verifying subscription from Stripe:', error);
        return false;
    }
}

/**
 * Middleware مختصر للتحقق من وجود أي اشتراك نشط
 */
export const requireActiveSubscription = (applyToRoles: UserRole[] = ['user']): RequestHandler => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user;
            
            if (!user) {
                res.status(status.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    error: 'NOT_AUTHENTICATED'
                });
                return;
            }

            const userRole = user.role || 'guest';

            // المالك دائماً معفى
            if (userRole === 'owner') {
                next();
                return;
            }

            // التحقق إذا كان الدور يحتاج التحقق
            if (!applyToRoles.includes(userRole)) {
                next();
                return;
            }

            // التحقق من وجود أي اشتراك نشط
            const [subscriptions, error] = await SubscriptionsService.getByUserId(user.userID);

            if (error || !subscriptions || subscriptions.length === 0) {
                res.status(status.FORBIDDEN).json({
                    success: false,
                    message: 'Active subscription required',
                    error: 'SUBSCRIPTION_REQUIRED'
                });
                return;
            }

            // التحقق من وجود اشتراك نشط على الأقل
            const hasActive = subscriptions.some(sub => 
                sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING
            );

            if (!hasActive) {
                res.status(status.FORBIDDEN).json({
                    success: false,
                    message: 'Active subscription required',
                    error: 'SUBSCRIPTION_REQUIRED'
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Subscription middleware error:', error);
            res.status(status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error verifying subscription',
                error: 'SUBSCRIPTION_CHECK_FAILED'
            });
        }
    };
};
