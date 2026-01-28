import { Response, NextFunction, Request } from 'express';
import plansService, { FormattedPrice, FormattedProduct } from '../../../../stripe/services/plans.service.js';
import stripeSubscriptionsService from '../../../../stripe/services/stripe-subscriptions.service.js';
import stripeCustomerService from '../../../../stripe/services/customer.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة الخطط والأسعار - Plans Controller
 * يتواصل مع Stripe لجلب الخطط والأسعار
 */

/**
 * الحصول على جميع الأسعار النشطة
 * Get all active prices from Stripe
 */
export const getActivePrices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [prices, error] = await plansService.getActivePrices();

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { 
      success: true, 
      data: prices,
      total: prices?.length || 0 
    }, 'تم جلب الأسعار بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على أسعار الاشتراكات فقط
 * Get subscription prices only
 */
export const getSubscriptionPrices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [prices, error] = await plansService.getSubscriptionPrices();

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { 
      success: true, 
      data: prices,
      total: prices?.length || 0 
    }, 'تم جلب أسعار الاشتراكات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على سعر بواسطة المعرف
 * Get price by ID
 */
export const getPriceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priceId = Array.isArray(req.params.priceId) ? req.params.priceId[0] : req.params.priceId;

    const [price, error] = await plansService.getPriceById(priceId);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!price) {
      send(res, { success: false, data: null }, 'السعر غير موجود', 404);
      return;
    }

    send(res, { success: true, data: price }, 'تم جلب السعر بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على جميع المنتجات مع أسعارها
 * Get all products with their prices
 */
export const getProductsWithPrices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [products, error] = await plansService.getProductsWithPrices();

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { 
      success: true, 
      data: products,
      total: products?.length || 0 
    }, 'تم جلب المنتجات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على منتج بواسطة المعرف
 * Get product by ID
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;

    const [product, error] = await plansService.getProductById(productId);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!product) {
      send(res, { success: false, data: null }, 'المنتج غير موجود', 404);
      return;
    }

    send(res, { success: true, data: product }, 'تم جلب المنتج بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على Stripe Publishable Key
 * Get Stripe publishable key for frontend
 */
export const getPublishableKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publishableKey = plansService.getPublishableKey();

    send(res, { 
      success: true, 
      data: { publishableKey } 
    }, 'تم جلب المفتاح بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إنشاء اشتراك جديد في Stripe
 * Create new subscription in Stripe
 */
export const createStripeSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;
    const userEmail = req.user?.email;

    if (!userId) {
      send(res, { success: false, data: null }, 'المستخدم غير مصادق', 401);
      return;
    }

    const { 
      customerId, 
      priceId, 
      quantity,
      trialPeriodDays,
      paymentBehavior,
      defaultPaymentMethod,
      couponId,
      metadata
    } = req.body;

    if (!priceId) {
      send(res, { success: false, data: null }, 'معرف السعر مطلوب', 400);
      return;
    }

    let stripeCustomerId = customerId;

    // إذا لم يتم توفير customerId، ابحث عنه أو أنشئه
    if (!stripeCustomerId && userEmail) {
      console.log('🔍 Searching for customer by email:', userEmail);
      
      // 1. البحث عن العميل بالإيميل
      const [existingCustomer, searchError] = await stripeCustomerService.findByEmail(userEmail);
      
      if (searchError) {
        console.log('⚠️ Error searching for customer:', searchError.message);
      }
      
      if (existingCustomer) {
        // العميل موجود في Stripe
        stripeCustomerId = existingCustomer.id;
        console.log('✅ Found existing customer in Stripe:', stripeCustomerId);
      } else {
        // 2. إنشاء عميل جديد في Stripe
        console.log('🆕 Creating new customer in Stripe for:', userEmail);
        const [newCustomer, createError] = await stripeCustomerService.createCustomer({
          email: userEmail,
          name: req.user?.username || undefined,
          metadata: {
            userId: String(userId),
            source: 'subscription_creation'
          }
        });

        if (createError || !newCustomer) {
          console.error('❌ Failed to create customer:', createError?.message);
          send(res, { success: false, data: null }, 'فشل في إنشاء حساب العميل في Stripe', 400);
          return;
        }

        stripeCustomerId = newCustomer.id;
        console.log('✅ Created new customer in Stripe:', stripeCustomerId);
      }
    } else if (customerId) {
      // تحقق من وجود العميل في Stripe
      console.log('🔍 Verifying customer exists in Stripe:', customerId);
      const [existingCustomer, getError] = await stripeCustomerService.getCustomer(customerId);
      
      if (getError || !existingCustomer) {
        console.log('⚠️ Customer not found in Stripe, searching by email...');
        
        // محاولة البحث بالإيميل
        if (userEmail) {
          const [customerByEmail, searchError] = await stripeCustomerService.findByEmail(userEmail);
          
          if (customerByEmail) {
            stripeCustomerId = customerByEmail.id;
            console.log('✅ Found customer by email:', stripeCustomerId);
          } else {
            // إنشاء عميل جديد
            console.log('🆕 Creating new customer in Stripe...');
            const [newCustomer, createError] = await stripeCustomerService.createCustomer({
              email: userEmail,
              name: req.user?.username || undefined,
              metadata: {
                userId: String(userId),
                source: 'subscription_creation'
              }
            });

            if (createError || !newCustomer) {
              console.error('❌ Failed to create customer:', createError?.message);
              send(res, { success: false, data: null }, 'فشل في إنشاء حساب العميل في Stripe', 400);
              return;
            }

            stripeCustomerId = newCustomer.id;
            console.log('✅ Created new customer:', stripeCustomerId);
          }
        } else {
          send(res, { success: false, data: null }, 'البريد الإلكتروني مطلوب لإنشاء عميل Stripe', 400);
          return;
        }
      }
    } else {
      send(res, { success: false, data: null }, 'معرف العميل أو البريد الإلكتروني مطلوب', 400);
      return;
    }

    const [subscription, error] = await stripeSubscriptionsService.createSubscription({
      userId,
      customerId: stripeCustomerId,
      priceId,
      quantity,
      trialPeriodDays,
      paymentBehavior,
      defaultPaymentMethod,
      couponId,
      metadata,
    });

    if (error) {
      console.error('Error creating Stripe subscription:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: subscription }, 'تم إنشاء الاشتراك بنجاح', 201);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إلغاء اشتراك في Stripe
 * Cancel subscription in Stripe
 */
export const cancelStripeSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;
    const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;
    const { atPeriodEnd } = req.body;

    if (!subscriptionId) {
      send(res, { success: false, data: null }, 'معرف الاشتراك مطلوب', 400);
      return;
    }

    let subscription, error;

    if (atPeriodEnd) {
      [subscription, error] = await stripeSubscriptionsService.cancelAtPeriodEnd(subscriptionId, userId);
    } else {
      [subscription, error] = await stripeSubscriptionsService.cancelSubscription(subscriptionId, userId);
    }

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: subscription }, 'تم إلغاء الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إعادة تفعيل اشتراك في Stripe
 * Reactivate subscription in Stripe
 */
export const reactivateStripeSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;
    const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

    if (!subscriptionId) {
      send(res, { success: false, data: null }, 'معرف الاشتراك مطلوب', 400);
      return;
    }

    const [subscription, error] = await stripeSubscriptionsService.reactivateSubscription(subscriptionId, userId);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: subscription }, 'تم إعادة تفعيل الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تغيير خطة الاشتراك في Stripe
 * Change subscription plan in Stripe
 */
export const changeStripeSubscriptionPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userID;
    const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;
    const { newPriceId, prorationBehavior } = req.body;

    if (!subscriptionId || !newPriceId) {
      send(res, { success: false, data: null }, 'معرف الاشتراك ومعرف السعر الجديد مطلوبان', 400);
      return;
    }

    const [subscription, error] = await stripeSubscriptionsService.changePlan(
      subscriptionId,
      newPriceId,
      prorationBehavior || 'create_prorations',
      userId
    );

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: subscription }, 'تم تغيير خطة الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * معاينة فاتورة تغيير الخطة
 * Preview proration invoice
 */
export const previewProration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;
    const { newPriceId } = req.body;

    if (!subscriptionId || !newPriceId) {
      send(res, { success: false, data: null }, 'معرف الاشتراك ومعرف السعر الجديد مطلوبان', 400);
      return;
    }

    const [preview, error] = await stripeSubscriptionsService.previewProration(subscriptionId, newPriceId);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: preview }, 'تم جلب معاينة الفاتورة بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على اشتراك من Stripe
 * Get subscription from Stripe
 */
export const getStripeSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

    if (!subscriptionId) {
      send(res, { success: false, data: null }, 'معرف الاشتراك مطلوب', 400);
      return;
    }

    const [subscription, error] = await stripeSubscriptionsService.getSubscription(subscriptionId);

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { success: true, data: subscription }, 'تم جلب الاشتراك بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
