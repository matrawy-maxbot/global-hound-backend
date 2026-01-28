import { EventEmitter } from 'events';
import sequelize from './db.config.js';
import type { Model, ModelStatic, FindOptions } from 'sequelize';

// ===================== Interfaces =====================

interface BatchManagerOptions {
  batchInterval?: number;
  selectBatchInterval?: number;
  maxBatchSize?: number;
  selectMaxBatchSize?: number;
  enableMetrics?: boolean;
}

interface BatchMetrics {
  totalInsertOperations: number;
  totalUpdateOperations: number;
  totalSelectOperations: number;
  totalDeleteOperations: number;
  totalBatches: number;
  insertBatches: number;
  updateBatches: number;
  selectBatches: number;
  deleteBatches: number;
  averageBatchSize: number;
  lastBatchTime: number;
  totalProcessingTime: number;
  avgInsertBatchTime: number;
  avgUpdateBatchTime: number;
  avgSelectBatchTime: number;
  avgDeleteBatchTime: number;
}

interface InsertQueueItem<T = Record<string, unknown>> {
  model: string;
  modelClass: ModelStatic<Model>;
  data: T;
  resolve: (value: InsertResult) => void;
  reject: (reason?: Error) => void;
  timestamp: number;
}

interface UpdateQueueItem<T = Record<string, unknown>> {
  model: string;
  modelClass: ModelStatic<Model>;
  data: T;
  where: Record<string, unknown>;
  options: Record<string, unknown>;
  resolve: (value: UpdateResult) => void;
  reject: (reason?: Error) => void;
  timestamp: number;
}

interface SelectQueueItem {
  model: string;
  modelClass: ModelStatic<Model>;
  options: FindOptions;
  resolve: (value: Model[]) => void;
  reject: (reason?: Error) => void;
  timestamp: number;
}

interface DeleteQueueItem {
  model: string;
  modelClass: ModelStatic<Model>;
  where: Record<string, unknown>;
  options: Record<string, unknown>;
  resolve: (value: DeleteResult) => void;
  reject: (reason?: Error) => void;
  timestamp: number;
}

interface InsertResult {
  status: string;
  message: string;
  exist: boolean;
  data: Model | Record<string, unknown>;
}

interface UpdateResult {
  changedRows: number;
}

interface DeleteResult {
  deletedCount: number;
}

interface RemovedDuplicate {
  index: number;
  duplicateOf: number | undefined;
  data: Record<string, unknown>;
  uniqueKey: string;
}

interface ModelAttribute {
  primaryKey?: boolean;
  unique?: boolean;
  fieldName?: string;
  field?: string;
  type?: {
    constructor: { name: string };
    type?: { constructor: { name: string } };
  };
}

interface GroupedSelectOperations {
  [model: string]: {
    [optionsKey: string]: {
      operations: Array<{
        resolve: (value: Model[]) => void;
        reject: (reason?: Error) => void;
        timestamp: number;
      }>;
      modelClass: ModelStatic<Model>;
      options: FindOptions;
    };
  };
}

interface BatchSizes {
  insert?: number;
  update?: number;
  select?: number;
  delete?: number;
}

interface BatchProcessedEvent {
  operations: number;
  processingTime: number;
  timestamp: number;
}

interface MetricsResult {
  totalInsertOperations: number;
  totalUpdateOperations: number;
  totalSelectOperations: number;
  totalDeleteOperations: number;
  totalBatches: number;
  insertBatches: number;
  updateBatches: number;
  selectBatches: number;
  deleteBatches: number;
  averageBatchSize: number;
  lastBatchTime: number;
  totalProcessingTime: number;
  avgInsertBatchTime: number;
  avgUpdateBatchTime: number;
  avgSelectBatchTime: number;
  avgDeleteBatchTime: number;
  operations: {
    insert: number;
    update: number;
    select: number;
    delete: number;
  };
  batches: {
    insert: number;
    update: number;
    select: number;
    delete: number;
  };
  queueSizes: {
    insert: number;
    update: number;
    select: number;
    delete: number;
  };
  timing: {
    totalRuntime: number;
    avgInsertBatchTime: number;
    avgUpdateBatchTime: number;
    avgSelectBatchTime: number;
    avgDeleteBatchTime: number;
  };
  averageProcessingTime: number;
  operationsPerSecond: {
    insert: number;
    update: number;
    select: number;
    delete: number;
  };
}

type OperationType = 'insert' | 'update' | 'select' | 'delete';

// ===================== Class Implementation =====================

class PostgreSQLQueueBatchManager extends EventEmitter {
  private batchInterval: number;
  private selectBatchInterval: number;
  private maxBatchSize: number;
  private selectMaxBatchSize: number;
  private enableMetrics: boolean;
  
