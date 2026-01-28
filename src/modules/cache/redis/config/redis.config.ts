import Redis from 'ioredis';
import { redis } from '../../../../config/database.config.js';
import { EventEmitter } from 'events';

/**
 * خيارات مدير Redis
 */
export interface RedisQueueBatchManagerOptions {
  batchInterval?: number;
  getBatchInterval?: number;
  maxBatchSize?: number;
  getMaxBatchSize?: number;
  enableMetrics?: boolean;
}

/**
 * عملية في الطابور
 */
interface QueueOperation<T = unknown> {
  key: string;
  value?: string;
  ttl?: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * إحصائيات الأداء
 */
export interface QueueMetrics {
  totalSetOperations: number;
  totalGetOperations: number;
  totalDelOperations: number;
  totalBatches: number;
  averageBatchSize: number;
  lastBatchTime: number;
  totalProcessingTime: number;
}

/**
 * أحداث المدير
 */
export interface QueueManagerEvents {
  batchProcessed: (data: { operations: number; processingTime: number; timestamp: number }) => void;
  error: (error: Error) => void;
}

/**
 * مدير طوابير Redis مع دعم Batch Processing
 * يدعم عمليات SET, GET, DELETE مع Pipeline لتحسين الأداء
 */
class RedisQueueBatchManager extends EventEmitter {
  private batchInterval: number;
  private getBatchInterval: number;
  private maxBatchSize: number;
  private getMaxBatchSize: number;
  private enableMetrics: boolean;

  private setQueue: QueueOperation<string>[] = [];
  private getQueue: QueueOperation<unknown>[] = [];
  private delQueue: QueueOperation<number>[] = [];

  private metrics: QueueMetrics;
  private client: Redis;

  private isRunning: boolean = false;
  private setDelProcessingInterval: NodeJS.Timeout | null = null;
  private getProcessingInterval: NodeJS.Timeout | null = null;

  constructor(options: RedisQueueBatchManagerOptions = {}) {
    super();

    // إعدادات النظام
    this.batchInterval = options.batchInterval ?? 500;
    this.getBatchInterval = options.getBatchInterval ?? 50;
    this.maxBatchSize = options.maxBatchSize ?? 100000;
    this.getMaxBatchSize = options.getMaxBatchSize ?? 10000;
    this.enableMetrics = options.enableMetrics ?? true;

    // إحصائيات الأداء
    this.metrics = {
      totalSetOperations: 0,
      totalGetOperations: 0,
      totalDelOperations: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      lastBatchTime: 0,
      totalProcessingTime: 0,
    };

    // إنشاء اتصال Redis
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password || undefined,
      db: redis.db,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    // معالجة أحداث الاتصال
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('error', (error: Error) => {
      console.error('❌ Redis connection error:', error.message);
      this.emit('error', error);
    });

    // بدء المعالج الدوري
    this.startBatchProcessor();

    console.log(`🚀 Redis Queue Batch Manager initialized`);
    console.log(`   - SET/DEL interval: ${this.batchInterval}ms`);
    console.log(`   - GET interval: ${this.getBatchInterval}ms`);
  }

  /**
   * بدء المعالج الدوري للطوابير
   */
  startBatchProcessor(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    this.setDelProcessingInterval = setInterval(async () => {
      await this.processBatches(['set', 'del']);
    }, this.batchInterval);

    this.getProcessingInterval = setInterval(async () => {
      await this.processBatches(['get']);
    }, this.getBatchInterval);

    console.log(`⏰ Batch processor started`);
  }

  /**
   * إيقاف المعالج الدوري
   */
  stopBatchProcessor(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.setDelProcessingInterval) {
      clearInterval(this.setDelProcessingInterval);
      this.setDelProcessingInterval = null;
    }

    if (this.getProcessingInterval) {
      clearInterval(this.getProcessingInterval);
      this.getProcessingInterval = null;
    }

    console.log('⏹️ Batch processor stopped');
  }

  /**
   * تنظيف وضبط قيمة TTL
   */
  private sanitizeTtl(ttl: number): number {
    const DEFAULT_TTL = 3600; // 1 hour
    const MAX_TTL = 2147483647; // Redis EX max seconds

    if (!Number.isFinite(ttl)) return DEFAULT_TTL;

    const floored = Math.floor(ttl);
    if (floored < 1) return DEFAULT_TTL;

    return Math.min(floored, MAX_TTL);
  }

