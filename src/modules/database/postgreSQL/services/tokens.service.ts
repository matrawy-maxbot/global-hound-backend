import { Op, FindOptions, Order } from 'sequelize';
import { PGinsert, PGupdate, PGdelete, PGselectAll } from '../config/postgre.manager.js';
import { Token } from '../models/index.js';
import { TokenType } from '../models/Token.model.js';
import { resolveError } from '../../../../utils/errors/errorResolver.util.js';
// import { TokenCacheService } from '../../../cache/redis/index.js';

// ===================== Types =====================

interface TokenData {
  id?: string;
  token: string;
  type: TokenType;
  refresh_token?: string;
  expires_at: Date;
  used: boolean;
  ip_address?: string;
  user_agent?: string;
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
  token?: string;
  type?: TokenType;
  refresh_token?: string;
  expires_at?: Date;
  used?: boolean;
  ip_address?: string;
  user_agent?: string;
  [key: string]: unknown;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

// ===================== Service Class =====================

/**
 * خدمة إدارة التوكنات - Tokens Service
 * تحتوي على جميع العمليات المتعلقة بإدارة التوكنات للمصادقة والتحقق
 * Contains all operations related to tokens management for authentication and verification
 */
class TokensService {
  
  /**
   * الحصول على جميع التوكنات
   * Get all tokens
   * 
   * @param {QueryOptions} options - خيارات الاستعلام / Query options
   * @returns {ServiceResult<TokenData[]>} [result, error]
   */
  static async getAll(options: QueryOptions = {}): ServiceResult<TokenData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const tokens = await Token.findAll(queryOptions);
      
      // تحويل Sequelize Models إلى plain objects
      const tokensData = tokens.map(token => (token.toJSON ? token.toJSON() : token) as TokenData);
      return [tokensData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكنات')];
    }
  }