  private insertQueue: InsertQueueItem[];
  private updateQueue: UpdateQueueItem[];
  private selectQueue: SelectQueueItem[];
  private deleteQueue: DeleteQueueItem[];
  
  private metrics: BatchMetrics;
  private isRunning: boolean;
  private writeProcessingInterval: ReturnType<typeof setInterval> | null;
  private readProcessingInterval: ReturnType<typeof setInterval> | null;

  constructor(options: BatchManagerOptions = {}) {
    super();
    
    // إعدادات النظام
    this.batchInterval = options.batchInterval || 1000;
    this.selectBatchInterval = options.selectBatchInterval || 100;
    this.maxBatchSize = options.maxBatchSize || 10000;
    this.selectMaxBatchSize = options.selectMaxBatchSize || 5000;
    this.enableMetrics = options.enableMetrics ?? true;
    
    // طوابير العمليات
    this.insertQueue = [];
    this.updateQueue = [];
    this.selectQueue = [];
    this.deleteQueue = [];
    
    // إحصائيات الأداء
    this.metrics = {
      totalInsertOperations: 0,
      totalUpdateOperations: 0,
      totalSelectOperations: 0,
      totalDeleteOperations: 0,
      totalBatches: 0,
      insertBatches: 0,
      updateBatches: 0,
      selectBatches: 0,
      deleteBatches: 0,
      averageBatchSize: 0,
      lastBatchTime: 0,
      totalProcessingTime: 0,
      avgInsertBatchTime: 0,
      avgUpdateBatchTime: 0,
      avgSelectBatchTime: 0,
      avgDeleteBatchTime: 0
    };
    
    // بدء المعالج الدوري
    this.isRunning = false;
    this.writeProcessingInterval = null;
    this.readProcessingInterval = null;
    this.startBatchProcessor();
    
    console.log(`🚀 PostgreSQL Queue Batch Manager initialized with ${this.batchInterval}ms interval for insert, update, delete operations`);
    console.log(`🚀 PostgreSQL Queue Batch Manager initialized with ${this.selectBatchInterval}ms interval for select operations`);
  }
  
  /**
   * التحقق من جاهزية الاتصال بقاعدة البيانات
   */
  async waitForDatabaseConnection(maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        await sequelize.authenticate();
        return true;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    throw new Error('Database connection timeout');
  }
  
  /**
   * بدء المعالج الدوري للطوابير
   */
  startBatchProcessor(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // معالج للعمليات الكتابة (Insert, Update, Delete)
    this.writeProcessingInterval = setInterval(async () => {
      try {
        await this.processBatches(['insert', 'update', 'delete']);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Skipping batch processing - database not ready:', errorMessage);
      }
    }, this.batchInterval);
    
    // معالج منفصل لعمليات القراءة (Select)
    this.readProcessingInterval = setInterval(async () => {
      try {
        await this.processBatches(['select']);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Skipping select batch processing - database not ready:', errorMessage);
      }
    }, this.selectBatchInterval);
    
    console.log(`⏰ Batch processor started with ${this.batchInterval}ms interval for write operations`);
    console.log(`⏰ Batch processor started with ${this.selectBatchInterval}ms interval for read operations`);
  }
  
  /**
   * إيقاف المعالج الدوري
   */
  stopBatchProcessor(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.writeProcessingInterval) {
      clearInterval(this.writeProcessingInterval);
      this.writeProcessingInterval = null;
    }
    
    if (this.readProcessingInterval) {
      clearInterval(this.readProcessingInterval);
      this.readProcessingInterval = null;
    }
    
