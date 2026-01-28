import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config.js';

/**
 * نموذج السيارات - Car Model
 * يحتوي على معلومات السيارات
 * @module CarModel
 */

// ===================== Interfaces =====================

interface CarAttributes {
  id: string;
  car_make: string;
  car_model: string;
  car_model_year: number;
  car_vin: string;
  created_at?: Date;
  updated_at?: Date;
}

interface CarCreationAttributes extends Optional<CarAttributes, 'id' | 'created_at' | 'updated_at'> {}

// ===================== Model Definition =====================

class Car extends Model<CarAttributes, CarCreationAttributes> implements CarAttributes {
  declare id: string;
  declare car_make: string;
  declare car_model: string;
  declare car_model_year: number;
  declare car_vin: string;
  declare created_at: Date;
  declare updated_at: Date;

  /**
   * الحصول على الاسم الكامل للسيارة
   */
  getFullName(): string {
    return `${this.car_make} ${this.car_model} (${this.car_model_year})`;
  }
}

Car.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'معرف السيارة الفريد - Car ID'
    },
    car_make: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'شركة تصنيع السيارة - Car manufacturer (e.g., BMW, Toyota)'
    },
    car_model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'موديل السيارة - Car model (e.g., 325, Camry)'
    },
    car_model_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1900,
        max: 2100
      },
      comment: 'سنة صنع السيارة - Car model year'
    },
    car_vin: {
      type: DataTypes.STRING(17),
      allowNull: false,
      unique: true,
      validate: {
        len: [17, 17]
      },
      comment: 'رقم تعريف السيارة الفريد - Vehicle Identification Number (VIN)'
    }
  },
  {
    sequelize,
    tableName: 'cars',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['car_vin'],
        name: 'unique_car_vin'
      },
      {
        fields: ['car_make'],
        name: 'idx_car_make'
      },
      {
        fields: ['car_model_year'],
        name: 'idx_car_model_year'
      }
    ],
    comment: 'جدول السيارات - Cars Table'
  }
);

export default Car;
export type { CarAttributes, CarCreationAttributes };