  /**
   * الحصول على التوكن بواسطة المعرف
   * Get token by ID
   * 
   * @param {string} id - معرف التوكن / Token ID
   * @returns {ServiceResult<TokenData>} [result, error]
   */
  static async getById(id: string): ServiceResult<TokenData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف التوكن مطلوب'), 'فشل في جلب التوكن')];
      }

      // Check cache first
      // const cachedToken = await TokenCacheService.getTokenById(id);
      // if (cachedToken) {
      //   return [cachedToken, null];
      // }

      const tokens = await PGselectAll(Token, { id });

      // Cache the result if found
      // if (tokens[0]) {
      //   await TokenCacheService.setTokenById(id, tokens[0]);
      // }

      return [tokens[0] as TokenData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكن')];
    }
  }

  /**
   * الحصول على التوكن بواسطة قيمته
   * Get token by token value
   * 
   * @param {string} token - قيمة التوكن / Token value
   * @returns {ServiceResult<TokenData>} [result, error]
   */
  static async getByToken(token: string): ServiceResult<TokenData> {
    try {
      if (!token) {
        return [null, resolveError(new Error('قيمة التوكن مطلوبة'), 'فشل في جلب التوكن')];
      }

      // Check cache first
      // const cachedToken = await TokenCacheService.getTokenByValue(token);
      // if (cachedToken) {
      //   return [cachedToken, null];
      // }

      const tokens = await PGselectAll(Token, { token });

      // Cache the result if found
      // if (tokens[0]) {
      //   await TokenCacheService.setTokenByValue(token, tokens[0]);
      // }

      return [tokens[0] as TokenData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكن')];
    }
  }

  /**
   * الحصول على التوكنات بواسطة refresh token
   * Get tokens by refresh token
   * 
   * @param {string} refreshToken - قيمة refresh token
   * @returns {ServiceResult<TokenData[]>} [result, error]
   */
  static async getByRefreshToken(refreshToken: string): ServiceResult<TokenData[]> {
    try {
      if (!refreshToken) {
        return [null, resolveError(new Error('refresh token مطلوب'), 'فشل في جلب التوكنات')];
      }

      const tokens = await PGselectAll(Token, { refresh_token: refreshToken });

      return [tokens as TokenData[], null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكنات')];
    }
  }

  /**
   * الحصول على التوكنات بواسطة النوع
   * Get tokens by type
   * 
   * @param {TokenType} type - نوع التوكن / Token type
   * @returns {ServiceResult<TokenData[]>} [result, error]
   */
  static async getByType(type: TokenType): ServiceResult<TokenData[]> {
    try {
      if (!type) {
        return [null, resolveError(new Error('نوع التوكن مطلوب'), 'فشل في جلب التوكنات')];
      }

      const tokens = await PGselectAll(Token, { type });

      return [tokens as TokenData[], null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكنات')];
    }
  }

  /**
   * إنشاء توكن جديد
   * Create new token
   * 
   * @param {TokenData} tokenData - بيانات التوكن / Token data
   * @returns {ServiceResult<TokenData>} [result, error]
   */
  static async create(tokenData: TokenData): ServiceResult<TokenData> {
    try {
      if (!tokenData || !tokenData.token || !tokenData.type || !tokenData.expires_at) {
        return [null, resolveError(new Error('بيانات التوكن والنوع وتاريخ الانتهاء مطلوبة'), 'فشل في إنشاء التوكن')];
      }

      // التحقق من أن access tokens لديها refresh_token
      if (tokenData.type === TokenType.ACCESS && !tokenData.refresh_token) {
        return [null, resolveError(new Error('access tokens يجب أن تحتوي على refresh_token'), 'فشل في إنشاء التوكن')];
      }

      const existingToken = await Token.findOne({ 
        where: {
          token: tokenData.token
        }
      });
      
      if (existingToken) {
        return [null, resolveError(new Error('التوكن موجود بالفعل'), 'فشل في إنشاء التوكن')];
      }

      // حذف التوكن من التخزين المؤقت
      // await TokenCacheService.deleteToken(null, tokenData.token);

      console.log(':X: Deleted token cache for token:', tokenData.token);

      const newToken = await PGinsert(Token, tokenData);
      
      return [newToken.data as TokenData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء التوكن')];
    }
  }

  /**
   * تحديث التوكن
   * Update token
   * 
   * @param {string} id - معرف التوكن / Token ID
   * @param {UpdateData} updateData - البيانات المحدثة / Updated data
   * @returns {ServiceResult<{ changedRows: number }>} [result, error]
   */
  static async update(id: string, updateData: UpdateData): ServiceResult<{ changedRows: number }> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف التوكن مطلوب'), 'فشل في تحديث التوكن')];
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return [null, resolveError(new Error('بيانات التحديث مطلوبة'), 'فشل في تحديث التوكن')];
      }

      // التحقق من وجود التوكن
      const existingToken = await PGselectAll(Token, { id });
      if (!existingToken || existingToken.length === 0) {
        return [null, resolveError(new Error('التوكن غير موجود'), 'فشل في تحديث التوكن')];
      }

      // إزالة المعرف من بيانات التحديث إذا كان موجوداً
      const { id: _id, token: _token, ...dataToUpdate } = updateData;
      if (Object.keys(dataToUpdate).length === 0) {
        return [null, resolveError(new Error('لا يوجد بيانات كافية للتحديث لان المعرفات لا يمكن تحديثها'), 'فشل في تحديث التوكن')];
      }

      const updatedToken = await PGupdate(Token, dataToUpdate, { id });

      // Clear cache
      // await TokenCacheService.deleteToken(id, existingToken[0].token);  
      
      return [updatedToken, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث التوكن')];
    }
  }

  /**
   * وضع علامة استخدام على التوكن
   * Mark token as used
   * 
   * @param {string} id - معرف التوكن / Token ID
   * @returns {ServiceResult<{ changedRows: number }>} [result, error]
   */
  static async markAsUsed(id: string): ServiceResult<{ changedRows: number }> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف التوكن مطلوب'), 'فشل في تحديث التوكن')];
      }

      const result = await this.update(id, { used: true });
      
      return result;
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث التوكن')];
    }
  }

  /**
   * حذف التوكن
   * Delete token
   * 
   * @param {string} id - معرف التوكن / Token ID
   * @returns {ServiceResult<TokenData>} [result, error]
   */
  static async delete(id: string): ServiceResult<TokenData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف التوكن مطلوب'), 'فشل في حذف التوكن')];
      }

      // Check if token exists
      const existingToken = await PGselectAll(Token, { id });
      
      if (existingToken && existingToken.length > 0) {
        // Clear cache
        // await TokenCacheService.deleteToken(id, existingToken[0].token);
      }

      await PGdelete(Token, { id });
      
      return [existingToken[0] as TokenData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف التوكن')];
    }
  }

  /**
   * حذف التوكنات المنتهية
   * Delete expired tokens
   * 
   * @returns {ServiceResult<number>} [result, error]
   */
  static async deleteExpired(): ServiceResult<number> {
    try {
      const result = await Token.destroy({
        where: {
          expires_at: {
            [Op.lt]: new Date()
          }
        }
      });

      console.log(`Deleted ${result} expired tokens`);
      
      return [result, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف التوكنات المنتهية')];
    }
  }

  /**
   * حذف جميع التوكنات المرتبطة بـ refresh token
   * Delete all tokens associated with refresh token
   * 
   * @param {string} refreshToken - قيمة refresh token
   * @returns {ServiceResult<number>} [result, error]
   */
  static async deleteByRefreshToken(refreshToken: string): ServiceResult<number> {
    try {
      if (!refreshToken) {
        return [null, resolveError(new Error('refresh token مطلوب'), 'فشل في حذف التوكنات')];
      }

      const result = await Token.destroy({
        where: {
          [Op.or]: [
            { refresh_token: refreshToken },
            { token: refreshToken }
          ]
        }
      });

      console.log(`Deleted ${result} tokens associated with refresh token`);
      
      return [result, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف التوكنات')];
    }
  }

  /**
   * التحقق من صلاحية التوكن
   * Validate token
   * 
   * @param {string} token - قيمة التوكن / Token value
   * @returns {ServiceResult<TokenData>} [result, error]
   */
  static async validateToken(token: string): ServiceResult<TokenData> {
    try {
      if (!token) {
        return [null, resolveError(new Error('قيمة التوكن مطلوبة'), 'التوكن غير صالح')];
      }

      const [tokenData, error] = await this.getByToken(token);
      
      if (error || !tokenData) {
        return [null, resolveError(new Error('التوكن غير موجود'), 'التوكن غير صالح')];
      }

      // التحقق من عدم استخدام التوكن
      if (tokenData.used) {
        return [null, resolveError(new Error('التوكن تم استخدامه بالفعل'), 'التوكن غير صالح')];
      }

      // التحقق من عدم انتهاء صلاحية التوكن
      if (new Date(tokenData.expires_at) < new Date()) {
        return [null, resolveError(new Error('انتهت صلاحية التوكن'), 'التوكن غير صالح')];
      }

      return [tokenData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في التحقق من التوكن')];
    }
  }

  /**
   * الحصول على التوكنات النشطة (غير المنتهية وغير المستخدمة)
   * Get active tokens (not expired and not used)
   * 
   * @param {TokenType} type - نوع التوكن (اختياري) / Token type (optional)
   * @returns {ServiceResult<TokenData[]>} [result, error]
   */
  static async getActiveTokens(type?: TokenType): ServiceResult<TokenData[]> {
    try {
      const whereClause: any = {
        expires_at: {
          [Op.gt]: new Date()
        },
        used: false
      };

      if (type) {
        whereClause.type = type;
      }

      const tokens = await Token.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });

      // تحويل Sequelize Models إلى plain objects
      const tokensData = tokens.map(token => (token.toJSON ? token.toJSON() : token) as TokenData);
      return [tokensData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب التوكنات النشطة')];
    }
  }
}

export default TokensService;
export type { TokenData, QueryOptions, UpdateData };