  /**
   * إضافة عملية SET إلى الطابور
   */
  queueSet(key: string, value: unknown, ttl: number = 3600): Promise<string> {
    return new Promise((resolve, reject) => {
      const sanitizedTtl = this.sanitizeTtl(ttl);
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      this.setQueue.push({
        key,
        value: stringValue,
        ttl: sanitizedTtl,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.metrics.totalSetOperations++;

      if (this.setQueue.length >= this.maxBatchSize) {
        this.processBatches(['set']);
      }
    });
  }

  /**
   * إضافة عملية GET إلى الطابور
   */
  queueGet<T = unknown>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.getQueue.push({
        key,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      });

      this.metrics.totalGetOperations++;

      if (this.getQueue.length >= this.getMaxBatchSize) {
        this.processBatches(['get']);
      }
    });
  }

  /**
   * إضافة عملية DELETE إلى الطابور
   */
  queueDel(key: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.delQueue.push({
        key,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.metrics.totalDelOperations++;

      if (this.delQueue.length >= this.maxBatchSize) {
        this.processBatches(['del']);
      }
    });
  }

  /**
   * معالجة جميع الطوابير
   */
  private async processBatches(operations: ('set' | 'get' | 'del')[] = ['set', 'del', 'get']): Promise<void> {
    if (!this.isRunning) return;

    const startTime = process.hrtime.bigint();
    let totalOperations = 0;

    try {
      if (this.setQueue.length > 0 && operations.includes('set')) {
        totalOperations += this.setQueue.length;
        await this.processSetBatch();
      }

      if (this.getQueue.length > 0 && operations.includes('get')) {
        totalOperations += this.getQueue.length;
        await this.processGetBatch();
      }

      if (this.delQueue.length > 0 && operations.includes('del')) {
        totalOperations += this.delQueue.length;
        await this.processDelBatch();
      }

      if (totalOperations > 0 && this.enableMetrics) {
        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        this.updateMetrics(totalOperations, processingTime);
        this.emit('batchProcessed', {
          operations: totalOperations,
          processingTime,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('❌ Error processing batches:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * معالجة دفعة عمليات SET
   */
  private async processSetBatch(): Promise<void> {
    if (this.setQueue.length === 0) return;

    const batch = this.setQueue.splice(0);
    const pipeline = this.client.pipeline();

    batch.forEach((operation) => {
      const ttlSeconds = this.sanitizeTtl(operation.ttl!);
      pipeline.set(operation.key, operation.value!, 'EX', ttlSeconds);
    });

    try {
      const results = await pipeline.exec();

      if (results) {
        results.forEach((result: [Error | null, unknown], index: number) => {
          const operation = batch[index];
          if (result[0] === null) {
            operation.resolve('OK');
          } else {
            operation.reject(new Error(String(result[0])));
          }
        });
      }
    } catch (error) {
      batch.forEach((operation) => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }

  /**
   * معالجة دفعة عمليات GET
   */
  private async processGetBatch(): Promise<void> {
    if (this.getQueue.length === 0) return;

    const batch = this.getQueue.splice(0);
    const pipeline = this.client.pipeline();

    batch.forEach((operation) => {
      pipeline.get(operation.key);
    });

    try {
      const results = await pipeline.exec();

      if (results) {
        results.forEach((result: [Error | null, unknown], index: number) => {
          const operation = batch[index];
          if (result[0] === null) {
            let value = result[1];
            // محاولة تحويل JSON
            if (typeof value === 'string') {
              try {
                value = JSON.parse(value);
              } catch {
                // إبقاء القيمة كما هي
              }
            }
            operation.resolve(value);
          } else {
            operation.reject(new Error(String(result[0])));
          }
        });
      }
    } catch (error) {
      batch.forEach((operation) => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }

  /**
   * معالجة دفعة عمليات DELETE
   */
  private async processDelBatch(): Promise<void> {
    if (this.delQueue.length === 0) return;

    const batch = this.delQueue.splice(0);
    const keys = batch.map((op) => op.key);

    try {
      const result = await this.client.del(...keys);

      batch.forEach((operation) => {
        operation.resolve(result);
      });
    } catch (error) {
      batch.forEach((operation) => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }

  /**
   * تحديث إحصائيات الأداء
   */
  private updateMetrics(operationsCount: number, processingTime: number): void {
    this.metrics.totalBatches++;
    this.metrics.lastBatchTime = processingTime;
    this.metrics.totalProcessingTime += processingTime;

    const totalOps =
      this.metrics.totalSetOperations +
      this.metrics.totalGetOperations +
      this.metrics.totalDelOperations;

    this.metrics.averageBatchSize = totalOps / this.metrics.totalBatches;
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  getMetrics(): QueueMetrics & {
    queueSizes: { setQueue: number; getQueue: number; delQueue: number };
    averageProcessingTime: number;
    operationsPerSecond: { set: number; get: number; del: number };
  } {
    const avgTime = this.metrics.totalProcessingTime / this.metrics.totalBatches || 0;
    const timeInSeconds = this.metrics.totalProcessingTime / 1000 || 1;

    return {
      ...this.metrics,
      queueSizes: {
        setQueue: this.setQueue.length,
        getQueue: this.getQueue.length,
        delQueue: this.delQueue.length,
      },
      averageProcessingTime: avgTime,
      operationsPerSecond: {
        set: this.metrics.totalSetOperations / timeInSeconds,
        get: this.metrics.totalGetOperations / timeInSeconds,
        del: this.metrics.totalDelOperations / timeInSeconds,
      },
    };
  }

  /**
   * إغلاق النظام وتنظيف الموارد
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Redis Queue Batch Manager...');

    this.stopBatchProcessor();

    // معالجة العمليات المتبقية
    if (this.setQueue.length > 0 || this.getQueue.length > 0 || this.delQueue.length > 0) {
      console.log('🔄 Processing remaining operations...');
      this.isRunning = true; // مؤقتاً للسماح بالمعالجة
      await this.processBatches();
      this.isRunning = false;
    }

    await this.client.quit();
    console.log('✅ Redis Queue Batch Manager shutdown complete');
  }

  /**
   * الحصول على Redis Client
   */
  getRedisClient(): Redis {
    return this.client;
  }
}

export default RedisQueueBatchManager;
export { RedisQueueBatchManager };
