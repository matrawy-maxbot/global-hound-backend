import { Op, FindOptions, Order } from 'sequelize';
import { PGinsert, PGupdate, PGdelete, PGselectAll } from '../config/postgre.manager.js';
import { ProjectAdmin } from '../models/index.js';
import { resolveError } from '../../../../utils/errors/errorResolver.util.js';
// import { ProjectAdminCacheService } from '../../../cache/redis/index.js';

// ===================== Types =====================

interface ProjectAdminData {
  id?: string;
  user_id: string;
  permissions: string[];
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown; // Allow index signature for compatibility
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: Order;
}

interface UpdateData {
  id?: string;
  user_id?: string;
  permissions?: string[];
  [key: string]: unknown;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

// ===================== Service Class =====================

/**
 * خدمة إدارة مشرفي البوت - Project Admins Service
 * تحتوي على جميع العمليات المتعلقة بإدارة مشرفي البوت وصلاحياتهم
 * Contains all operations related to project admins management and their permissions
 */
class ProjectAdminsService {
  
  /**
   * الحصول على جميع مشرفي البوت
   * Get all project admins
   * 
   * @param {QueryOptions} options - خيارات الاستعلام / Query options
   * @returns {ServiceResult<ProjectAdminData[]>} [result, error]
   */
  static async getAll(options: QueryOptions = {}): ServiceResult<ProjectAdminData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const projectAdmins = await ProjectAdmin.findAll(queryOptions);
      
      // تحويل Sequelize Models إلى plain objects
      const projectAdminsData = projectAdmins.map(admin => (admin.toJSON ? admin.toJSON() : admin) as ProjectAdminData);
      return [projectAdminsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب مشرفي البوت')];
    }
  }

