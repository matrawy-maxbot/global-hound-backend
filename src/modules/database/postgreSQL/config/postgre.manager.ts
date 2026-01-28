import { Model, ModelStatic } from 'sequelize';
import createDefaultManager, { PostgreSQLQueueBatchManager } from './postgresql-batch.config.js';
import PgSQLManager from './pgSelect.enhancement.js';

// ===================== Types =====================

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

interface FilterOptions {
  [key: string]: unknown;
  Op?: symbol;
}

// ===================== Manager Instances =====================

const postgresQueueManager: PostgreSQLQueueBatchManager = createDefaultManager();
const pgSQLM: PgSQLManager = new PgSQLManager();

// ===================== Functions =====================

/**
 * @param {ModelStatic<Model>} tableName - اسم الجدول
 * @param {Object} data - البيانات المراد إدخالها
 * @returns {Promise<InsertResult>} - إرجاع الحقل المُضاف
 * @example
 * PGinsert(User, {
 *     name: 'Mohamed',
 *     age: 25,
 *     email: 'mohamed@example.com'
 * });
 */
async function PGinsert<T extends Record<string, unknown>>(
  tableName: ModelStatic<Model>,
  data: T
): Promise<InsertResult> {
  console.log("\n!#############! tableName : ", tableName, "\n\n");
  console.log("\n!#############! data : ", data, "\n\n");
  return await postgresQueueManager.queueInsert(tableName, data);
}

/**
 * @param {ModelStatic<Model>} tableName - اسم الجدول
 * @param {Object} data - البيانات المراد تحديثها
 * @param {Object} where - شرط التحديث
 * @param {Object} options - خيارات التحديث
 * @returns {Promise<UpdateResult>} - إرجاع نتيجة التحديث
 * @example
 * PGupdate(User, {
 *     name: 'Mohamed',
 *     age: 25,
 *     email: 'mohamed@example.com'
 * }, {
 *     id: 1
 * });
 */
async function PGupdate<T extends Record<string, unknown>>(
  tableName: ModelStatic<Model>,
  data: T,
  where: Record<string, unknown> | { where: Record<string, unknown> },
  options: Record<string, unknown> = {}
): Promise<UpdateResult> {
  console.log("\n!#############! tableName : ", tableName, "\n\n");
  console.log("\n!#############! data : ", data, "\n\n");
  console.log("\n!#############! where : ", where, "\n\n");
  console.log("\n!#############! options : ", options, "\n\n");
  return await postgresQueueManager.queueUpdate(tableName, data, where, options);
}

/**
 * @param {ModelStatic<Model>} tableName - اسم الجدول
 * @param {Object} where - شرط الحذف
 * @param {Object} options - خيارات الحذف
 * @returns {Promise<DeleteResult>} - إرجاع نتيجة الحذف
 * @example
 * PGdelete(User, {
 *     id: 1
 * });
 */
async function PGdelete(
  tableName: ModelStatic<Model>,
  where: Record<string, unknown> | { where: Record<string, unknown> },
  options: Record<string, unknown> = {}
): Promise<DeleteResult> {
  console.log("\n!#############! tableName : ", tableName, "\n\n");
  console.log("\n!#############! where : ", where, "\n\n");
  console.log("\n!#############! options : ", options, "\n\n");
  return await postgresQueueManager.queueDelete(tableName, where, options);
}

/**
 * @param {ModelStatic<Model>} model - اسم الجدول
 * @param {FilterOptions} filter - شرط البحث
 * @returns {Promise<Record<string, unknown>[]>} - إرجاع النتائج
 * @example
 * PGselectAll(User, {name: `Test User ${0 + i}`});
 */
async function PGselectAll(
  model: ModelStatic<Model>,
  filter: FilterOptions
): Promise<Record<string, unknown>[]> {
  return await pgSQLM.findQueue({ model, filter });
}

export {
  PGinsert,
  PGupdate,
  PGdelete,
  PGselectAll,
};
