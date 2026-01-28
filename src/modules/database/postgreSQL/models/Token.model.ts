import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config.js';

/**
 * نموذج التوكنات - Token Model
 * يحتوي على معلومات التوكنات للمصادقة وإعادة التعيين
 * @module TokenModel
 */

// ===================== Enums =====================

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY_EMAIL = 'verifyEmail'
}

// ===================== Interfaces =====================

interface TokenAttributes {
  id: string;
  token: string;
  type: TokenType;
  refresh_token?: string;
  expires_at: Date;
  used: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface TokenCreationAttributes extends Optional<TokenAttributes, 'id' | 'used' | 'refresh_token' | 'ip_address' | 'user_agent' | 'created_at' | 'updated_at'> {}

// ===================== Model Definition =====================

class Token extends Model<TokenAttributes, TokenCreationAttributes> implements TokenAttributes {
  declare id: string;
  declare token: string;
  declare type: TokenType;
  declare refresh_token?: string;
  declare expires_at: Date;
  declare used: boolean;
  declare ip_address?: string;
  declare user_agent?: string;
  declare created_at: Date;
  declare updated_at: Date;
}

Token.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'معرف التوكن الفريد - Token ID'
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      comment: 'التوكن نفسه (مشفر عادة) - The token itself (usually encrypted)'
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TokenType)),
      allowNull: false,
      comment: 'نوع التوكن - Token type (access, refresh, resetPassword, verifyEmail)'
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'مرجع التوكن للتحديث/الربط - Refresh token reference for linking'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'تاريخ انتهاء التوكن - Token expiration date'
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'هل التوكن مستخدم؟ - Is the token used?'
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'عنوان IP الذي أنشأ التوكن - IP address that created the token'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'معلومات الجهاز/المتصفح - Device/Browser information'
    }
  },
  {
    sequelize,
    tableName: 'tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
        name: 'unique_token'
      },
      {
        fields: ['refresh_token'],
        name: 'idx_refresh_token'
      },
      {
        fields: ['expires_at'],
        name: 'idx_expires_at'
      },
      {
        fields: ['type'],
        name: 'idx_token_type'
      }
    ],
    comment: 'جدول التوكنات - Tokens Table'
  }
);

export default Token;
export type { TokenAttributes, TokenCreationAttributes };
