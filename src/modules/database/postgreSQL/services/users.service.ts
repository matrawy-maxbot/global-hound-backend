import { FindOptions, Order } from 'sequelize';
import { PGinsert, PGupdate, PGdelete } from '../config/postgre.manager.js';
import { User } from '../models/index.js';
import { AuthProvider } from '../models/User.model.js';
import { resolveError } from '../../../../utils/errors/errorResolver.util.js';

// ===================== Types =====================

interface UserData {
  id?: string;
  email: string;
  password_hash?: string;
  auth_provider: AuthProvider;
  google_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  email_verified?: boolean;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

interface LocalRegistrationData {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

interface GoogleRegistrationData {
  email: string;
  google_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: Order;
}

interface UpdateData {
  email?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  email_verified?: boolean;
  google_id?: string;
  [key: string]: unknown;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

// ===================== Service Class =====================

/**
 * خدمة إدارة المستخدمين - Users Service
 */
class UsersService {

  // ===================== Query Methods =====================

  /**
   * الحصول على جميع المستخدمين
   */
  static async getAll(options: QueryOptions = {}): ServiceResult<UserData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC'], ['id', 'ASC']] } = options;
      
      const queryOptions: FindOptions = {
        order,
        attributes: { exclude: ['password_hash'] },
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const users = await User.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const usersData = users.map(user => (user.toJSON ? user.toJSON() : user) as UserData);
      return [usersData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المستخدمين')];
    }
  }

  /**
   * الحصول على مستخدم بواسطة المعرف
   */
  static async getById(id: string, includePassword: boolean = false): ServiceResult<UserData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في جلب المستخدم')];
      }

      const queryOptions: FindOptions = {
        where: { id },
        ...(!includePassword && { attributes: { exclude: ['password_hash'] } })
      };

      const user = await User.findOne(queryOptions);
      // تحويل Sequelize Model إلى plain object
      const userData = user ? (user.toJSON ? user.toJSON() : user) as UserData : null;
      return [userData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المستخدم')];
    }
  }

