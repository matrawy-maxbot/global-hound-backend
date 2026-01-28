import { cacheSet, cacheGet, cacheDelete, cacheSetAsync, cacheDeleteAsync } from '../config/redis.manager.js';

/**
 * Base Cache Repository
 * يوفر عمليات CRUD أساسية مع prefix للمفاتيح
 */
class BaseIDCache<T = unknown> {
  private readonly byIdPrefix: string;

  constructor(byIdPrefix: string) {
    this.byIdPrefix = byIdPrefix;
  }

  /**
   * الحصول على المفتاح الكامل
   */
  private getKey(id: string | number): string {
    return `${this.byIdPrefix}${String(id)}`;
  }

  /**
   * تخزين قيمة (بدون انتظار)
   * @param id - المعرف
   * @param data - البيانات
   * @param ttl - مدة الحياة بالثواني
   */
  set(id: string | number, data: T, ttl: number = 3600): void {
    if (data === null || data === undefined) return;
    cacheSet(this.getKey(id), data, ttl);
  }

  /**
   * تخزين قيمة مع انتظار النتيجة
   * @param id - المعرف
   * @param data - البيانات
   * @param ttl - مدة الحياة بالثواني
   */
  async setAsync(id: string | number, data: T, ttl: number = 3600): Promise<string | null> {
    if (data === null || data === undefined) return null;
    return cacheSetAsync(this.getKey(id), data, ttl);
  }

  /**
   * الحصول على قيمة
   * @param id - المعرف
   */
  async get(id: string | number): Promise<T | null> {
    return cacheGet<T>(this.getKey(id));
  }

  /**
   * حذف قيمة (بدون انتظار)
   * @param id - المعرف
   */
  delete(id: string | number): void {
    cacheDelete(this.getKey(id));
  }

  /**
   * حذف قيمة مع انتظار النتيجة
   * @param id - المعرف
   */
  async deleteAsync(id: string | number): Promise<number> {
    return cacheDeleteAsync(this.getKey(id));
  }

  /**
   * التحقق من وجود قيمة
   * @param id - المعرف
   */
  async exists(id: string | number): Promise<boolean> {
    const value = await this.get(id);
    return value !== null;
  }

  /**
   * الحصول على قيمة أو تنفيذ callback إذا لم تكن موجودة
   * @param id - المعرف
   * @param fetchFn - دالة لجلب البيانات إذا لم تكن في Cache
   * @param ttl - مدة الحياة بالثواني
   */
  async getOrSet(
    id: string | number,
    fetchFn: () => Promise<T | null>,
    ttl: number = 3600
  ): Promise<T | null> {
    const cached = await this.get(id);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    
    if (data !== null && data !== undefined) {
      this.set(id, data, ttl);
    }

    return data;
  }
}

export default BaseIDCache;
export { BaseIDCache };
