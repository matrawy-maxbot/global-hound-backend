import { Op, Model, ModelStatic } from 'sequelize';

// ===================== Interfaces =====================

interface QueueElement {
  model: ModelStatic<Model>;
  filter: FilterOptions;
}

interface FilterOptions {
  [key: string]: unknown;
  Op?: symbol;
}

interface SelectQueueItem {
  resolve: (value: Record<string, unknown>[]) => void;
  reject: (reason?: Error) => void;
  query: FilterOptions;
  date: Date;
  model: ModelStatic<Model>;
  filter: FilterOptions;
}

interface QuerySettings {
  resolve: (value: Record<string, unknown>[]) => void;
  reject: (reason?: Error) => void;
  query: FilterOptions;
  operator: symbol;
  filter: string;
  filterVal: unknown;
}

interface OperationData {
  values: Array<{ vals: unknown; sets: QuerySettings }>;
  settings: QuerySettings[];
  model: ModelStatic<Model>;
  operation: symbol;
  minValue: number | null;
  maxValue: number | null;
}

interface ParsedData {
  [module: string]: {
    [filterKey: string]: {
      [operationKey: string]: OperationData;
    };
  };
}

interface BatchPromise {
  query: Promise<Model[]>;
  settings: QuerySettings[];
}

interface ChunkResult {
  chunksValues: unknown[];
  chunkSettings: QuerySettings[];
}

// ===================== Class Implementation =====================

