import express, { Router } from 'express';
import * as subscriptionsController from '../controllers/subscriptions.controller.js';
import * as subscriptionsValidator from '../validators/subscriptions.validator.js';
import validationMiddlewareFactory from '../../../../../middlewares/validation/validation.middleware.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';

/**
 * مسارات إدارة الاشتراكات - متوافقة مع Stripe
 * @module SubscriptionsRoutes
 */

const router: Router = express.Router();

/**
 * @route GET /api/v1/subscriptions
 * @desc الحصول على جميع الاشتراكات
 * @access Private - owner and admin only
 * @query {number} [limit] - عدد النتائج المطلوبة
 * @query {number} [offset] - عدد النتائج المتجاوزة
 * @query {string} [status] - تصفية حسب الحالة
 * @query {string} [plan_name] - تصفية حسب اسم الخطة
 */
router.get(
  '/',
  checkRole(['owner', 'admin']),
  subscriptionsController.getAllSubscriptions
);

/**
 * @route GET /api/v1/subscriptions/statistics
 * @desc الحصول على إحصائيات الاشتراكات
 * @access Private - owner only
 */
router.get(
  '/statistics',
  checkRole(['owner']),
  subscriptionsController.getSubscriptionStatistics
);

/**
 * @route GET /api/v1/subscriptions/expiring
 * @desc الحصول على الاشتراكات المنتهية قريباً
 * @access Private - owner and admin only
 * @query {number} [days=7] - عدد الأيام
 */
router.get(
  '/expiring',
  checkRole(['owner', 'admin']),
  subscriptionsController.getExpiringSubscriptions
);

/**
 * @route GET /api/v1/subscriptions/me
 * @desc الحصول على الاشتراك النشط للمستخدم الحالي
 * @access Private - authenticated users
 */
router.get(
  '/me',
  checkRole(['owner', 'admin', 'user']),
  subscriptionsController.getMyActiveSubscription
);

/**
 * @route POST /api/v1/subscriptions/me/cancel
 * @desc إلغاء اشتراك المستخدم الحالي
 * @access Private - authenticated users
 */
router.post(
  '/me/cancel',
  checkRole(['owner', 'admin', 'user']),
  subscriptionsController.cancelMySubscription
);

/**
 * @route GET /api/v1/subscriptions/user/:userId
 * @desc الحصول على اشتراكات المستخدم
 * @access Private - owner and admin only
 * @param {string} userId - معرف المستخدم (UUID)
 */
router.get(
  '/user/:userId',
  checkRole(['owner', 'admin']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionsByUserIdSchema.params!, 'params'),
  subscriptionsController.getSubscriptionsByUserId
);

/**
 * @route GET /api/v1/subscriptions/user/:userId/active
 * @desc الحصول على الاشتراك النشط للمستخدم
 * @access Private - owner and admin only
 * @param {string} userId - معرف المستخدم (UUID)
 */
router.get(
  '/user/:userId/active',
  checkRole(['owner', 'admin']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionsByUserIdSchema.params!, 'params'),
  subscriptionsController.getActiveSubscriptionByUserId
);

/**
 * @route GET /api/v1/subscriptions/:id
 * @desc الحصول على اشتراك بواسطة المعرف
 * @access Private - owner and admin only
 * @param {string} id - معرف الاشتراك (UUID)
 */
router.get(
  '/:id',
  checkRole(['owner', 'admin']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionByIdSchema.params!, 'params'),
  subscriptionsController.getSubscriptionById
);

/**
 * @route POST /api/v1/subscriptions
 * @desc إنشاء اشتراك جديد (حفظ في قاعدة البيانات)
 * @access Private - authenticated users
 * @body {Object} subscriptionData - بيانات الاشتراك
 */
router.post(
  '/',
  checkRole(['owner', 'admin', 'user']),
  validationMiddlewareFactory(subscriptionsValidator.createSubscriptionSchema.body!, 'body'),
  subscriptionsController.createSubscription
);

/**
 * @route PUT /api/v1/subscriptions/:id
 * @desc تحديث اشتراك
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID)
 */
router.put(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.updateSubscriptionSchema.params!, 'params'),
  validationMiddlewareFactory(subscriptionsValidator.updateSubscriptionSchema.body!, 'body'),
  subscriptionsController.updateSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/activate
 * @desc تفعيل اشتراك
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID)
 */
router.post(
  '/:id/activate',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionByIdSchema.params!, 'params'),
  subscriptionsController.activateSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/cancel
 * @desc إلغاء اشتراك فوراً
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID أو stripe_subscription_id)
 */
router.post(
  '/:id/cancel',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.cancelSubscriptionSchema.params!, 'params'),
  subscriptionsController.cancelSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/pause
 * @desc إيقاف اشتراك مؤقتاً
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID أو stripe_subscription_id)
 */
router.post(
  '/:id/pause',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionByIdSchema.params!, 'params'),
  subscriptionsController.pauseSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/resume
 * @desc استئناف اشتراك موقوف مؤقتاً
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID أو stripe_subscription_id)
 */
router.post(
  '/:id/resume',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.getSubscriptionByIdSchema.params!, 'params'),
  subscriptionsController.resumeSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/renew
 * @desc تجديد اشتراك
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID)
 * @body {Date} period_end - تاريخ نهاية الفترة الجديد
 */
router.post(
  '/:id/renew',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.renewSubscriptionSchema.params!, 'params'),
  validationMiddlewareFactory(subscriptionsValidator.renewSubscriptionSchema.body!, 'body'),
  subscriptionsController.renewSubscription
);

/**
 * @route POST /api/v1/subscriptions/:id/change-plan
 * @desc تغيير خطة الاشتراك
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID)
 * @body {string} plan_name - اسم الخطة الجديدة
 * @body {string} stripe_price_id - معرف سعر Stripe
 * @body {number} amount - المبلغ الجديد
 */
router.post(
  '/:id/change-plan',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.changePlanSchema.params!, 'params'),
  validationMiddlewareFactory(subscriptionsValidator.changePlanSchema.body!, 'body'),
  subscriptionsController.changeSubscriptionPlan
);

/**
 * @route DELETE /api/v1/subscriptions/:id
 * @desc حذف اشتراك
 * @access Private - owner only
 * @param {string} id - معرف الاشتراك (UUID)
 */
router.delete(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(subscriptionsValidator.deleteSubscriptionSchema.params!, 'params'),
  subscriptionsController.deleteSubscription
);

export default router;
