import express, { Router } from 'express';
import * as projectAdminsController from '../controllers/projectAdmins.controller.js';
import * as projectAdminsValidator from '../validators/projectAdmins.validator.js';
import validationMiddlewareFactory from '../../../../../middlewares/validation/validation.middleware.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';

/**
 * مسارات إدارة مشرفي المشاريع
 * @module ProjectAdminsRoutes
 */

const router: Router = express.Router();

/**
 * @route GET /api/v1/restful/project-admins
 * @desc الحصول على جميع مشرفي المشاريع
 * @access Private - owner only
 * @query {number} [limit] - عدد النتائج المطلوبة
 * @query {number} [offset] - عدد النتائج المتجاوزة
 * @query {string} [order] - ترتيب النتائج
 */
router.get(
  '/',
  checkRole(['owner']),
  projectAdminsController.getAllProjectAdmins
);

/**
 * @route GET /api/v1/restful/project-admins/user/:userId
 * @desc الحصول على مشرف المشروع بواسطة معرف المستخدم
 * @access Private - owner only
 * @param {string} userId - معرف المستخدم
 */
router.get(
  '/user/:userId',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.getProjectAdminByUserIdSchema.params!, 'params'),
  projectAdminsController.getProjectAdminByUserId
);

/**
 * @route GET /api/v1/restful/project-admins/permission/:permission
 * @desc الحصول على مشرفي المشاريع بواسطة الصلاحية
 * @access Private - owner only
 * @param {string} permission - الصلاحية
 */
router.get(
  '/permission/:permission',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.getProjectAdminsByPermissionSchema.params!, 'params'),
  projectAdminsController.getProjectAdminsByPermission
);

/**
 * @route GET /api/v1/restful/project-admins/check/:userId/:permission
 * @desc التحقق من وجود صلاحية للمستخدم
 * @access Private - owner only
 * @param {string} userId - معرف المستخدم
 * @param {string} permission - الصلاحية
 */
router.get(
  '/check/:userId/:permission',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.checkPermissionSchema.params!, 'params'),
  projectAdminsController.checkUserPermission
);

/**
 * @route GET /api/v1/restful/project-admins/:id
 * @desc الحصول على مشرف مشروع بواسطة المعرف (UUID)
 * @access Private - owner only
 * @param {string} id - معرف مشرف المشروع (UUID)
 */
router.get(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.getProjectAdminByIdSchema.params!, 'params'),
  projectAdminsController.getProjectAdminById
);

/**
 * @route POST /api/v1/restful/project-admins
 * @desc إنشاء مشرف مشروع جديد
 * @access Private - owner only
 * @body {Object} projectAdminData - بيانات مشرف المشروع الجديد
 * @body {string} projectAdminData.user_id - معرف المستخدم
 * @body {string[]} [projectAdminData.permissions] - قائمة الصلاحيات
 */
router.post(
  '/',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.createProjectAdminSchema.body!, 'body'),
  projectAdminsController.createProjectAdmin
);

/**
 * @route PUT /api/v1/restful/project-admins/:id
 * @desc تحديث مشرف المشروع
 * @access Private - owner only
 * @param {string} id - معرف مشرف المشروع (UUID)
 * @body {Object} updateData - البيانات المحدثة
 * @body {string[]} [updateData.permissions] - قائمة الصلاحيات
 */
router.put(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.updateProjectAdminSchema.params!, 'params'),
  validationMiddlewareFactory(projectAdminsValidator.updateProjectAdminSchema.body!, 'body'),
  projectAdminsController.updateProjectAdmin
);

/**
 * @route POST /api/v1/restful/project-admins/:id/permissions
 * @desc إضافة صلاحية لمشرف المشروع
 * @access Private - owner only
 * @param {string} id - معرف مشرف المشروع (UUID)
 * @body {string} permission - الصلاحية المراد إضافتها
 */
router.post(
  '/:id/permissions',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.permissionActionSchema.params!, 'params'),
  validationMiddlewareFactory(projectAdminsValidator.permissionActionSchema.body!, 'body'),
  projectAdminsController.addPermission
);

/**
 * @route DELETE /api/v1/restful/project-admins/:id/permissions
 * @desc إزالة صلاحية من مشرف المشروع
 * @access Private - owner only
 * @param {string} id - معرف مشرف المشروع (UUID)
 * @body {string} permission - الصلاحية المراد إزالتها
 */
router.delete(
  '/:id/permissions',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.permissionActionSchema.params!, 'params'),
  validationMiddlewareFactory(projectAdminsValidator.permissionActionSchema.body!, 'body'),
  projectAdminsController.removePermission
);

/**
 * @route DELETE /api/v1/restful/project-admins/:id
 * @desc حذف مشرف المشروع
 * @access Private - owner only
 * @param {string} id - معرف مشرف المشروع (UUID)
 */
router.delete(
  '/:id',
  checkRole(['owner']),
  validationMiddlewareFactory(projectAdminsValidator.deleteProjectAdminSchema.params!, 'params'),
  projectAdminsController.deleteProjectAdmin
);

export default router;