    console.log('⏹️ Batch processor stopped');
  }

  getUniqueColumns(model: ModelStatic<Model>): string[] {
    const uniqueColumns: string[] = [];
    
    const rawAttributes = model.rawAttributes as unknown as Record<string, ModelAttribute>;
    Object.values(rawAttributes).forEach((attribute: ModelAttribute) => {
      const fieldName = attribute.fieldName || attribute.field || '';
      // المفتاح الأساسي دائماً فريد
      if (attribute.primaryKey && fieldName) {
        uniqueColumns.push(fieldName);
      }
      // الحقول التي لها unique constraint
      else if (attribute.unique && fieldName) {
        uniqueColumns.push(fieldName);
      }
    });
    
    return [...new Set(uniqueColumns)]; // إزالة التكرارات
  }

  removeDuplicatesFromBatch(
    model: ModelStatic<Model>,
    dataBatch: InsertQueueItem[],
    uniqueColumns: string[]
  ): InsertQueueItem[] {
    console.log("\n\n\nremoveDuplicatesFromBatch: model : ", model, "\n\n\n");
    console.log("\n\n\nremoveDuplicatesFromBatch: dataBatch : ", dataBatch, "\n\n\n");
    console.log("\n\n\nremoveDuplicatesFromBatch: uniqueColumns : ", uniqueColumns, "\n\n\n");
    
    if (!Array.isArray(dataBatch) || dataBatch.length === 0) {
      console.log(`⚠️  removeDuplicatesFromBatch: No data to process or dataBatch is not an array`);
      return dataBatch;
    }
    
    if (dataBatch.length === 1) {
      console.log(`⚠️  removeDuplicatesFromBatch: Only one item in batch, no duplicates to remove`);
      return dataBatch;
    }
    
    const seen = new Map<string, number>();
    const uniqueData: InsertQueueItem[] = [];
    const removedDuplicates: RemovedDuplicate[] = [];
    
    dataBatch.forEach((item, index) => {
      const itemCopy = item.data as Record<string, unknown>;

      // إنشاء مفتاح فريد بناء على الحقول الفريدة
      const uniqueKey = uniqueColumns
        .filter(col => itemCopy[col] !== undefined && itemCopy[col] !== null)
        .map(col => `${col}:${JSON.stringify(itemCopy[col])}`)
        .join('|');

      console.log(index + " - unique key : ", uniqueKey);
      
      if (uniqueKey && seen.has(uniqueKey)) {
        console.log("unique has found!!");
        removedDuplicates.push({
          index: index,
          duplicateOf: seen.get(uniqueKey),
          data: itemCopy,
          uniqueKey: uniqueKey
        });
      } else {
        console.log("unique has not found!!!!!");
        if (uniqueKey) {
          seen.set(uniqueKey, index);
        }
        uniqueData.push(item);
      }
    });
    
    if (removedDuplicates.length > 0) {
      console.log(`🔄 Removed ${removedDuplicates.length} duplicate records from batch`);
      console.log('Removed duplicates:', removedDuplicates);
    }
    
    return uniqueData;
  }
  
  /**
   * إضافة عملية INSERT إلى الطابور
   */
  queueInsert<T extends Record<string, unknown>>(
    model: ModelStatic<Model>,
    data: T
  ): Promise<InsertResult> {
    return new Promise((resolve, reject) => {
      const modelName = typeof model === 'string' ? model : model.name;
      
      this.insertQueue.push({
        model: modelName,
        modelClass: model,
        data,
        resolve,
        reject,
        timestamp: Date.now()
      });

      const uniqueColumns = this.getUniqueColumns(model);
      
      console.log("\n\n\nmodel unique keys ^^^^^ :", uniqueColumns, "\n\n\n");

      this.insertQueue = this.removeDuplicatesFromBatch(model, this.insertQueue, uniqueColumns);

      console.log("\n!#############! this.insertQueue : ", this.insertQueue, "\n\n");
      this.metrics.totalInsertOperations++;
      
      if (this.insertQueue.length >= this.maxBatchSize) {
        this.processBatches(['insert']);
      }
    });
  }
  
  /**
   * إضافة عملية UPDATE إلى الطابور
   */
  queueUpdate<T extends Record<string, unknown>>(
    model: ModelStatic<Model>,
    data: T,
    where: Record<string, unknown> | { where: Record<string, unknown> },
    options: Record<string, unknown> = {}
  ): Promise<UpdateResult> {
    return new Promise((resolve, reject) => {
      const modelName = typeof model === 'string' ? model : model.name;

      if (!where) {
        reject(new Error('Where clause is required for update operation'));
        return;
      }

      console.log('\n\n\nwhere ^^^^^ :', where, "\n\n\n");
      
      const whereClause = 'where' in where ? where.where : where;
      
      this.updateQueue.push({
        model: modelName,
        modelClass: model,
        data,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        where: whereClause as Record<string, unknown>
      });
      
      this.metrics.totalUpdateOperations++;
      
      if (this.updateQueue.length >= this.maxBatchSize) {
        this.processBatches(['update']);
      }
    });
  }
  
  /**
   * إضافة عملية SELECT إلى الطابور
   */
  queueSelect(
    model: ModelStatic<Model>,
    options: FindOptions = {}
  ): Promise<Model[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!model) {
          reject(new Error('Model parameter is required'));
          return;
        }
        
        const modelName = typeof model === 'string' ? model : model.name;
        
        if (!modelName) {
          reject(new Error('Unable to determine model name'));
          return;
        }
        
        try {
          await this.waitForDatabaseConnection(10000);
        } catch (connectionError) {
          const errorMessage = connectionError instanceof Error ? connectionError.message : 'Unknown error';
          reject(new Error('Database connection timeout: ' + errorMessage));
          return;
        }
        
        this.selectQueue.push({
          model: modelName,
          modelClass: model,
          options,
          resolve,
          reject,
          timestamp: Date.now()
        });
        
        this.metrics.totalSelectOperations++;
        
        if (this.selectQueue.length >= this.selectMaxBatchSize) {
          setImmediate(async () => {
            try {
              await this.processBatches(['select']);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Error processing immediate batch:', errorMessage);
            }
          });
        }
        
      } catch (error) {
        reject(error as Error);
      }
    });
  }
  
  /**
   * إضافة عملية DELETE إلى الطابور
   */
  queueDelete(
    model: ModelStatic<Model>,
    where: Record<string, unknown> | { where: Record<string, unknown> },
    options: Record<string, unknown> = {}
  ): Promise<DeleteResult> {
    return new Promise((resolve, reject) => {
      const modelName = typeof model === 'string' ? model : model.name;
      
      const whereClause = 'where' in where ? where.where : where;
      
      this.deleteQueue.push({
        model: modelName,
        modelClass: model,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        where: whereClause as Record<string, unknown>
      });
      
      this.metrics.totalDeleteOperations++;
      
      if (this.deleteQueue.length >= this.maxBatchSize) {
        this.processBatches(['delete']);
      }
    });
  }
  
  /**
   * معالجة جميع الطوابير
   */
  async processBatches(operations: OperationType[] = ['insert', 'update', 'select', 'delete']): Promise<void> {
    if (!this.isRunning) return;
    
    const startTime = process.hrtime.bigint();
    let totalOperations = 0;
    
    try {
      const batchPromises: Promise<void>[] = [];
      const batchSizes: BatchSizes = {};
      
      if (this.insertQueue.length > 0 && operations.includes('insert')) {
        batchSizes.insert = this.insertQueue.length;
        batchPromises.push(this.processInsertBatch());
      }
      
      if (this.updateQueue.length > 0 && operations.includes('update')) {
        batchSizes.update = this.updateQueue.length;
        batchPromises.push(this.processUpdateBatch());
      }
      
      if (this.selectQueue.length > 0 && operations.includes('select')) {
        batchSizes.select = this.selectQueue.length;
        batchPromises.push(this.processSelectBatch());
      }
      
      if (this.deleteQueue.length > 0 && operations.includes('delete')) {
        batchSizes.delete = this.deleteQueue.length;
        batchPromises.push(this.processDeleteBatch());
      }
      
      if (batchPromises.length > 0) {
        const results = await Promise.allSettled(batchPromises);
        
        totalOperations = Object.values(batchSizes).reduce((sum, size) => sum + (size || 0), 0);
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`❌ Batch operation ${index} failed:`, result.reason?.message || result.reason);
          }
        });
      }
      
      if (totalOperations > 0) {
        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;
        
        this.updateMetrics(totalOperations, processingTime);
        this.emit('batchProcessed', {
          operations: totalOperations,
          processingTime,
          timestamp: Date.now()
        } as BatchProcessedEvent);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error processing batches:', errorMessage);
      this.emit('error', error);
    }
  }
  
  /**
   * معالجة دفعة عمليات INSERT
   */
  async processInsertBatch(): Promise<void> {
    if (this.insertQueue.length === 0) return;
    
    const batch = this.insertQueue.splice(0);
    
    const modelGroups: Record<string, InsertQueueItem[]> = {};
    batch.forEach(operation => {
      if (!modelGroups[operation.model]) {
        modelGroups[operation.model] = [];
      }
      modelGroups[operation.model].push(operation);
    });
    
    try {
      for (const [, operations] of Object.entries(modelGroups)) {
        const dataArray = operations.map(op => op.data);
        const modelClass = operations[0].modelClass;
        
        try {
          const result = await modelClass.bulkCreate(dataArray as Record<string, unknown>[], {
            validate: true,
            returning: true,
          });
          
          operations.forEach((operation, index) => {
            console.log("\n!#############! result : ", result[index], "\n\n");
            console.log("\n!#############! result.toJSON() : ", result[index]?.toJSON?.(), "\n\n");
            if (result[index]) {
              operation.resolve({
                status: 'success',
                message: 'Insert operation successful',
                exist: false,
                data: result[index].toJSON ? result[index].toJSON() : result[index]
              });
            } else {
              operation.reject(new Error('Insert operation failed'));
            }
          });
          
        } catch (error) {
          const err = error as Error & { name: string; parent?: { table?: string; detail?: string } };
          operations.forEach(operation => {
            if (err.name.toLowerCase() === 'sequelizeuniqueconstrainterror') {
              console.log('the data is exist in unique fields!', " , table : 0", err?.parent?.table, " , detail : ", err?.parent?.detail);
              operation.resolve({
                status: 'success',
                message: 'the data is exist in unique fields!',
                exist: true,
                data: {}
              });
            } else {
              console.log("\n!#############! error : ", error, "\n\n");
              operation.reject(err);
            }
          });
        }
      }
      
      this.metrics.insertBatches++;
      
    } catch (error) {
      batch.forEach(operation => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }
  
  /**
   * معالجة دفعة عمليات UPDATE
   */
  async processUpdateBatch(): Promise<void> {
    if (this.updateQueue.length === 0) return;
    
    const batch = this.updateQueue.splice(0);
    
    const modelGroups: Record<string, UpdateQueueItem[]> = {};
    batch.forEach(operation => {
      if (!modelGroups[operation.model]) {
        modelGroups[operation.model] = [];
      }
      modelGroups[operation.model].push(operation);
    });
    
    try {
      for (const [, operations] of Object.entries(modelGroups)) {
        const modelClass = operations[0].modelClass;
        const primaryKey = modelClass.primaryKeyAttributes && modelClass.primaryKeyAttributes[0];
        
        const allHavePk = primaryKey && operations.every(op => op.where && op.where[primaryKey] !== undefined);
        const updatedColumnsSet = new Set<string>();
        operations.forEach(op => Object.keys(op.data || {}).forEach(col => updatedColumnsSet.add(col)));
        const updatedColumns = Array.from(updatedColumnsSet);
        const sameColumnsAcrossAll = operations.every(op => Object.keys(op.data || {}).length === updatedColumns.length && updatedColumns.every(c => c in (op.data || {})));
        
        console.log('operations ::---:: ', operations);
        console.log('operations ::---:: ', operations[0].where);
        console.log('primaryKey ::---:: ', primaryKey);
        console.log('allHavePk ::---:: ', allHavePk);
        console.log('updatedColumnsSet ::---:: ', updatedColumnsSet);
        console.log('updatedColumns ::---:: ', updatedColumns);
        console.log('sameColumnsAcrossAll ::---:: ', sameColumnsAcrossAll);

        if (allHavePk && updatedColumns.length > 0 && sameColumnsAcrossAll) {
          const ids = operations.map(op => op.where[primaryKey!]);
          
          const modelAttributes = (modelClass.rawAttributes || {}) as unknown as Record<string, ModelAttribute>;
          
          const cases: Record<string, string> = {};
          const replacements: unknown[] = [];
          
          updatedColumns.forEach(col => {
            const columnInfo = modelAttributes[col];
            const dataType = columnInfo && columnInfo.type;
            
            let typeCast = '';
            let typeName = '';
            if (dataType) {
              typeName = dataType.constructor.name;

              console.log('typeName ::---:: ', typeName);
              
              switch (typeName) {
                case 'ENUM':
                  typeCast = `::enum_${modelClass.getTableName()}_${col}`;
                  break;
                case 'DATE':
                case 'DATEONLY':
                  typeCast = '::timestamp with time zone';
                  break;
                case 'TIME':
                  typeCast = '::time';
                  break;
                case 'INTEGER':
                case 'BIGINT':
                case 'SMALLINT':
                  typeCast = '::integer';
                  break;
                case 'DECIMAL':
                case 'FLOAT':
                case 'REAL':
                case 'DOUBLE':
                  typeCast = '::numeric';
                  break;
                case 'BOOLEAN':
                  typeCast = '::boolean';
                  break;
                case 'UUID':
                  typeCast = '::uuid';
                  break;
                case 'JSON':
                case 'JSONB':
                  typeCast = '::jsonb';
                  break;
                case 'ARRAY':
                  if (dataType.type && dataType.type.constructor) {
                    const innerTypeName = dataType.type.constructor.name;
                    switch (innerTypeName) {
                      case 'INTEGER':
                      case 'BIGINT':
                      case 'SMALLINT':
                        typeCast = '::integer[]';
                        break;
                      case 'BOOLEAN':
                        typeCast = '::boolean[]';
                        break;
                      case 'DECIMAL':
                      case 'FLOAT':
                      case 'REAL':
                      case 'DOUBLE':
                        typeCast = '::numeric[]';
                        break;
                      case 'UUID':
                        typeCast = '::uuid[]';
                        break;
                      default:
                        typeCast = '::text[]';
                    }
                  } else {
                    typeCast = '::text[]';
                  }
                  break;
                default:
                  typeCast = '';
              }
            }
            
            const whenClauses = operations.map(op => {
              const value = (op.data as Record<string, unknown>)[col];
              
              if (typeName === 'ARRAY' && Array.isArray(value)) {
                if (value.length === 0) {
                  replacements.push(op.where[primaryKey!]);
                  return `WHEN "${primaryKey}" = ? THEN '{}'${typeCast}`;
                }
                
                let innerTypeName = 'STRING';
                if (dataType && dataType.type && dataType.type.constructor) {
                  innerTypeName = dataType.type.constructor.name;
                }
                
                let arrayValue: string;
                switch (innerTypeName) {
                  case 'INTEGER':
                  case 'BIGINT':
                  case 'SMALLINT':
                  case 'DECIMAL':
                  case 'FLOAT':
                  case 'REAL':
                  case 'DOUBLE':
                    arrayValue = `{${value.join(',')}}`;
                    break;
                  case 'BOOLEAN':
                    arrayValue = `{${value.map((item: unknown) => item ? 'true' : 'false').join(',')}}`;
                    break;
                  case 'UUID':
                    arrayValue = `{${value.join(',')}}`;
                    break;
                  default:
                    arrayValue = `{${value.map((item: unknown) => `"${String(item).replace(/"/g, '\\"')}"`).join(',')}}`;
                }
                
                replacements.push(op.where[primaryKey!]);
                return `WHEN "${primaryKey}" = ? THEN '${arrayValue}'${typeCast}`;
              } else if (typeName === 'ARRAY' && value === null) {
                replacements.push(op.where[primaryKey!], null);
                return `WHEN "${primaryKey}" = ? THEN NULL`;
              } else {
                replacements.push(op.where[primaryKey!], value);
                return `WHEN "${primaryKey}" = ? THEN ?${typeCast}`;
              }
            }).join(' ');
            cases[col] = `CASE ${whenClauses} END`;
          });
          
          const setFragments = updatedColumns.map(col => `"${col}" = ${cases[col]}`).join(', ');
          const inPlaceholders = ids.map(() => '?').join(', ');
          const tableName = modelClass.getTableName();
          const qualifiedTable = typeof tableName === 'object' 
            ? `"${(tableName as { schema: string; tableName: string }).schema}"."${(tableName as { schema: string; tableName: string }).tableName}"` 
            : `"${tableName}"`;
          const sql = `UPDATE ${qualifiedTable} SET ${setFragments} WHERE "${primaryKey}" IN (${inPlaceholders});`;
          
          replacements.push(...ids);
          
          await sequelize.query(sql, { replacements });
          
          operations.forEach(op => op.resolve({ changedRows: 1 }));
        } else {
          const updatePromises = operations.map(async (operation) => {
            try {
              const result = await modelClass.update(
                operation.data,
                {
                  where: operation.where,
                  ...operation.options
                }
              );
              
              operation.resolve({
                changedRows: (result[0] as number) || 0
              });
              
            } catch (error) {
              operation.reject(error as Error);
            }
          });
          
          await Promise.all(updatePromises);
        }
      }
      
      this.metrics.updateBatches++;
      
    } catch (error) {
      batch.forEach(operation => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }
  
  /**
   * معالجة دفعة عمليات SELECT
   */
  async processSelectBatch(): Promise<void> {
    if (this.selectQueue.length === 0) return;
    
    const batch = this.selectQueue;
    const startTime = Date.now();
    
    try {
      const groupedBatch = this.groupSelectOperations(batch);
      
      const modelNames = Object.keys(groupedBatch);
      const concurrencyLimit = Math.min(modelNames.length, 20);
      
      for (let i = 0; i < modelNames.length; i += concurrencyLimit) {
        const chunk = modelNames.slice(i, i + concurrencyLimit);
        const chunkPromises = chunk.map(async (modelName) => {
          return this.processModelSelects(modelName, groupedBatch[modelName]);
        });
        
        await Promise.all(chunkPromises);
      }
      
      const processingTime = Date.now() - startTime;
      this.updateSelectMetrics(batch.length, processingTime);
      
      if (this.selectQueue.length > 0) {
        setImmediate(() => this.processSelectBatch());
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error in processSelectBatch:`, errorMessage);
      batch.forEach(operation => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }
  
  /**
   * تجميع عمليات SELECT حسب النموذج والخيارات
   */
  groupSelectOperations(batch: SelectQueueItem[]): GroupedSelectOperations {
    const grouped: GroupedSelectOperations = {};
    
    batch.forEach(operation => {
      const { model, modelClass, options, resolve, reject, timestamp } = operation;
      
      if (!grouped[model]) {
        grouped[model] = {};
      }
      
      const optionsKey = JSON.stringify({
        where: options.where || {},
        limit: options.limit || null,
        offset: options.offset || null,
        order: options.order || null,
        attributes: options.attributes || null
      });
      
      if (!grouped[model][optionsKey]) {
        grouped[model][optionsKey] = {
          operations: [],
          modelClass,
          options
        };
      }
      
      grouped[model][optionsKey].operations.push({
        resolve,
        reject,
        timestamp
      });
    });
    
    return grouped;
  }
  
  /**
   * معالجة عمليات SELECT لنموذج واحد
   */
  async processModelSelects(
    modelName: string,
    optionsGroups: GroupedSelectOperations[string]
  ): Promise<void> {
    try {
      const optionsPromises = Object.keys(optionsGroups).map(async (optionsKey) => {
        return this.executeSelectQuery(optionsGroups[optionsKey]);
      });
      
      await Promise.all(optionsPromises);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error processing model '${modelName}':`, errorMessage);
      Object.values(optionsGroups).forEach(group => {
        group.operations.forEach(operation => {
          operation.reject(error as Error);
        });
      });
      throw error;
    }
  }
  
  /**
   * تنفيذ استعلام SELECT محسن
   */
  async executeSelectQuery(operationsGroup: GroupedSelectOperations[string][string]): Promise<void> {
    try {
      const { operations, modelClass, options } = operationsGroup;
      
      console.log(" options :: ", options);

      const results = await modelClass.findAll(options);
      
      operations.forEach(operation => {
        operation.resolve(results);
      });
      
    } catch (error) {
      operationsGroup.operations.forEach(operation => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }
  
  /**
   * معالجة دفعة عمليات DELETE
   */
  async processDeleteBatch(): Promise<void> {
    if (this.deleteQueue.length === 0) return;
    
    const batch = this.deleteQueue.splice(0);
    
    const modelGroups: Record<string, DeleteQueueItem[]> = {};
    batch.forEach(operation => {
      if (!modelGroups[operation.model]) {
        modelGroups[operation.model] = [];
      }
      modelGroups[operation.model].push(operation);
    });
    
    try {
      for (const [, operations] of Object.entries(modelGroups)) {
        const modelClass = operations[0].modelClass;
        const primaryKey = modelClass.primaryKeyAttributes && modelClass.primaryKeyAttributes[0];
        
        const pkDeletes: DeleteQueueItem[] = [];
        const otherDeletes: DeleteQueueItem[] = [];
        operations.forEach(op => {
          if (primaryKey && op.where && op.where[primaryKey] !== undefined && Object.keys(op.where).length === 1) {
            pkDeletes.push(op);
          } else {
            otherDeletes.push(op);
          }
        });
        
        if (pkDeletes.length > 0) {
          const ids = pkDeletes.map(op => op.where[primaryKey!]);
          console.log("\n\n\n DELETE ids ^^^^^ :", ids, "\n\n\n");
          const where = { [primaryKey!]: ids };
          await modelClass.destroy({ where });
          pkDeletes.forEach(op => op.resolve({ deletedCount: 1 }));
        }
        
        if (otherDeletes.length > 0) {
          const deletePromises = otherDeletes.map(async (operation) => {
            try {
              console.log("\n\n\n DELETE operation ^^^^^ :", operation, "\n\n\n");
              console.log("\n\n\n DELETE operation.where ^^^^^ :", operation.where, "\n\n\n");

              const result = await modelClass.destroy({
                where: operation.where,
                ...operation.options
              });
              
              operation.resolve({
                deletedCount: result
              });
              
            } catch (error) {
              operation.reject(error as Error);
            }
          });
          await Promise.all(deletePromises);
        }
      }
      
      this.metrics.deleteBatches++;
      
    } catch (error) {
      batch.forEach(operation => {
        operation.reject(error as Error);
      });
      throw error;
    }
  }
  
  /**
   * تحديث إحصائيات عمليات SELECT
   */
  updateSelectMetrics(operationsCount: number, processingTime: number): void {
    if (!this.enableMetrics) return;
    
    this.metrics.selectBatches++;
    this.metrics.totalBatches++;
    this.metrics.lastBatchTime = Date.now();
    this.metrics.totalProcessingTime += processingTime;
    
    this.metrics.avgSelectBatchTime = this.metrics.totalProcessingTime / this.metrics.selectBatches;
    
    const totalOperations = this.metrics.totalInsertOperations + 
                           this.metrics.totalUpdateOperations + 
                           this.metrics.totalSelectOperations + 
                           this.metrics.totalDeleteOperations;
    this.metrics.averageBatchSize = totalOperations / this.metrics.totalBatches;
  }
  
  /**
   * تحديث إحصائيات الأداء
   */
  updateMetrics(operationsCount: number, processingTime: number): void {
    this.metrics.totalBatches++;
    this.metrics.lastBatchTime = processingTime;
    this.metrics.totalProcessingTime += processingTime;
    
    const totalOps = this.metrics.totalInsertOperations + 
                    this.metrics.totalUpdateOperations + 
                    this.metrics.totalSelectOperations + 
                    this.metrics.totalDeleteOperations;
    this.metrics.averageBatchSize = totalOps / this.metrics.totalBatches;
  }
  
  /**
   * الحصول على إحصائيات الأداء
   */
  getMetrics(): MetricsResult {
    return {
      ...this.metrics,
      operations: {
        insert: this.metrics.totalInsertOperations || 0,
        update: this.metrics.totalUpdateOperations || 0,
        select: this.metrics.totalSelectOperations || 0,
        delete: this.metrics.totalDeleteOperations || 0
      },
      batches: {
        insert: this.metrics.insertBatches || 0,
        update: this.metrics.updateBatches || 0,
        select: this.metrics.selectBatches || 0,
        delete: this.metrics.deleteBatches || 0
      },
      queueSizes: {
        insert: this.insertQueue.length,
        update: this.updateQueue.length,
        select: this.selectQueue.length,
        delete: this.deleteQueue.length
      },
      timing: {
        totalRuntime: this.metrics.totalProcessingTime || 0,
        avgInsertBatchTime: this.metrics.avgInsertBatchTime || 0,
        avgUpdateBatchTime: this.metrics.avgUpdateBatchTime || 0,
        avgSelectBatchTime: this.metrics.avgSelectBatchTime || 0,
        avgDeleteBatchTime: this.metrics.avgDeleteBatchTime || 0
      },
      averageProcessingTime: this.metrics.totalProcessingTime / this.metrics.totalBatches || 0,
      operationsPerSecond: {
        insert: (this.metrics.totalInsertOperations / (this.metrics.totalProcessingTime / 1000)) || 0,
        update: (this.metrics.totalUpdateOperations / (this.metrics.totalProcessingTime / 1000)) || 0,
        select: (this.metrics.totalSelectOperations / (this.metrics.totalProcessingTime / 1000)) || 0,
        delete: (this.metrics.totalDeleteOperations / (this.metrics.totalProcessingTime / 1000)) || 0
      }
    };
  }
  
  /**
   * إغلاق النظام وتنظيف الموارد
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down PostgreSQL Queue Batch Manager...');
    
    this.stopBatchProcessor();
    
    if (this.insertQueue.length > 0 || this.updateQueue.length > 0 || 
        this.selectQueue.length > 0 || this.deleteQueue.length > 0) {
      console.log('🔄 Processing remaining operations...');
      await this.processBatches();
    }
    
    console.log('✅ PostgreSQL Queue Batch Manager shutdown complete');
  }
}

// تصدير الكلاس للاستخدام
export { PostgreSQLQueueBatchManager };

// إنشاء مثيل افتراضي للاستخدام المباشر
const createDefaultManager = (): PostgreSQLQueueBatchManager => {
  console.log('🚀 Starting PostgreSQL Queue Batch System - High Performance Mode');
  console.log('=' .repeat(60));
  
  const postgresQueueManager = new PostgreSQLQueueBatchManager({
    batchInterval: 10,
    selectBatchInterval: 5,
    maxBatchSize: 1000,
    selectMaxBatchSize: 5000,
    enableMetrics: true
  });
  
  postgresQueueManager.on('batchProcessed', (data: BatchProcessedEvent) => {
    // console.log(`📊 Batch processed: ${data.operations} operations in ${data.processingTime.toFixed(2)}ms`);
  });
  
  postgresQueueManager.on('error', (error: Error) => {
    console.error('❌ PostgreSQL Queue Manager Error:', error.message);
  });
  
  return postgresQueueManager;
};

export default createDefaultManager;

/*
أمثلة على الاستخدام:

try {
  // مثال على INSERT
  const insertResult = await postgresQueueManager.queueInsert(User, {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123'
  });

  // مثال على UPDATE
  const updateResult = await postgresQueueManager.queueUpdate(
    User,
    { name: 'John Updated' },
    { email: 'john@example.com' }
  );

  // مثال على SELECT
  const selectResult = await postgresQueueManager.queueSelect(
    User,
    {
      where: { name: 'John%' },
      limit: 10,
      order: [['name', 'ASC']]
    }
  );

  // مثال على DELETE
  const deleteResult = await postgresQueueManager.queueDelete(
    User,
    { email: 'john@example.com' }
  );

} catch (error) {
  console.error('❌ Operation failed:', error.message);
} finally {
  // إغلاق الاتصال
  await postgresQueueManager.shutdown();
}
*/