  /**
   * الحصول على مشرف البوت بواسطة المعرف
   * Get project admin by ID
   * 
   * @param {string} id - معرف المشرف / Project Admin ID
   * @returns {ServiceResult<ProjectAdminData>} [result, error]
   */
  static async getById(id: string): ServiceResult<ProjectAdminData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المشرف مطلوب'), 'فشل في جلب المشرف')];
      }

      // Check cache first
      // const cachedProjectAdmin = await ProjectAdminCacheService.getProjectAdminById(id);
      // if (cachedProjectAdmin) {
      //   return [cachedProjectAdmin, null];
      // }

      const projectAdmins = await PGselectAll(ProjectAdmin, { id });

      // Cache the result if found
      // if (projectAdmins[0]) {
      //   await ProjectAdminCacheService.setProjectAdminById(id, projectAdmins[0]);
      // }

      return [projectAdmins[0] as ProjectAdminData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المشرف')];
    }
  }

  /**
   * الحصول على مشرف البوت بواسطة معرف المستخدم
   * Get project admin by user ID
   * 
   * @param {string} userId - معرف المستخدم / User ID
   * @returns {ServiceResult<ProjectAdminData>} [result, error]
   */
  static async getByUserId(userId: string): ServiceResult<ProjectAdminData> {
    try {
      if (!userId) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في جلب المشرف')];
      }

      // Check cache first
      // const cachedProjectAdmin = await ProjectAdminCacheService.getProjectAdminByUserId(userId);
      // if (cachedProjectAdmin) {
      //   return [cachedProjectAdmin, null];
      // }

      const projectAdmins = await PGselectAll(ProjectAdmin, { user_id: userId });

      // Cache the result if found
      // if (projectAdmins[0]) {
      //   await ProjectAdminCacheService.setProjectAdminByUserId(userId, projectAdmins[0]);
      // }

      return [projectAdmins[0] as ProjectAdminData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المشرف')];
    }
  }

  /**
   * البحث عن مشرفي البوت بصلاحية معينة
   * Search project admins by permission
   * 
   * @param {string} permission - الصلاحية / Permission
   * @returns {ServiceResult<ProjectAdminData[]>} [result, error]
   */
  static async getByPermission(permission: string): ServiceResult<ProjectAdminData[]> {
    try {
      if (!permission) {
        return [null, resolveError(new Error('الصلاحية مطلوبة'), 'فشل في البحث عن المشرفين')];
      }

      const projectAdmins = await ProjectAdmin.findAll({
        where: {
          permissions: {
            [Op.contains]: [permission]
          }
        }
      });

      // تحويل Sequelize Models إلى plain objects
      const projectAdminsData = projectAdmins.map(admin => (admin.toJSON ? admin.toJSON() : admin) as ProjectAdminData);
      return [projectAdminsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في البحث عن المشرفين')];
    }
  }

  /**
   * إنشاء مشرف بوت جديد
   * Create new project admin
   * 
   * @param {ProjectAdminData} projectAdminData - بيانات المشرف / Project admin data
   * @returns {ServiceResult<ProjectAdminData>} [result, error]
   */
  static async create(projectAdminData: ProjectAdminData): ServiceResult<ProjectAdminData> {
    try {
      if (!projectAdminData || !projectAdminData.user_id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في إنشاء المشرف')];
      }

      const existingProjectAdmin = await ProjectAdmin.findOne({ 
        where: {
          user_id: projectAdminData.user_id
        }
      });
      
      if (existingProjectAdmin) {
        return [null, resolveError(new Error('المشرف موجود بالفعل'), 'فشل في إنشاء المشرف')];
      }

      // حذف المشرف من التخزين المؤقت
      // await ProjectAdminCacheService.deleteProjectAdmin(null, projectAdminData.user_id);

      console.log(':X: Deleted project admin cache for user:', projectAdminData.user_id);

      const newProjectAdmin = await PGinsert(ProjectAdmin, projectAdminData);
      
      return [newProjectAdmin.data as ProjectAdminData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء المشرف')];
    }
  }

  /**
   * تحديث مشرف البوت
   * Update project admin
   * 
   * @param {string} id - معرف المشرف / Project Admin ID
   * @param {UpdateData} updateData - البيانات المحدثة / Updated data
   * @returns {ServiceResult<{ changedRows: number }>} [result, error]
   */
  static async update(id: string, updateData: UpdateData): ServiceResult<{ changedRows: number }> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المشرف مطلوب'), 'فشل في تحديث المشرف')];
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return [null, resolveError(new Error('بيانات التحديث مطلوبة'), 'فشل في تحديث المشرف')];
      }

      // التحقق من وجود المشرف
      const existingProjectAdmin = await PGselectAll(ProjectAdmin, { id });
      if (!existingProjectAdmin || existingProjectAdmin.length === 0) {
        return [null, resolveError(new Error('المشرف غير موجود'), 'فشل في تحديث المشرف')];
      }

      // إزالة المعرفات من بيانات التحديث إذا كانت موجودة
      const { id: _id, user_id: _userId, ...dataToUpdate } = updateData;
      if (Object.keys(dataToUpdate).length === 0) {
        return [null, resolveError(new Error('لا يوجد بيانات كافية للتحديث لان المعرفات لا يمكن تحديثها'), 'فشل في تحديث المشرف')];
      }

      const updatedProjectAdmin = await PGupdate(ProjectAdmin, dataToUpdate, { id });

      // Cache the updated project admin
      // await ProjectAdminCacheService.deleteProjectAdmin(id, existingProjectAdmin[0].user_id);  
      
      return [updatedProjectAdmin, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث المشرف')];
    }
  }

  /**
   * إضافة صلاحية لمشرف البوت
   * Add permission to project admin
   * 
   * @param {string} id - معرف المشرف / Project Admin ID
   * @param {string} permission - الصلاحية / Permission
   * @returns {ServiceResult<{ changedRows: number }>} [result, error]
   */
  static async addPermission(id: string, permission: string): ServiceResult<{ changedRows: number }> {
    try {
      if (!id || !permission) {
        return [null, resolveError(new Error('معرف المشرف والصلاحية مطلوبان'), 'فشل في إضافة الصلاحية')];
      }

      const existingProjectAdmin = await PGselectAll(ProjectAdmin, { id });
      if (!existingProjectAdmin || existingProjectAdmin.length === 0) {
        return [null, resolveError(new Error('المشرف غير موجود'), 'فشل في إضافة الصلاحية')];
      }

      const currentPermissions: string[] = (existingProjectAdmin[0].permissions as string[]) || [];
      
      if (currentPermissions.includes(permission)) {
        return [null, resolveError(new Error('الصلاحية موجودة بالفعل'), 'فشل في إضافة الصلاحية')];
      }

      const updatedPermissions = [...currentPermissions, permission];
      const result = await PGupdate(ProjectAdmin, { permissions: updatedPermissions }, { id });

      // Clear cache
      // await ProjectAdminCacheService.deleteProjectAdmin(id, existingProjectAdmin[0].user_id);

      return [result, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إضافة الصلاحية')];
    }
  }

  /**
   * إزالة صلاحية من مشرف البوت
   * Remove permission from project admin
   * 
   * @param {string} id - معرف المشرف / Project Admin ID
   * @param {string} permission - الصلاحية / Permission
   * @returns {ServiceResult<{ changedRows: number }>} [result, error]
   */
  static async removePermission(id: string, permission: string): ServiceResult<{ changedRows: number }> {
    try {
      if (!id || !permission) {
        return [null, resolveError(new Error('معرف المشرف والصلاحية مطلوبان'), 'فشل في إزالة الصلاحية')];
      }

      const existingProjectAdmin = await PGselectAll(ProjectAdmin, { id });
      if (!existingProjectAdmin || existingProjectAdmin.length === 0) {
        return [null, resolveError(new Error('المشرف غير موجود'), 'فشل في إزالة الصلاحية')];
      }

      const currentPermissions: string[] = (existingProjectAdmin[0].permissions as string[]) || [];
      const updatedPermissions = currentPermissions.filter((p: string) => p !== permission);

      const result = await PGupdate(ProjectAdmin, { permissions: updatedPermissions }, { id });

      // Clear cache
      // await ProjectAdminCacheService.deleteProjectAdmin(id, existingProjectAdmin[0].user_id);

      return [result, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إزالة الصلاحية')];
    }
  }

  /**
   * حذف مشرف البوت
   * Delete project admin
   * 
   * @param {string} id - معرف المشرف / Project Admin ID
   * @returns {ServiceResult<ProjectAdminData>} [result, error]
   */
  static async delete(id: string): ServiceResult<ProjectAdminData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المشرف مطلوب'), 'فشل في حذف المشرف')];
      }

      // Check if project admin exists
      const existingProjectAdmin = await PGselectAll(ProjectAdmin, { id });
      
      if (existingProjectAdmin && existingProjectAdmin.length > 0) {
        // Clear cache
        // await ProjectAdminCacheService.deleteProjectAdmin(id, existingProjectAdmin[0].user_id);
      }

      await PGdelete(ProjectAdmin, { id });
      
      return [existingProjectAdmin[0] as ProjectAdminData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف المشرف')];
    }
  }

  /**
   * التحقق من وجود صلاحية لمشرف البوت
   * Check if project admin has permission
   * 
   * @param {string} userId - معرف المستخدم / User ID
   * @param {string} permission - الصلاحية / Permission
   * @returns {ServiceResult<boolean>} [result, error]
   */
  static async hasPermission(userId: string, permission: string): ServiceResult<boolean> {
    try {
      if (!userId || !permission) {
        return [false, null];
      }

      const [projectAdmin, error] = await this.getByUserId(userId);
      
      if (error || !projectAdmin) {
        return [false, null];
      }

      const hasPermission = projectAdmin.permissions?.includes(permission) || false;
      
      return [hasPermission, null];
    } catch (error) {
      return [false, resolveError(error as Error, 'فشل في التحقق من الصلاحية')];
    }
  }
}

export default ProjectAdminsService;
export type { ProjectAdminData, QueryOptions, UpdateData };