  /**
   * الحصول على مستخدم بواسطة البريد الإلكتروني
   */
  static async getByEmail(email: string, includePassword: boolean = false): ServiceResult<UserData> {
    try {
      if (!email) {
        return [null, resolveError(new Error('البريد الإلكتروني مطلوب'), 'فشل في جلب المستخدم')];
      }

      const queryOptions: FindOptions = {
        where: { email: email.toLowerCase() },
        ...(!includePassword && { attributes: { exclude: ['password_hash'] } })
      };

      const user = await User.findOne(queryOptions);
      // تحويل Sequelize Model إلى plain object
      const userData = user ? (user.toJSON ? user.toJSON() : user) as UserData : null;
      return [userData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المستخدم')];
    }
  }

  /**
   * الحصول على مستخدم بواسطة معرف Google
   */
  static async getByGoogleId(googleId: string): ServiceResult<UserData> {
    try {
      if (!googleId) {
        return [null, resolveError(new Error('معرف Google مطلوب'), 'فشل في جلب المستخدم')];
      }

      const user = await User.findOne({
        where: { google_id: googleId },
        attributes: { exclude: ['password_hash'] }
      });

      // تحويل Sequelize Model إلى plain object
      const userData = user ? (user.toJSON ? user.toJSON() : user) as UserData : null;
      return [userData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المستخدم')];
    }
  }

  // ===================== Registration Methods =====================

  /**
   * تسجيل مستخدم جديد عبر البريد الإلكتروني وكلمة المرور
   */
  static async registerLocal(data: LocalRegistrationData): ServiceResult<UserData> {
    try {
      const { email, password_hash, first_name, last_name, display_name } = data;

      if (!email || !password_hash) {
        return [null, resolveError(new Error('البريد الإلكتروني وكلمة المرور مطلوبان'), 'فشل في التسجيل')];
      }

      // التحقق من عدم وجود المستخدم مسبقاً
      const [existingUser] = await this.getByEmail(email);
      if (existingUser) {
        return [null, resolveError(new Error('البريد الإلكتروني مستخدم بالفعل'), 'فشل في التسجيل')];
      }

      const userData: UserData = {
        email: email.toLowerCase(),
        password_hash,
        auth_provider: AuthProvider.LOCAL,
        first_name,
        last_name,
        display_name: display_name || first_name || email.split('@')[0],
        email_verified: false
      };

      const result = await PGinsert(User, userData);
      const userResponse = { ...(result.data as Record<string, unknown>) } as UserData;
      delete userResponse.password_hash;

      return [userResponse, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في التسجيل')];
    }
  }

  /**
   * تسجيل أو تسجيل دخول مستخدم عبر Google OAuth2
   */
  static async registerOrLoginGoogle(data: GoogleRegistrationData): ServiceResult<{ user: UserData; isNewUser: boolean }> {
    try {
      const { email, google_id, first_name, last_name, display_name, avatar_url } = data;

      if (!email || !google_id) {
        return [null, resolveError(new Error('البريد الإلكتروني ومعرف Google مطلوبان'), 'فشل في التسجيل')];
      }

      // البحث عن مستخدم موجود بنفس Google ID
      let [existingUser] = await this.getByGoogleId(google_id);
      
      if (existingUser) {
        return [{ user: existingUser, isNewUser: false }, null];
      }

      // البحث عن مستخدم بنفس البريد الإلكتروني
      [existingUser] = await this.getByEmail(email);
      
      if (existingUser) {
        // إذا كان المستخدم مسجل محلياً، ربط حساب Google
        if (existingUser.auth_provider === AuthProvider.LOCAL) {
          await this.update(existingUser.id!, {
            google_id,
            avatar_url: avatar_url || existingUser.avatar_url,
            email_verified: true
          });
          const [updatedUser] = await this.getById(existingUser.id!);
          return [{ user: updatedUser!, isNewUser: false }, null];
        }
        return [null, resolveError(new Error('البريد الإلكتروني مستخدم بالفعل'), 'فشل في التسجيل')];
      }

      // إنشاء مستخدم جديد
      const userData: UserData = {
        email: email.toLowerCase(),
        auth_provider: AuthProvider.GOOGLE,
        google_id,
        first_name,
        last_name,
        display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0],
        avatar_url,
        email_verified: true
      };

      const result = await PGinsert(User, userData);
      const userResponse = { ...(result.data as Record<string, unknown>) } as UserData;
      delete userResponse.password_hash;

      return [{ user: userResponse, isNewUser: true }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في التسجيل عبر Google')];
    }
  }

  // ===================== Update Methods =====================

  /**
   * تحديث بيانات المستخدم
   */
  static async update(id: string, data: UpdateData): ServiceResult<UserData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في التحديث')];
      }

      await PGupdate(User, data, { id });
      const [updatedUser] = await this.getById(id);
      return [updatedUser, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في التحديث')];
    }
  }

  /**
   * تحديث كلمة المرور
   */
  static async updatePassword(id: string, newPasswordHash: string): ServiceResult<boolean> {
    try {
      if (!id || !newPasswordHash) {
        return [null, resolveError(new Error('معرف المستخدم وكلمة المرور مطلوبان'), 'فشل في تحديث كلمة المرور')];
      }

      await PGupdate(User, { password_hash: newPasswordHash }, { id });
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث كلمة المرور')];
    }
  }

  /**
   * تفعيل البريد الإلكتروني
   */
  static async verifyEmail(id: string): ServiceResult<boolean> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في تفعيل البريد')];
      }

      await PGupdate(User, { email_verified: true }, { id });
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تفعيل البريد')];
    }
  }

  // ===================== Count Methods =====================

  /**
   * عدد المستخدمين
   * Count users
   */
  static async count(): ServiceResult<number> {
    try {
      const count = await User.count();
      return [count, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في عد المستخدمين')];
    }
  }

  // ===================== Delete Methods =====================

  /**
   * حذف مستخدم
   */
  static async delete(id: string): ServiceResult<boolean> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في حذف المستخدم')];
      }

      await PGdelete(User, { id });
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف المستخدم')];
    }
  }
}

export default UsersService;
export type { UserData, LocalRegistrationData, GoogleRegistrationData, QueryOptions, UpdateData };
