import { Response, NextFunction } from 'express';
import SubscriptionsService from '../../../../database/postgreSQL/services/subscriptions.service.js';
import { type SubscriptionData, type QueryOptions, SubscriptionStatus, BillingInterval } from '../../../../database/postgreSQL/services/subscriptions.service.js';
import UsersService from '../../../../database/postgreSQL/services/users.service.js';
import stripeSubscriptionsService from '../../../../stripe/services/stripe-subscriptions.service.js';
import stripeCustomerService from '../../../../stripe/services/customer.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { resolveDatabaseResult } from '../../../../../utils/object.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة الاشتراكات - Subscriptions Controller
 * يحتوي على جميع العمليات المتعلقة بإدارة الاشتراكات
 * Contains all operations related to subscriptions management
 */

/**
 * الحصول على جميع الاشتراكات
 * Get all subscriptions
 */
export const getAllSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, offset, order, status, plan_name } = req.query as {
      limit?: string;
      offset?: string;
      order?: string;
      status?: string;
      plan_name?: string;
    };

    const options: QueryOptions = {
      ...(limit && { limit: Math.min(parseInt(limit), 200) }),
      ...(offset && { offset: parseInt(offset) }),
      ...(order && { order: JSON.parse(order) })
    };

    let subscriptions;
    let error;

    if (status) {
      [subscriptions, error] = await SubscriptionsService.getByStatus(status as SubscriptionStatus, options);
    } else if (plan_name) {
      [subscriptions, error] = await SubscriptionsService.getByPlanName(plan_name, options);
    } else {
      [subscriptions, error] = await SubscriptionsService.getAll(options);
    }

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(subscriptions);
    send(res, { success: true, data: result, total: result?.length || 0 }, 'تم جلب الاشتراكات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على اشتراك بواسطة المعرف
 * Get subscription by ID
 */
export const getSubscriptionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [subscription, error] = await SubscriptionsService.getById(id);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!subscription) {
      send(res, { success: false, data: null }, 'الاشتراك غير موجود', 404);
      return;
    }

    const result = resolveDatabaseResult(subscription);
    send(res, { success: true, data: result }, 'تم جلب الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على اشتراكات المستخدم
 * Get subscriptions by user ID - fetches from Stripe and syncs to local DB
 */
export const getSubscriptionsByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const { sync } = req.query as { sync?: string };

    // إذا كان sync=true أو لم يُحدد، جلب من Stripe
    if (sync !== 'false') {
      try {
        // جلب بيانات المستخدم للحصول على الإيميل
        const [user, userError] = await UsersService.getById(userId);
        
        if (user && !userError) {
          // البحث عن العملاء في Stripe باستخدام الإيميل
          const [stripeCustomers] = await stripeCustomerService.findAllByEmail((user as any).email);
          
          if (stripeCustomers && stripeCustomers.length > 0) {
            const allSubscriptions: any[] = [];
            
            // جلب اشتراكات كل عميل
            for (const customer of stripeCustomers) {
              const [customerSubscriptions] = await stripeSubscriptionsService.getCustomerSubscriptions(
                customer.id
              );
              
              if (customerSubscriptions && customerSubscriptions.length > 0) {
                for (const sub of customerSubscriptions) {
                  // ✅ التحقق من قاعدة البيانات المحلية - هل تم إلغاء أو إيقاف الاشتراك محلياً؟
                  let effectiveStatus = sub.status;
                  const [localSubscription] = await SubscriptionsService.getByStripeSubscriptionId(sub.stripeSubscriptionId);
                  if (localSubscription) {
                    const localStatus = (localSubscription as any).status;
                    // إذا كان الاشتراك ملغى أو موقف محلياً، نستخدم الحالة المحلية
                    if (localStatus === 'canceled' || localStatus === 'paused') {
                      console.log(`⚠️ Subscription ${sub.stripeSubscriptionId} is ${localStatus} locally`);
                      effectiveStatus = localStatus;
                    }
                  }
                  
                  // مزامنة مع قاعدة البيانات المحلية (فقط إذا لم يكن ملغى/موقف محلياً)
                  if (effectiveStatus !== 'canceled' && effectiveStatus !== 'paused') {
                    await SubscriptionsService.upsertFromStripe(
                      sub.stripeSubscriptionId,
                      {
                        user_id: userId,
                        stripe_subscription_id: sub.stripeSubscriptionId,
                        stripe_customer_id: customer.id,
                        stripe_price_id: sub.stripePriceId,
                        plan_name: sub.metadata?.plan_name || sub.planName,
                        status: sub.status as any,
                        billing_interval: sub.billingInterval as any,
                        billing_interval_count: sub.billingIntervalCount,
                        amount: sub.amount,
                        currency: sub.currency,
                        current_period_start: sub.currentPeriodStart,
                        current_period_end: sub.currentPeriodEnd,
                        cancel_at_period_end: sub.cancelAtPeriodEnd,
                        canceled_at: sub.canceledAt || null,
                        trial_start: sub.trialStart || null,
                        trial_end: sub.trialEnd || null
                      }
                    );
                  }
                  
                  allSubscriptions.push({
                    id: sub.stripeSubscriptionId,
                    user_id: userId,
                    stripe_subscription_id: sub.stripeSubscriptionId,
                    stripe_customer_id: customer.id,
                    stripe_price_id: sub.stripePriceId,
                    plan_name: sub.metadata?.plan_name || sub.planName,
                    status: effectiveStatus, // استخدام الحالة الفعلية
                    billing_interval: sub.billingInterval,
                    billing_interval_count: sub.billingIntervalCount,
                    amount: sub.amount,
                    currency: sub.currency,
                    current_period_start: sub.currentPeriodStart,
                    current_period_end: sub.currentPeriodEnd,
                    cancel_at_period_end: sub.cancelAtPeriodEnd,
                    canceled_at: sub.canceledAt,
                    trial_start: sub.trialStart,
                    trial_end: sub.trialEnd
                  });
                }
              }
            }
            
            if (allSubscriptions.length > 0) {
              send(res, { success: true, data: allSubscriptions }, 'تم جلب اشتراكات المستخدم من Stripe بنجاح', 200);
              return;
            }
          }
        }
      } catch (stripeError) {
        console.error('Error fetching from Stripe, falling back to local DB:', stripeError);
        // في حالة فشل الاتصال بـ Stripe، نستخدم قاعدة البيانات المحلية
      }
    }

    // Fallback: جلب من قاعدة البيانات المحلية
    const { limit, offset } = req.query as { limit?: string; offset?: string };
    const options: QueryOptions = {
      ...(limit && { limit: Math.min(parseInt(limit), 200) }),
      ...(offset && { offset: parseInt(offset) })
    };

    const [subscriptions, error] = await SubscriptionsService.getByUserId(userId, options);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(subscriptions);
    send(res, { success: true, data: result }, 'تم جلب اشتراكات المستخدم بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على الاشتراك النشط للمستخدم
 * Get active subscription for user
 */
export const getActiveSubscriptionByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const [subscription, error] = await SubscriptionsService.getActiveByUserId(userId);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(subscription);
    send(res, { success: true, data: result }, 'تم جلب الاشتراك النشط بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على الاشتراك النشط للمستخدم الحالي
 * Get active subscription for current user
 */
export const getMyActiveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;

    if (!userId) {
      send(res, { success: false, data: null }, 'المستخدم غير مصادق', 401);
      return;
    }

    const [subscription, error] = await SubscriptionsService.getActiveByUserId(userId);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(subscription);
    send(res, { success: true, data: result }, 'تم جلب الاشتراك النشط بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على الاشتراكات المنتهية قريباً
 * Get expiring subscriptions
 */
export const getExpiringSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days } = req.query as { days?: string };
    const daysNumber = days ? parseInt(days) : 7;

    const [subscriptions, error] = await SubscriptionsService.getExpiringSoon(daysNumber);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(subscriptions);
    send(res, { success: true, data: result }, 'تم جلب الاشتراكات المنتهية قريباً بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إنشاء اشتراك جديد
 * Create new subscription
 */
export const createSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subscriptionData: SubscriptionData = {
      user_id: req.body.user_id,
      // Stripe IDs
      stripe_subscription_id: req.body.stripe_subscription_id,
      stripe_customer_id: req.body.stripe_customer_id,
      stripe_price_id: req.body.stripe_price_id,
      // Plan info
      plan_name: req.body.plan_name,
      status: req.body.status,
      // Billing
      billing_interval: req.body.billing_interval,
      billing_interval_count: req.body.billing_interval_count,
      amount: req.body.amount,
      currency: req.body.currency,
      // Dates
      current_period_start: req.body.current_period_start ? new Date(req.body.current_period_start) : null,
      current_period_end: req.body.current_period_end ? new Date(req.body.current_period_end) : new Date(),
      trial_start: req.body.trial_start ? new Date(req.body.trial_start) : null,
      trial_end: req.body.trial_end ? new Date(req.body.trial_end) : null,
      // Payment
      default_payment_method: req.body.default_payment_method,
      // Metadata
      metadata: req.body.metadata
    };

    const [subscription, error] = await SubscriptionsService.create(subscriptionData);

    if (error) {
      console.log('Error creating subscription:', error);
      res.status(400);
      return next(error);
    }

    if (!subscription) {
      send(res, { success: false, data: null }, 'فشل في إنشاء الاشتراك', 400);
      return;
    }

    const result = resolveDatabaseResult(subscription);
    send(res, { success: true, data: result }, 'تم إنشاء الاشتراك بنجاح', 201);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تحديث اشتراك
 * Update subscription
 */
export const updateSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    const [result, error] = await SubscriptionsService.update(id, updateData);

    if (error) {
      console.log('Error updating subscription:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تحديث الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تفعيل اشتراك
 * Activate subscription
 */
export const activateSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await SubscriptionsService.activate(id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تفعيل الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إلغاء اشتراك
 * Cancel subscription
 */
export const cancelSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await SubscriptionsService.cancel(id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إلغاء الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إيقاف اشتراك مؤقتاً
 * Pause subscription
 */
export const pauseSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await SubscriptionsService.pause(id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إيقاف الاشتراك مؤقتاً', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * استئناف اشتراك موقوف مؤقتاً
 * Resume paused subscription
 */
export const resumeSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await SubscriptionsService.resume(id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إعادة تفعيل الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

// ===================== مسارات المستخدم الحالي (/me) =====================

/**
 * إلغاء اشتراك المستخدم الحالي
 * Cancel current user's subscription
 */
export const cancelMySubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;

    if (!userId) {
      send(res, { success: false, data: null }, 'المستخدم غير مصادق', 401);
      return;
    }

    // جلب الاشتراك النشط للمستخدم
    const [subscription, fetchError] = await SubscriptionsService.getActiveByUserId(userId);

    if (fetchError) {
      res.status(500);
      return next(fetchError);
    }

    if (!subscription) {
      send(res, { success: false, data: null }, 'لا يوجد اشتراك نشط لإلغائه', 404);
      return;
    }

    // إلغاء الاشتراك
    const [result, error] = await SubscriptionsService.cancel(subscription.id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إلغاء الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إيقاف اشتراك المستخدم الحالي مؤقتاً
 * Pause current user's subscription
 */
export const pauseMySubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;

    if (!userId) {
      send(res, { success: false, data: null }, 'المستخدم غير مصادق', 401);
      return;
    }

    // جلب الاشتراك النشط للمستخدم
    const [subscription, fetchError] = await SubscriptionsService.getActiveByUserId(userId);

    if (fetchError) {
      res.status(500);
      return next(fetchError);
    }

    if (!subscription) {
      send(res, { success: false, data: null }, 'لا يوجد اشتراك نشط لإيقافه', 404);
      return;
    }

    // إيقاف الاشتراك مؤقتاً
    const [result, error] = await SubscriptionsService.pause(subscription.id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إيقاف الاشتراك مؤقتاً', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * استئناف اشتراك المستخدم الحالي
 * Resume current user's subscription
 */
export const resumeMySubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;

    if (!userId) {
      send(res, { success: false, data: null }, 'المستخدم غير مصادق', 401);
      return;
    }

    // جلب الاشتراك الموقوف للمستخدم
    const [subscriptions, fetchError] = await SubscriptionsService.getByUserId(userId);

    if (fetchError) {
      res.status(500);
      return next(fetchError);
    }

    // البحث عن اشتراك موقوف
    const pausedSubscription = subscriptions?.find(sub => sub.status === 'paused');

    if (!pausedSubscription) {
      send(res, { success: false, data: null }, 'لا يوجد اشتراك موقوف لاستئنافه', 404);
      return;
    }

    // استئناف الاشتراك
    const [result, error] = await SubscriptionsService.resume(pausedSubscription.id);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم استئناف الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تجديد اشتراك
 * Renew subscription
 */
export const renewSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { period_end } = req.body;

    if (!period_end) {
      send(res, { success: false, data: null }, 'تاريخ انتهاء الفترة مطلوب', 400);
      return;
    }

    const [result, error] = await SubscriptionsService.renew(id, new Date(period_end));

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تجديد الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تغيير خطة الاشتراك
 * Change subscription plan
 */
export const changeSubscriptionPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { plan_name, stripe_price_id, amount } = req.body;

    if (!plan_name || !stripe_price_id || amount === undefined) {
      send(res, { success: false, data: null }, 'اسم الخطة ومعرف السعر والمبلغ مطلوبون', 400);
      return;
    }

    const [result, error] = await SubscriptionsService.changePlan(id, plan_name, stripe_price_id, amount);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تغيير خطة الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * حذف اشتراك
 * Delete subscription
 */
export const deleteSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await SubscriptionsService.delete(id);

    if (error) {
      console.log('Error deleting subscription:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: null }, 'تم حذف الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إحصائيات الاشتراكات
 * Get subscription statistics
 */
export const getSubscriptionStatistics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [statistics, error] = await SubscriptionsService.getStatistics();

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { success: true, data: statistics }, 'تم جلب إحصائيات الاشتراكات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
