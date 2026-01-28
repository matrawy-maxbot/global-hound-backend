import { Response, NextFunction } from 'express';
import UsersService from '../../../../database/postgreSQL/services/users.service.js';
import { type QueryOptions } from '../../../../database/postgreSQL/services/users.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { resolveDatabaseResult } from '../../../../../utils/object.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة المستخدمين - Users Controller
 * يحتوي على جميع العمليات المتعلقة بإدارة المستخدمين
 * Contains all operations related to users management
 */

/**
 * الحصول على جميع المستخدمين
 * Get all users
 */
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, offset, order, search, auth_provider } = req.query as {
      limit?: string;
      offset?: string;
      order?: string;
      search?: string;
      auth_provider?: string;
    };

    const options: QueryOptions = {
      ...(limit && { limit: Math.min(parseInt(limit), 200) }),
      ...(offset && { offset: parseInt(offset) }),
      ...(order && { order: JSON.parse(order) })
    };

    const [users, error] = await UsersService.getAll(options);
    const [totalCount, countError] = await UsersService.count();

    if (error || countError) {
      res.status(500);
      return next(error || countError);
    }

    let filteredUsers = users || [];

    // تصفية حسب البحث
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.display_name?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower)
      );
    }

    // تصفية حسب نوع المصادقة
    if (auth_provider && auth_provider !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.auth_provider === auth_provider);
    }

    const result = resolveDatabaseResult(filteredUsers);
    const currentLimit = limit ? Math.min(parseInt(limit), 200) : filteredUsers.length;
    const count = totalCount || 0;
    const nextOffset = offset ? parseInt(offset) + currentLimit : currentLimit;
    const left = Math.max(0, count - nextOffset);

    send(res, { 
      success: true, 
      data: result, 
      count,
      nextOffset,
      left
    }, 'تم جلب المستخدمين بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على مستخدم بواسطة المعرف
 * Get user by ID
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [user, error] = await UsersService.getById(id);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!user) {
      send(res, { success: false, data: null }, 'المستخدم غير موجود', 404);
      return;
    }

    const result = resolveDatabaseResult(user);
    send(res, { success: true, data: result }, 'تم جلب المستخدم بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على مستخدم بواسطة البريد الإلكتروني
 * Get user by email
 */
export const getUserByEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = req.params.email as string;

    const [user, error] = await UsersService.getByEmail(email);

    if (error) {
      res.status(500);
      return next(error);
    }

    if (!user) {
      send(res, { success: false, data: null }, 'المستخدم غير موجود', 404);
      return;
    }

    const result = resolveDatabaseResult(user);
    send(res, { success: true, data: result }, 'تم جلب المستخدم بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تحديث مستخدم
 * Update user
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    const [result, error] = await UsersService.update(id, updateData);

    if (error) {
      console.log('Error updating user:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: result }, 'تم تحديث المستخدم بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * حذف مستخدم
 * Delete user
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [result, error] = await UsersService.delete(id);

    if (error) {
      console.log('Error deleting user:', error);
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: null }, 'تم حذف المستخدم بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
