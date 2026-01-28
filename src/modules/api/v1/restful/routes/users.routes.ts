import express, { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import * as usersValidator from '../validators/users.validator.js';
import validationMiddlewareFactory from '../../../../../middlewares/validation/validation.middleware.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';
import { checkSubscription } from '../../../../auth/middlewares/subscription.middleware.js';

/**
 * مسارات إدارة المستخدمين
 * @module UsersRoutes
 */

const router: Router = express.Router();

/**
 * @route GET /api/v1/users
 * @desc الحصول على جميع المستخدمين
 * @access Private - owner and admin with 'view_users' permission
 * @query {number} [limit] - عدد النتائج المطلوبة
 * @query {number} [offset] - عدد النتائج المتجاوزة
 * @query {string} [order] - ترتيب النتائج
 * @query {string} [search] - البحث في الاسم أو البريد الإلكتروني
 * @query {string} [auth_provider] - تصفية حسب نوع المصادقة (local/google/all)
 */
router.get(
  '/',
  checkRole(['owner', 'admin'], ['view_users']),
  usersController.getAllUsers
);

/**
 * @route GET /api/v1/users/email/:email
 * @desc الحصول على مستخدم بواسطة البريد الإلكتروني
 * @access Private - owner and admin with 'view_users' permission
 * @param {string} email - البريد الإلكتروني
 */
router.get(
  '/email/:email',
  checkRole(['owner', 'admin'], ['view_users']),
  validationMiddlewareFactory(usersValidator.getUserByEmailSchema.params!, 'params'),
  usersController.getUserByEmail
);

/**
 * @route GET /api/v1/users/:id
 * @desc الحصول على مستخدم بواسطة المعرف (UUID)
 * @access Private - owner and admin with 'view_users' permission
 * @param {string} id - معرف المستخدم (UUID)
 */
router.get(
  '/:id',
  checkRole(['owner', 'admin'], ['view_users']),
  validationMiddlewareFactory(usersValidator.getUserByIdSchema.params!, 'params'),
  usersController.getUserById
);

/**
 * @route PUT /api/v1/users/:id
 * @desc تحديث مستخدم
 * @access Private - owner only
 * @param {string} id - معرف المستخدم (UUID)
 * @body {Object} updateData - البيانات المحدثة
 */
router.put(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(usersValidator.updateUserSchema.params!, 'params'),
  validationMiddlewareFactory(usersValidator.updateUserSchema.body!, 'body'),
  usersController.updateUser
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc حذف مستخدم
 * @access Private - owner only
 * @param {string} id - معرف المستخدم (UUID)
 */
router.delete(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(usersValidator.deleteUserSchema.params!, 'params'),
  usersController.deleteUser
);

export default router;
