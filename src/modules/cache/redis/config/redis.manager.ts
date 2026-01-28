import RedisQueueBatchManager from './redis.config.js';
import type Redis from 'ioredis';
import { redis as redisConfig } from '../../../../config/database.config.js';

/**
 * التحقق من توفر Redis
 */
const isRedisAvailable = redisConfig.available;
console.log(`🔧 Redis Available: ${isRedisAvailable}`);

/**
 * In-Memory Cache كبديل عند عدم توفر Redis
 */
interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * تنظيف المفاتيح المنتهية الصلاحية بشكل دوري
 */
let cleanupInterval: NodeJS.Timeout | null = null;

if (!isRedisAvailable) {
  console.log('⚠️ Redis is not available. Using in-memory cache as fallback.');
  
  // تنظيف المفاتيح المنتهية كل 60 ثانية
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        memoryCache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`🧹 Memory cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }, 60_000);
}

/**
 * إنشاء مدير Redis مع الإعدادات الافتراضية (فقط إذا كان Redis متاحاً)
 */
const queueManager = isRedisAvailable
  ? new RedisQueueBatchManager({
      batchInterval: 500, // 500ms for SET/DEL
      getBatchInterval: 25, // 25ms for GET
      maxBatchSize: 100_000,
      getMaxBatchSize: 20_000,
      enableMetrics: true,
    })
  : null;

/**
 * Redis Client للعمليات المباشرة
 */
const redisClient: Redis | null = queueManager?.getRedisClient() ?? null;

// مراقبة الأحداث (فقط إذا كان Redis متاحاً)
if (queueManager) {
  queueManager.on('batchProcessed', (data) => {
    if (data.operations > 100) {
      console.log(`📊 Batch processed: ${data.operations} operations in ${data.processingTime.toFixed(2)}ms`);
    }
  });

  queueManager.on('error', (error) => {
    console.error('❌ Redis Queue Manager Error:', error.message);
  });
}

/**
 * تخزين قيمة في Cache
 * @param key - المفتاح
 * @param value - القيمة (string, number, object)
 * @param ttl - مدة الحياة بالثواني (افتراضي: 3600)
 */
function cacheSet<T>(key: string, value: T, ttl: number = 3600): void {
  if (!isRedisAvailable) {
    const expiresAt = Date.now() + ttl * 1000;
    memoryCache.set(key, { value, expiresAt });
    return;
  }
  queueManager!.queueSet(key, value, ttl);
}

/**
 * تخزين قيمة في Cache مع انتظار النتيجة
 * @param key - المفتاح
 * @param value - القيمة
 * @param ttl - مدة الحياة بالثواني
 * @returns Promise<string>
 */
async function cacheSetAsync<T>(key: string, value: T, ttl: number = 3600): Promise<string> {
  if (!isRedisAvailable) {
    const expiresAt = Date.now() + ttl * 1000;
    memoryCache.set(key, { value, expiresAt });
    return 'OK';
  }
  return queueManager!.queueSet(key, value, ttl);
}

/**
 * حذف قيمة من Cache
 * @param key - المفتاح
 */
function cacheDelete(key: string): void {
  if (!isRedisAvailable) {
    memoryCache.delete(key);
    return;
  }
  queueManager!.queueDel(key);
}

/**
 * حذف قيمة من Cache مع انتظار النتيجة
 * @param key - المفتاح
 * @returns Promise<number>
 */
async function cacheDeleteAsync(key: string): Promise<number> {
  if (!isRedisAvailable) {
    const existed = memoryCache.has(key);
    memoryCache.delete(key);
    return existed ? 1 : 0;
  }
  return queueManager!.queueDel(key);
}

/**
 * الحصول على قيمة من Cache
 * @param key - المفتاح
 * @returns Promise<T | null>
 */
async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!isRedisAvailable) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    
    // التحقق من انتهاء الصلاحية
    if (entry.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  return queueManager!.queueGet<T>(key);
}

/**
 * الحصول على إحصائيات Cache
 */
function getCacheMetrics() {
  if (!isRedisAvailable) {
    return {
      type: 'memory',
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys()),
    };
  }
  return queueManager!.getMetrics();
}

/**
 * إغلاق اتصال Redis
 */
async function shutdownCache(): Promise<void> {
  if (!isRedisAvailable) {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    memoryCache.clear();
    console.log('🧹 Memory cache cleared and cleanup stopped.');
    return;
  }
  await queueManager!.shutdown();
}

export {
  cacheSet,
  cacheSetAsync,
  cacheDelete,
  cacheDeleteAsync,
  cacheGet,
  getCacheMetrics,
  shutdownCache,
  redisClient,
  queueManager,
  isRedisAvailable,
  memoryCache,
};

export default {
  cacheSet,
  cacheSetAsync,
  cacheDelete,
  cacheDeleteAsync,
  cacheGet,
  getCacheMetrics,
  shutdownCache,
  redisClient,
  isRedisAvailable,
};
