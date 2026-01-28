import express, { Router } from 'express';
import * as carsController from '../controllers/cars.controller.js';
import * as carsValidator from '../validators/cars.validator.js';
import validationMiddlewareFactory from '../../../../../middlewares/validation/validation.middleware.js';
import { checkRole } from '../../../../auth/middlewares/role.middleware.js';
import { checkSubscription } from '../../../../auth/middlewares/subscription.middleware.js';

/**
 * مسارات إدارة السيارات
 * @module CarsRoutes
 */

const router: Router = express.Router();

/**
 * @route GET /api/v1/cars
 * @desc الحصول على جميع السيارات
 * @access public
 * @query {number} [limit] - عدد النتائج المطلوبة
 * @query {number} [offset] - عدد النتائج المتجاوزة
 * @query {string} [order] - ترتيب النتائج
 * @query {string} [search] - البحث في الشركة أو الموديل أو VIN
 * @query {string} [make] - تصفية حسب الشركة المصنعة
 * @query {number} [year] - تصفية حسب سنة الصنع
 */
router.get(
  '/',
  checkRole(['owner', 'admin', 'user']),
  checkSubscription(['user'], ['test subscription']),
  carsController.getAllCars
);

/**
 * @route GET /api/v1/cars/statistics
 * @desc الحصول على إحصائيات السيارات
 * @access Private - owner and admin with 'view_cars' permission
 */
router.get(
  '/statistics',
  checkRole(['owner', 'admin'], ['view_cars']),
  carsController.getCarStatistics
);

/**
 * @route GET /api/v1/cars/vin/:vin
 * @desc الحصول على سيارة بواسطة رقم VIN
 * @access public
 * @param {string} vin - رقم تعريف السيارة (VIN)
 */
router.get(
  '/vin/:vin',
  checkRole(['owner', 'admin', 'user']),
  checkSubscription(['user'], ['test subscription']),
  validationMiddlewareFactory(carsValidator.getCarByVinSchema.params!, 'params'),
  carsController.getCarByVin
);

/**
 * @route GET /api/v1/cars/:id
 * @desc الحصول على سيارة بواسطة المعرف (UUID)
 * @access public
 * @param {string} id - معرف السيارة (UUID)
 */
router.get(
  '/:id',
  checkRole(['owner', 'admin', 'user']),
  checkSubscription(['user'], ['test subscription']),
  validationMiddlewareFactory(carsValidator.getCarByIdSchema.params!, 'params'),
  carsController.getCarById
);

/**
 * @route POST /api/v1/cars
 * @desc إنشاء سيارة جديدة
 * @access Private - owner and admin with 'create_cars' permission
 * @body {string} car_make - شركة تصنيع السيارة
 * @body {string} car_model - موديل السيارة
 * @body {number} car_model_year - سنة الصنع
 * @body {string} car_vin - رقم تعريف السيارة (VIN)
 */
router.post(
  '/',
  checkRole(['owner', 'admin'], ['create_cars']),
  validationMiddlewareFactory(carsValidator.createCarSchema.body!, 'body'),
  carsController.createCar
);

/**
 * @route PUT /api/v1/cars/:id
 * @desc تحديث سيارة
 * @access Private - owner and admin with 'update_cars' permission
 * @param {string} id - معرف السيارة (UUID)
 * @body {Object} updateData - البيانات المحدثة
 */
router.put(
  '/:id',
  checkRole(['owner', 'admin'], ['update_cars']),
  validationMiddlewareFactory(carsValidator.updateCarSchema.params!, 'params'),
  validationMiddlewareFactory(carsValidator.updateCarSchema.body!, 'body'),
  carsController.updateCar
);

/**
 * @route DELETE /api/v1/cars/:id
 * @desc حذف سيارة
 * @access Private - owner and admin with 'delete_cars' permission
 * @param {string} id - معرف السيارة (UUID)
 */
router.delete(
  '/:id',
  checkRole(['owner', 'admin'], ['delete_cars']),
  validationMiddlewareFactory(carsValidator.deleteCarSchema.params!, 'params'),
  carsController.deleteCar
);

export default router;
