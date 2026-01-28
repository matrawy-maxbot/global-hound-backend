import { Response, NextFunction } from 'express';
import CarsService from '../../../../database/postgreSQL/services/cars.service.js';
import { type QueryOptions } from '../../../../database/postgreSQL/services/cars.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { resolveDatabaseResult } from '../../../../../utils/object.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة السيارات - Cars Controller
 * يحتوي على جميع العمليات المتعلقة بإدارة السيارات
 * Contains all operations related to cars management
 */

/**
 * الحصول على جميع السيارات
 * Get all cars
 */
export const getAllCars = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, offset, order, search, make, year } = req.query as {
      limit?: string;
      offset?: string;
      order?: string;
      search?: string;
      make?: string;
      year?: string;
    };

    const options: QueryOptions = {
      ...(limit && { limit: Math.min(parseInt(limit), 200) }),
      ...(offset && { offset: parseInt(offset) }),
      ...(order && { order: JSON.parse(order) })
    };

    let cars;
    let error;

    // البحث حسب المعايير
    if (search) {
      [cars, error] = await CarsService.search(search, options);
    } else if (make) {
      [cars, error] = await CarsService.getByMake(make, options);
    } else if (year) {
      [cars, error] = await CarsService.getByYear(parseInt(year), options);
    } else {
      [cars, error] = await CarsService.getAll(options);
    }

    const [totalCount, countError] = await CarsService.count();

    if (error || countError) {
      res.status(500);
      return next(error || countError);
    }

    const result = resolveDatabaseResult(cars);
    const currentLimit = limit ? Math.min(parseInt(limit), 200) : result?.length || 0;
    const count = totalCount || 0;
    const nextOffset = offset ? parseInt(offset) + currentLimit : currentLimit;
    const left = Math.max(0, count - nextOffset);

    send(res, { 
      success: true, 
      data: result, 
      count,
      nextOffset,
      left
    }, 'تم جلب السيارات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على سيارة بواسطة المعرف
 * Get car by ID
 */
export const getCarById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [car, error] = await CarsService.getById(id);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!car) {
      send(res, { success: false, data: null }, 'السيارة غير موجودة', 404);
      return;
    }

    const result = resolveDatabaseResult(car);
    send(res, { success: true, data: result }, 'تم جلب السيارة بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على سيارة بواسطة رقم VIN
 * Get car by VIN
 */
export const getCarByVin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const vin = req.params.vin as string;

    const [car, error] = await CarsService.getByVin(vin);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!car) {
      send(res, { success: false, data: null }, 'السيارة غير موجودة', 404);
      return;
    }

    const result = resolveDatabaseResult(car);
    send(res, { success: true, data: result }, 'تم جلب السيارة بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إنشاء سيارة جديدة
 * Create new car
 */
export const createCar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const carData = {
      car_make: req.body.car_make,
      car_model: req.body.car_model,
      car_model_year: req.body.car_model_year,
      car_vin: req.body.car_vin
    };

    const [car, error] = await CarsService.create(carData);

    if (error) {
      console.log('Error creating car:', error);
      res.status(400);
      return next(error);
    }

    if (!car) {
      send(res, { success: false, data: null }, 'فشل في إنشاء السيارة', 400);
      return;
    }

    const result = resolveDatabaseResult(car);
    send(res, { success: true, data: result }, 'تم إنشاء السيارة بنجاح', 201);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تحديث سيارة
 * Update car
 */
export const updateCar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    const [result, error] = await CarsService.update(id, updateData);

    if (error) {
      console.log('Error updating car:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تحديث السيارة بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * حذف سيارة
 * Delete car
 */
export const deleteCar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await CarsService.delete(id);

    if (error) {
      console.log('Error deleting car:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: null }, 'تم حذف السيارة بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إحصائيات السيارات
 * Get car statistics
 */
export const getCarStatistics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [count, countError] = await CarsService.count();
    const [statsByMake, statsError] = await CarsService.getStatisticsByMake();

    if (countError || statsError) {
      res.status(500);
      return next(countError || statsError);
    }

    send(res, { 
      success: true, 
      data: { 
        total: count,
        byMake: statsByMake 
      } 
    }, 'تم جلب إحصائيات السيارات بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
