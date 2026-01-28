import { FindOptions, Order, Op } from 'sequelize';
import { PGinsert, PGupdate, PGdelete, PGselectAll } from '../config/postgre.manager.js';
import { Car } from '../models/index.js';
import { resolveError } from '../../../../utils/errors/errorResolver.util.js';

// ===================== Types =====================

interface CarData {
  id?: string;
  car_make: string;
  car_model: string;
  car_model_year: number;
  car_vin: string;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: Order;
}

interface UpdateData {
  car_make?: string;
  car_model?: string;
  car_model_year?: number;
  car_vin?: string;
  [key: string]: unknown;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

// ===================== Service Class =====================

/**
 * خدمة إدارة السيارات - Cars Service
 * تحتوي على جميع العمليات المتعلقة بإدارة السيارات
 * Contains all operations related to cars management
 */
class CarsService {

  /**
   * الحصول على جميع السيارات
   * Get all cars
   */
  static async getAll(options: QueryOptions = {}): ServiceResult<CarData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC'], ['id', 'ASC']] } = options;
      
      const queryOptions: FindOptions = {
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const cars = await Car.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const carsData = cars.map(car => (car.toJSON ? car.toJSON() : car) as CarData);
      return [carsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السيارات')];
    }
  }

  /**
   * الحصول على سيارة بواسطة المعرف
   * Get car by ID
   */
  static async getById(id: string): ServiceResult<CarData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف السيارة مطلوب'), 'فشل في جلب السيارة')];
      }

      const cars = await PGselectAll(Car, { id });
      return [cars[0] as CarData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السيارة')];
    }
  }

  /**
   * الحصول على سيارة بواسطة رقم VIN
   * Get car by VIN
   */
  static async getByVin(vin: string): ServiceResult<CarData> {
    try {
      if (!vin) {
        return [null, resolveError(new Error('رقم VIN مطلوب'), 'فشل في جلب السيارة')];
      }

      const car = await Car.findOne({
        where: { car_vin: vin.toUpperCase() }
      });

      // تحويل Sequelize Model إلى plain object
      const carData = car ? (car.toJSON ? car.toJSON() : car) as CarData : null;
      return [carData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السيارة')];
    }
  }

  /**
   * الحصول على السيارات حسب الشركة المصنعة
   * Get cars by make
   */
  static async getByMake(make: string, options: QueryOptions = {}): ServiceResult<CarData[]> {
    try {
      if (!make) {
        return [null, resolveError(new Error('اسم الشركة المصنعة مطلوب'), 'فشل في جلب السيارات')];
      }

      const { limit, offset, order = [['created_at', 'DESC'], ['id', 'ASC']] } = options;
      
      const queryOptions: FindOptions = {
        where: { car_make: { [Op.iLike]: make } },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const cars = await Car.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const carsData = cars.map(car => (car.toJSON ? car.toJSON() : car) as CarData);
      return [carsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السيارات')];
    }
  }

  /**
   * الحصول على السيارات حسب سنة الصنع
   * Get cars by model year
   */
  static async getByYear(year: number, options: QueryOptions = {}): ServiceResult<CarData[]> {
    try {
      if (!year) {
        return [null, resolveError(new Error('سنة الصنع مطلوبة'), 'فشل في جلب السيارات')];
      }

      const { limit, offset, order = [['created_at', 'DESC'], ['id', 'ASC']] } = options;
      
      const queryOptions: FindOptions = {
        where: { car_model_year: year },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const cars = await Car.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const carsData = cars.map(car => (car.toJSON ? car.toJSON() : car) as CarData);
      return [carsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السيارات')];
    }
  }

  /**
   * البحث في السيارات
   * Search cars
   */
  static async search(query: string, options: QueryOptions = {}): ServiceResult<CarData[]> {
    try {
      if (!query) {
        return [null, resolveError(new Error('نص البحث مطلوب'), 'فشل في البحث')];
      }

      const { limit, offset, order = [['created_at', 'DESC'], ['id', 'ASC']] } = options;
      
      const queryOptions: FindOptions = {
        where: {
          [Op.or]: [
            { car_make: { [Op.iLike]: `%${query}%` } },
            { car_model: { [Op.iLike]: `%${query}%` } },
            { car_vin: { [Op.iLike]: `%${query}%` } }
          ]
        },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const cars = await Car.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const carsData = cars.map(car => (car.toJSON ? car.toJSON() : car) as CarData);
      return [carsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في البحث عن السيارات')];
    }
  }

  /**
   * إنشاء سيارة جديدة
   * Create new car
   */
  static async create(carData: CarData): ServiceResult<CarData> {
    try {
      if (!carData || !carData.car_make || !carData.car_model || !carData.car_model_year || !carData.car_vin) {
        return [null, resolveError(new Error('جميع بيانات السيارة مطلوبة'), 'فشل في إنشاء السيارة')];
      }

      // التحقق من عدم وجود سيارة بنفس VIN
      const [existingCar] = await this.getByVin(carData.car_vin);
      if (existingCar) {
        return [null, resolveError(new Error('رقم VIN مستخدم بالفعل'), 'فشل في إنشاء السيارة')];
      }

      const newCar = await PGinsert(Car, {
        ...carData,
        car_vin: carData.car_vin.toUpperCase()
      });

      return [newCar.data as CarData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء السيارة')];
    }
  }

  /**
   * تحديث سيارة
   * Update car
   */
  static async update(id: string, updateData: UpdateData): ServiceResult<{ changedRows: number }> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف السيارة مطلوب'), 'فشل في تحديث السيارة')];
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return [null, resolveError(new Error('بيانات التحديث مطلوبة'), 'فشل في تحديث السيارة')];
      }

      // إذا كان التحديث يتضمن VIN، تحقق من عدم استخدامه
      if (updateData.car_vin) {
        const [existingCar] = await this.getByVin(updateData.car_vin);
        if (existingCar && existingCar.id !== id) {
          return [null, resolveError(new Error('رقم VIN مستخدم بالفعل'), 'فشل في تحديث السيارة')];
        }
        updateData.car_vin = updateData.car_vin.toUpperCase();
      }

      const result = await PGupdate(Car, updateData, { id });
      return [{ changedRows: result?.changedRows || 0 }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث السيارة')];
    }
  }

  /**
   * حذف سيارة
   * Delete car
   */
  static async delete(id: string): ServiceResult<boolean> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف السيارة مطلوب'), 'فشل في حذف السيارة')];
      }

      await PGdelete(Car, { id });
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف السيارة')];
    }
  }

  /**
   * عدد السيارات
   * Count cars
   */
  static async count(): ServiceResult<number> {
    try {
      const count = await Car.count();
      return [count, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في عد السيارات')];
    }
  }

  /**
   * إحصائيات السيارات حسب الشركة المصنعة
   * Get car statistics by make
   */
  static async getStatisticsByMake(): ServiceResult<Record<string, number>> {
    try {
      const cars = await Car.findAll({
        attributes: ['car_make']
      });

      const stats: Record<string, number> = {};
      (cars as unknown as CarData[]).forEach(car => {
        stats[car.car_make] = (stats[car.car_make] || 0) + 1;
      });

      return [stats, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب إحصائيات السيارات')];
    }
  }
}

export default CarsService;
export type { CarData, QueryOptions, UpdateData };
