import { Response, NextFunction } from 'express';
import ProjectAdminsService from '../../../../database/postgreSQL/services/projectAdmins.service.js';
import { type ProjectAdminData, type QueryOptions } from '../../../../database/postgreSQL/services/projectAdmins.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { resolveDatabaseResult } from '../../../../../utils/object.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة مشرفي المشاريع - Project Admins Controller
 * يحتوي على جميع العمليات المتعلقة بإدارة مشرفي المشاريع
 * Contains all operations related to project admins management
 */

/**
 * الحصول على جميع مشرفي المشاريع
 * Get all project admins
 */
export const getAllProjectAdmins = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, offset, order } = req.query as {
      limit?: string;
      offset?: string;
      order?: string;
    };

    const options: QueryOptions = {
      ...(limit && { limit: Math.min(parseInt(limit), 200) }),
      ...(offset && { offset: parseInt(offset) }),
      ...(order && { order: JSON.parse(order) })
    };

    const [projectAdmins, error] = await ProjectAdminsService.getAll(options);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(projectAdmins);

    send(res, { success: true, data: result }, 'تم جلب مشرفي المشاريع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على مشرف مشروع بواسطة المعرف
 * Get project admin by ID
 */
export const getProjectAdminById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [projectAdmin, error] = await ProjectAdminsService.getById(id);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!projectAdmin) {
      send(res, { success: false, data: null }, 'مشرف المشروع غير موجود', 404);
      return;
    }

    const result = resolveDatabaseResult(projectAdmin);
    send(res, { success: true, data: result }, 'تم جلب مشرف المشروع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على مشرف المشروع بواسطة معرف المستخدم
 * Get project admin by user ID
 */
export const getProjectAdminByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const [projectAdmin, error] = await ProjectAdminsService.getByUserId(userId);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!projectAdmin) {
      send(res, { success: false, data: null }, 'مشرف المشروع غير موجود', 404);
      return;
    }

    const result = resolveDatabaseResult(projectAdmin);
    send(res, { success: true, data: result }, 'تم جلب مشرف المشروع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على مشرفي المشاريع بواسطة الصلاحية
 * Get project admins by permission
 */
export const getProjectAdminsByPermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const permission = req.params.permission as string;

    const [projectAdmins, error] = await ProjectAdminsService.getByPermission(permission);

    if (error) {
      res.status(500);
      return next(error);
    }

    const result = resolveDatabaseResult(projectAdmins);
    send(res, { success: true, data: result }, 'تم جلب مشرفي المشاريع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إنشاء مشرف مشروع جديد
 * Create new project admin
 */
export const createProjectAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectAdminData: ProjectAdminData = {
      user_id: req.body.user_id,
      permissions: req.body.permissions ?? []
    };
    
    const [projectAdmin, error] = await ProjectAdminsService.create(projectAdminData);
    
    if (error) {
         console.log('Error creating project admin:', error);
         res.status(400);
         return next(error);
     }

     if (!projectAdmin) {
          send(res, { success: false, data: null }, 'فشل في إنشاء مشرف المشروع', 400);
          return;
     }

    const result = resolveDatabaseResult(projectAdmin);

    send(res, { success: true, data: result }, 'تم إنشاء مشرف المشروع بنجاح', 201);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تحديث مشرف المشروع
 * Update project admin
 */
export const updateProjectAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    const [result, error] = await ProjectAdminsService.update(id, updateData);

    if (error) {
      console.log('Error updating project admin:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تحديث مشرف المشروع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إضافة صلاحية لمشرف المشروع
 * Add permission to project admin
 */
export const addPermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { permission } = req.body;

    const [result, error] = await ProjectAdminsService.addPermission(id, permission);

    if (error) {
      console.log('Error adding permission:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إضافة الصلاحية بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إزالة صلاحية من مشرف المشروع
 * Remove permission from project admin
 */
export const removePermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { permission } = req.body;

    const [result, error] = await ProjectAdminsService.removePermission(id, permission);

    if (error) {
      console.log('Error removing permission:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم إزالة الصلاحية بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * التحقق من وجود صلاحية للمستخدم
 * Check if user has permission
 */
export const checkUserPermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const permission = req.params.permission as string;

    const [hasPermission, error] = await ProjectAdminsService.hasPermission(userId, permission);

    if (error) {
      res.status(500);
      return next(error);
    }

    send(res, { success: true, data: { hasPermission } }, 'تم التحقق من الصلاحية بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * حذف مشرف المشروع
 * Delete project admin
 */
export const deleteProjectAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await ProjectAdminsService.delete(id);

    if (error) {
      console.log('Error deleting project admin:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: null }, 'تم حذف مشرف المشروع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
