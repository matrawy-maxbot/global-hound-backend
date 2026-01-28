import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config.js';

/**
 * نموذج مشرفي البوت - Project Admin Model
 * يحتوي على معلومات المشرفين وصلاحياتهم
 * @module ProjectAdminModel
 */

// ===================== Interfaces =====================

interface ProjectAdminAttributes {
  id: string;
  user_id: string;
  permissions: string[];
  created_at?: Date;
  updated_at?: Date;
}

interface ProjectAdminCreationAttributes extends Optional<ProjectAdminAttributes, 'id' | 'permissions' | 'created_at' | 'updated_at'> {}

// ===================== Model Definition =====================

class ProjectAdmin extends Model<ProjectAdminAttributes, ProjectAdminCreationAttributes> implements ProjectAdminAttributes {
  declare id: string;
  declare user_id: string;
  declare permissions: string[];
  declare created_at: Date;
  declare updated_at: Date;
}

ProjectAdmin.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'معرف المشرف الفريد - Project Admin ID'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      comment: 'معرف المستخدم - User ID (NULL if user deleted)'
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      comment: 'قائمة الصلاحيات - Permissions list'
    }
  },
  {
    sequelize,
    tableName: 'project_admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'unique_user_id'
      }
    ],
    comment: 'جدول مشرفي البوت - Project Admins Table'
  }
);

export default ProjectAdmin;
export type { ProjectAdminAttributes, ProjectAdminCreationAttributes };
