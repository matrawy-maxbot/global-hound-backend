import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/db.config.js';

/**
 * نموذج المستخدم - User Model
 * يدعم التسجيل عبر البريد الإلكتروني وكلمة المرور أو عبر Google OAuth2
 * @module UserModel
 */

// ===================== Enums =====================

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google'
}

// ===================== Interfaces =====================

interface UserAttributes {
  id: string;
  email: string;
  password_hash?: string;
  auth_provider: AuthProvider;
  google_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'password_hash' | 'google_id' | 'first_name' | 'last_name' | 
  'display_name' | 'avatar_url' | 'email_verified' | 'created_at' | 'updated_at'
> {}

// ===================== Model Definition =====================

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash?: string;
  declare auth_provider: AuthProvider;
  declare google_id?: string;
  declare first_name?: string;
  declare last_name?: string;
  declare display_name?: string;
  declare avatar_url?: string;
  declare email_verified: boolean;
  declare created_at: Date;
  declare updated_at: Date;

  /**
   * التحقق مما إذا كان المستخدم مسجل عبر Google
   */
  isGoogleUser(): boolean {
    return this.auth_provider === AuthProvider.GOOGLE;
  }

  /**
   * التحقق مما إذا كان المستخدم مسجل عبر البريد الإلكتروني
   */
  isLocalUser(): boolean {
    return this.auth_provider === AuthProvider.LOCAL;
  }

  /**
   * الحصول على الاسم الكامل
   */
  getFullName(): string {
    if (this.first_name && this.last_name) {
      return `${this.first_name} ${this.last_name}`;
    }
    return this.display_name || this.email.split('@')[0];
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'معرف المستخدم الفريد - User ID'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'البريد الإلكتروني - Email address'
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'كلمة المرور المشفرة (فقط للتسجيل المحلي)'
    },
    auth_provider: {
      type: DataTypes.ENUM(...Object.values(AuthProvider)),
      allowNull: false,
      defaultValue: AuthProvider.LOCAL,
      comment: 'مزود المصادقة (local, google)'
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'معرف Google الفريد'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'الاسم الأول'
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'اسم العائلة'
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'اسم العرض'
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'رابط الصورة الشخصية'
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'هل تم التحقق من البريد الإلكتروني'
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
        name: 'unique_email'
      },
      {
        unique: true,
        fields: ['google_id'],
        name: 'unique_google_id',
        where: {
          google_id: {
            [Op.ne]: null
          }
        }
      },
      {
        fields: ['auth_provider'],
        name: 'idx_auth_provider'
      }
    ],
    comment: 'جدول المستخدمين - Users Table',
    hooks: {
      beforeCreate: (user: User) => {
        if (user.auth_provider === AuthProvider.LOCAL && !user.password_hash) {
          throw new Error('كلمة المرور مطلوبة للتسجيل المحلي');
        }
        if (user.auth_provider === AuthProvider.GOOGLE && !user.google_id) {
          throw new Error('معرف Google مطلوب للتسجيل عبر Google');
        }
        if (user.auth_provider === AuthProvider.GOOGLE) {
          user.email_verified = true;
        }
      }
    }
  }
);

export default User;
export type { UserAttributes, UserCreationAttributes };
