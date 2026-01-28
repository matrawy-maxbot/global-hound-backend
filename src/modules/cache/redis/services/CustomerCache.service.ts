import BaseIDCache from '../repositories/baseID.repository.js';

/**
 * بيانات العميل المخزنة
 */
interface CustomerCacheData {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  cachedAt: number;
}

/**
 * خدمة Cache للعملاء
 * تُستخدم لتقليل طلبات Stripe API
 */
const CUSTOMER_BY_ID_PREFIX = 'stripe:customer:id:';
const CUSTOMER_TTL = 15 * 60; // 15 دقيقة

const customerByIdCache = new BaseIDCache<CustomerCacheData>(CUSTOMER_BY_ID_PREFIX);

class CustomerCacheService {
  /**
   * تخزين بيانات العميل
   */
  static set(customer: CustomerCacheData, ttl: number = CUSTOMER_TTL): void {
    const data: CustomerCacheData = {
      ...customer,
      cachedAt: Date.now(),
    };
    // تخزين بواسطة ID
    customerByIdCache.set(customer.id, data, ttl);
  }

  /**
   * الحصول على عميل بواسطة ID
   */
  static async getById(customerId: string): Promise<CustomerCacheData | null> {
    return customerByIdCache.get(customerId);
  }

  /**
   * حذف عميل من Cache
   */
  static async delete(customerId: string): Promise<void> {
    customerByIdCache.delete(customerId);
  }
}

export default CustomerCacheService;
export { CustomerCacheService, CustomerCacheData, CUSTOMER_BY_ID_PREFIX, CUSTOMER_TTL };
