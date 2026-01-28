import express, { Router } from 'express';
import * as customersController from '../controllers/customers.controller.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';

/**
 * مسارات إدارة عملاء Stripe
 * @module CustomersRoutes
 */

const router: Router = express.Router();

/**
 * @route POST /api/v1/customers
 * @desc إنشاء عميل جديد في Stripe
 * @access Private - authenticated users
 * @body {string} email - البريد الإلكتروني
 * @body {string} [name] - الاسم
 * @body {string} [phone] - الهاتف
 * @body {string} [paymentMethodId] - معرف طريقة الدفع
 */
router.post(
  '/',
  checkRole(['owner', 'admin', 'user']),
  customersController.createCustomer
);

/**
 * @route POST /api/v1/customers/get-or-create
 * @desc الحصول على عميل أو إنشاؤه
 * @access Private - authenticated users
 * @body {string} email - البريد الإلكتروني
 */
router.post(
  '/get-or-create',
  checkRole(['owner', 'admin', 'user']),
  customersController.getOrCreateCustomer
);

/**
 * @route GET /api/v1/customers/:customerId
 * @desc الحصول على عميل بواسطة المعرف
 * @access Private - authenticated users
 * @param {string} customerId - معرف العميل في Stripe
 */
router.get(
  '/:customerId',
  checkRole(['owner', 'admin', 'user']),
  customersController.getCustomer
);

/**
 * @route PUT /api/v1/customers/:customerId
 * @desc تحديث عميل
 * @access Private - authenticated users
 * @param {string} customerId - معرف العميل في Stripe
 */
router.put(
  '/:customerId',
  checkRole(['owner', 'admin', 'user']),
  customersController.updateCustomer
);

/**
 * @route POST /api/v1/customers/:customerId/payment-methods
 * @desc إرفاق طريقة دفع للعميل
 * @access Private - authenticated users
 * @param {string} customerId - معرف العميل
 * @body {string} paymentMethodId - معرف طريقة الدفع
 */
router.post(
  '/:customerId/payment-methods',
  checkRole(['owner', 'admin', 'user']),
  customersController.attachPaymentMethod
);

/**
 * @route GET /api/v1/customers/:customerId/payment-methods
 * @desc الحصول على طرق الدفع للعميل
 * @access Private - authenticated users
 * @param {string} customerId - معرف العميل
 * @query {string} [type=card] - نوع طريقة الدفع
 */
router.get(
  '/:customerId/payment-methods',
  checkRole(['owner', 'admin', 'user']),
  customersController.getPaymentMethods
);

/**
 * @route POST /api/v1/customers/:customerId/setup-intent
 * @desc إنشاء Setup Intent للعميل
 * @access Private - authenticated users
 * @param {string} customerId - معرف العميل
 */
router.post(
  '/:customerId/setup-intent',
  checkRole(['owner', 'admin', 'user']),
  customersController.createSetupIntent
);

export default router;