class PgSQLManager {
  private selectQueue: SelectQueueItem[];
  private selectInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.selectQueue = [];
    this.selectInterval = setInterval(() => {
      const currentQueue = [...this.selectQueue];
      this.selectQueue = [];
      if (currentQueue.length > 0) {
        this.findInterval(currentQueue);
      }
    }, 500);
  }

  async findQueue(element: QueueElement): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      this.selectQueue.push({
        resolve,
        reject,
        query: element.filter,
        date: new Date(),
        model: element.model,
        filter: element.filter
      });
    });
  }

  parseSelect(queueData: SelectQueueItem[] | null = null): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      try {
        const selectQueue = queueData || this.selectQueue;
        const data: ParsedData = {};
        const modules = [...new Set(selectQueue.map(sq => sq.model.name))];
        
        for (const module of modules) {
          data[module] = {};
          for (const sq of selectQueue) {
            if (sq.model.name === module) {
              const sqFilter = Object.keys(sq.filter).filter(key => key !== 'Op');
              const filterKey = sqFilter[0] || sqFilter.toString();
              const filterValue = sq.filter[filterKey];
              const operation = (sq.filter.Op as symbol) || Op.in;
              
              const querySettings: QuerySettings = {
                resolve: sq.resolve,
                reject: sq.reject,
                query: sq.query,
                operator: operation,
                filter: filterKey,
                filterVal: filterValue
              };
              
              if (!data[module][filterKey]) {
                data[module][filterKey] = {};
              }
              
              if (!data[module][filterKey][operation.toString()]) {
                data[module][filterKey][operation.toString()] = {
                  values: [],
                  settings: [],
                  model: sq.model,
                  operation: operation,
                  minValue: null,
                  maxValue: null
                };
              }
              
              const operationData = data[module][filterKey][operation.toString()];
              operationData.values.push({ vals: filterValue, sets: querySettings });
              
              if (operation === Op.gt || operation === Op.gte) {
                operationData.minValue = operationData.minValue === null 
                  ? filterValue as number 
                  : Math.min(operationData.minValue, filterValue as number);
              } else if (operation === Op.lt || operation === Op.lte) {
                operationData.maxValue = operationData.maxValue === null 
                  ? filterValue as number 
                  : Math.max(operationData.maxValue, filterValue as number);
              } else if (operation === Op.between) {
                const betweenValue = filterValue as [number, number];
                operationData.minValue = operationData.minValue === null 
                  ? betweenValue[0] 
                  : Math.min(operationData.minValue, betweenValue[0], betweenValue[1]);
                operationData.maxValue = operationData.maxValue === null 
                  ? betweenValue[1] 
                  : Math.max(operationData.maxValue, betweenValue[0], betweenValue[1]);
              }
            }
          }
        }
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  async execute(promises: BatchPromise[]): Promise<Record<string, unknown>[][]> {
    return new Promise(async (resolve, reject) => {
      try {
        const batchSize = 10;
        const results: (Record<string, unknown>[] | null)[] = [];

        for (let i = 0; i < promises.length; i += batchSize) {
          const batch = promises.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (b) => {
              let batchResults = await b.query;
              const mappedResults = batchResults.map((br) => (br as Model & { dataValues: Record<string, unknown> }).dataValues || {});
              console.log("batchResults : ", mappedResults);

              const settings = b.settings;
              console.log("settings : ", settings.map(s => s.query));

              let keyArr = Object.keys(settings[0].query);
              const key = typeof keyArr === 'string' ? keyArr : keyArr.filter(k => k !== 'Op')[0];
              console.log("key : ", key);

              if (settings[0].query.Op === Op.like) {
                const resultMap = new Map(mappedResults.map(o => [o[key], o]));

                settings.forEach(br => {
                  const pattern = br.query[key] as string;
                  const regexPattern = pattern
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/%/g, '.*')
                    .replace(/_/g, '.');
                  const regex = new RegExp(`^${regexPattern}$`, 'i');

                  const matchingResults: Record<string, unknown>[] = [];
                  for (const [value, result] of resultMap) {
                    if (value && regex.test(value as string)) {
                      matchingResults.push(result);
                    }
                  }

                  const res = matchingResults.length > 0 ? matchingResults : null;
                  results.push(res);
                  br.resolve(Array.isArray(res) ? res : res ? [res] : []);
                });

              } else if (settings[0].query.Op === Op.in || !settings[0].query.Op) {
                const index = new Map<unknown, Record<string, unknown>[]>();
                mappedResults.forEach(o => {
                  if (o[key]) {
                    if (!index.has(o[key])) {
                      index.set(o[key], []);
                    }
                    index.get(o[key])!.push(o);
                  }
                });
                
                settings.forEach(br => {
                  const res = index.get(br.query[key]) || [];
                  results.push(res);
                  console.log("res : ", res);
                  br.resolve(Array.isArray(res) ? res : res ? [res] : []);
                });
              } else if (settings[0].query.Op === Op.between) {
                const sortedResults = mappedResults
                  .filter(o => o[key] !== null && o[key] !== undefined)
                  .sort((a, b) => (a[key] as number) - (b[key] as number));

                function lowerBound(arr: Record<string, unknown>[], value: number): number {
                  let low = 0, high = arr.length;
                  while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    if ((arr[mid][key] as number) < value) low = mid + 1;
                    else high = mid;
                  }
                  return low;
                }

                function upperBound(arr: Record<string, unknown>[], value: number): number {
                  let low = 0, high = arr.length;
                  while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    if ((arr[mid][key] as number) <= value) low = mid + 1;
                    else high = mid;
                  }
                  return low;
                }

                settings.forEach(br => {
                  const [minValue, maxValue] = br.query[key] as [number, number];
                  const start = lowerBound(sortedResults, minValue);
                  const end = upperBound(sortedResults, maxValue);

                  const matchingResults = sortedResults.slice(start, end);
                  const res = matchingResults.length > 0 ? matchingResults : [];

                  results.push(res);
                  br.resolve(Array.isArray(res) ? res : res ? [res] : []);
                });
              } else if (settings[0].query.Op === Op.gt || settings[0].query.Op === Op.gte) {
                const sortedResults = mappedResults
                  .filter(o => o[key] !== null && o[key] !== undefined)
                  .sort((a, b) => (a[key] as number) - (b[key] as number));

                function lowerBound(arr: Record<string, unknown>[], value: number): number {
                  let low = 0, high = arr.length;
                  while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    if ((arr[mid][key] as number) < value) low = mid + 1;
                    else high = mid;
                  }
                  return low;
                }

                console.log("sortedResults : ", sortedResults);

                settings.forEach(br => {
                  const threshold = br.query[key] as number;
                  const startIndex = (settings[0].query.Op === Op.gt)
                    ? lowerBound(sortedResults, threshold + 1)
                    : lowerBound(sortedResults, threshold);

                  const matchingResults = sortedResults.slice(startIndex);
                  const res = matchingResults.length > 0 ? matchingResults : [];
                  results.push(res);
                  br.resolve(Array.isArray(res) ? res : res ? [res] : []);
                });

              } else if (settings[0].query.Op === Op.lt || settings[0].query.Op === Op.lte) {
                const sortedResults = mappedResults
                  .filter(o => o[key] !== null && o[key] !== undefined)
                  .sort((a, b) => (a[key] as number) - (b[key] as number));

                function upperBound(arr: Record<string, unknown>[], value: number): number {
                  let low = 0, high = arr.length;
                  while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    if ((arr[mid][key] as number) <= value) low = mid + 1;
                    else high = mid;
                  }
                  return low;
                }

                settings.forEach(br => {
                  const threshold = br.query[key] as number;
                  const endIndex = (settings[0].query.Op === Op.lt)
                    ? upperBound(sortedResults, threshold - 1)
                    : upperBound(sortedResults, threshold);

                  const matchingResults = sortedResults.slice(0, endIndex);
                  const res = matchingResults.length > 0 ? matchingResults : [];
                  results.push(res);
                  br.resolve(Array.isArray(res) ? res : res ? [res] : []);
                });
              }
            })
          );
        }

        resolve(results as Record<string, unknown>[][]);
      } catch (error) {
        reject(error);
      }
    });
  }

  async promisesParse(queueData: SelectQueueItem[] | null = null): Promise<BatchPromise[]> {
    const queueParse = await this.parseSelect(queueData);
    const promises: BatchPromise[] = [];
    const CHUNK_SIZE = 100000;
    
    const chunkArray = (array: Array<{ vals: unknown; sets: QuerySettings }>, size: number): ChunkResult[] => {
      const chunks: ChunkResult[] = [];
      for (let i = 0; i < array.length; i += size) {
        const slice = array.slice(i, i + size);
        chunks.push({
          chunksValues: slice.map(s => s.vals),
          chunkSettings: slice.map(s => s.sets)
        });
      }
      return chunks;
    };
    
    Object.keys(queueParse).forEach((module) => {
      Object.keys(queueParse[module]).forEach((filterKey) => {
        Object.keys(queueParse[module][filterKey]).forEach((operationKey) => {
          const filterData = queueParse[module][filterKey][operationKey];
          const operation = filterData.operation;
          
          if (operation === Op.in) {
            const valueChunks = chunkArray(filterData.values, CHUNK_SIZE);
            valueChunks.forEach(chunk => {
              console.log("filter data : ", { where: { [filterKey]: { [operation]: chunk.chunksValues } } }, chunk.chunksValues);
              promises.push({
                query: filterData.model.findAll({ 
                  where: { [filterKey]: { [operation]: chunk.chunksValues } } 
                }),
                settings: chunk.chunkSettings
              });
            });

          } else if (operation === Op.gt || operation === Op.gte) {
            console.log("filter data : ", { where: { [filterKey]: { [operation]: filterData.minValue } } });
            promises.push({
              query: filterData.model.findAll({ 
                where: { [filterKey]: { [operation]: filterData.minValue } } 
              }),
              settings: filterData.values.map(v => v.sets)
            });
          } else if (operation === Op.lt || operation === Op.lte) {
            console.log("filter data : ", { where: { [filterKey]: { [operation]: filterData.maxValue } } });
            promises.push({
              query: filterData.model.findAll({ 
                where: { [filterKey]: { [operation]: filterData.maxValue } } 
              }),
              settings: filterData.values.map(v => v.sets)
            });
          } else if (operation === Op.like || operation === Op.iLike) {
            const valueChunks = chunkArray(filterData.values, CHUNK_SIZE);
            valueChunks.forEach(chunk => {
              const likeConditions = chunk.chunksValues.map(value => ({
                [filterKey]: { [operation]: value }
              }));
              console.log("filter data : ", { where: { [Op.or]: likeConditions } });
              promises.push({
                query: filterData.model.findAll({ 
                  where: { [Op.or]: likeConditions }
                }),
                settings: chunk.chunkSettings
              });
            });

          } else if (operation === Op.between) {
            console.log("filter data : ", { 
              where: { [filterKey]: { [Op.between]: [filterData.minValue, filterData.maxValue] } }, 
              values: filterData.values, 
              settings: filterData.values.map(v => v.sets)
            });

            promises.push({
              query: filterData.model.findAll({ 
                where: { [filterKey]: { [Op.between]: [filterData.minValue, filterData.maxValue] } }
              }),
              settings: filterData.values.map(v => v.sets)
            });
          } else {
            filterData.values.forEach(value => {
              console.log("filter data : ", { where: { [filterKey]: { [operation]: value.vals } } });
              promises.push({
                query: filterData.model.findAll({ 
                  where: { [filterKey]: { [operation]: value.vals } } 
                }),
                settings: filterData.settings
              });
            });
          }
        });
      });
    });

    return promises;
  }

  async findInterval(queueData: SelectQueueItem[] | null = null): Promise<void> {
    const currentSelectQueue = queueData || this.selectQueue;
    
    const promises = await this.promisesParse(currentSelectQueue);
    
    const executionPromises = Array.from({ length: 1 }).map(async () => {
      this.execute(promises);
    });
    
    await Promise.all(executionPromises);
  }

  /**
   * إيقاف المعالج الدوري
   */
  stop(): void {
    if (this.selectInterval) {
      clearInterval(this.selectInterval);
    }
  }
}

export default PgSQLManager;
