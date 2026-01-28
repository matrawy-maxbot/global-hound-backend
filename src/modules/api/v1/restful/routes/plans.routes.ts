import express, { Router } from 'express';
import * as plansController from '../controllers/plans.controller.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';

/**
 * مسارات إدارة الخطط والأسعار - متكاملة مع Stripe
 * @module PlansRoutes
 */

const router: Router = express.Router();

// ================== المسارات العامة (Public Routes) ==================

/**
 * @route GET /api/v1/plans/config
 * @desc الحصول على Stripe Publishable Key
 * @access Public
 */
router.get('/config', plansController.getPublishableKey);

/**
 * @route GET /api/v1/plans/prices
 * @desc الحصول على جميع الأسعار النشطة من Stripe
 * @access Public
 */
router.get('/prices', plansController.getActivePrices);

/**
 * @route GET /api/v1/plans/subscription-prices
 * @desc الحصول على أسعار الاشتراكات فقط
 * @access Public
 */
router.get('/subscription-prices', plansController.getSubscriptionPrices);

/**
 * @route GET /api/v1/plans/products
 * @desc الحصول على جميع المنتجات مع أسعارها
 * @access Public
 */
router.get('/products', plansController.getProductsWithPrices);

/**
 * @route GET /api/v1/plans/prices/:priceId
 * @desc الحصول على سعر بواسطة المعرف
 * @access Public
 * @param {string} priceId - معرف السعر في Stripe
 */
router.get('/prices/:priceId', plansController.getPriceById);

/**
 * @route GET /api/v1/plans/products/:productId
 * @desc الحصول على منتج بواسطة المعرف
 * @access Public
 * @param {string} productId - معرف المنتج في Stripe
 */
router.get('/products/:productId', plansController.getProductById);

// ================== مسارات الاشتراكات (Subscription Routes) ==================

/**
 * @route POST /api/v1/plans/subscriptions
 * @desc إنشاء اشتراك جديد في Stripe
 * @access Private - authenticated users
 * @body {string} customerId - معرف العميل في Stripe
 * @body {string} priceId - معرف السعر في Stripe
 * @body {number} [quantity] - الكمية
 * @body {number} [trialPeriodDays] - أيام الفترة التجريبية
 * @body {string} [paymentBehavior] - سلوك الدفع
 * @body {string} [defaultPaymentMethod] - طريقة الدفع الافتراضية
 * @body {string} [couponId] - معرف الكوبون
 */
router.post(
  '/subscriptions',
  checkRole(['owner', 'admin', 'user']),
  plansController.createStripeSubscription
);

/**
 * @route GET /api/v1/plans/subscriptions/:subscriptionId
 * @desc الحصول على اشتراك من Stripe
 * @access Private - authenticated users
 * @param {string} subscriptionId - معرف الاشتراك في Stripe
 */
router.get(
  '/subscriptions/:subscriptionId',
  checkRole(['owner', 'admin', 'user']),
  plansController.getStripeSubscription
);

/**
 * @route POST /api/v1/plans/subscriptions/:subscriptionId/cancel
 * @desc إلغاء اشتراك في Stripe
 * @access Private - authenticated users
 * @param {string} subscriptionId - معرف الاشتراك في Stripe
 * @body {boolean} [atPeriodEnd] - إلغاء في نهاية الفترة
 */
router.post(
  '/subscriptions/:subscriptionId/cancel',
  checkRole(['owner', 'admin', 'user']),
  plansController.cancelStripeSubscription
);

/**
 * @route POST /api/v1/plans/subscriptions/:subscriptionId/reactivate
 * @desc إعادة تفعيل اشتراك في Stripe
 * @access Private - authenticated users
 * @param {string} subscriptionId - معرف الاشتراك في Stripe
 */
router.post(
  '/subscriptions/:subscriptionId/reactivate',
  checkRole(['owner', 'admin', 'user']),
  plansController.reactivateStripeSubscription
);

/**
 * @route POST /api/v1/plans/subscriptions/:subscriptionId/change-plan
 * @desc تغيير خطة الاشتراك في Stripe
 * @access Private - authenticated users
 * @param {string} subscriptionId - معرف الاشتراك في Stripe
 * @body {string} newPriceId - معرف السعر الجديد
 * @body {string} [prorationBehavior] - سلوك التناسب
 */
router.post(
  '/subscriptions/:subscriptionId/change-plan',
  checkRole(['owner', 'admin', 'user']),
  plansController.changeStripeSubscriptionPlan
);

/**
 * @route POST /api/v1/plans/subscriptions/:subscriptionId/preview-proration
 * @desc معاينة فاتورة تغيير الخطة
 * @access Private - authenticated users
 * @param {string} subscriptionId - معرف الاشتراك في Stripe
 * @body {string} newPriceId - معرف السعر الجديد
 */
router.post(
  '/subscriptions/:subscriptionId/preview-proration',
  checkRole(['owner', 'admin', 'user']),
  plansController.previewProration
);

export default router;
