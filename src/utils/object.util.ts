/**
 * نوع الكائن العام
 */
type GenericObject = Record<string, unknown>;

/**
 * واجهة نتيجة قاعدة البيانات
 */
interface DatabaseResult<T = unknown> {
    data?: T | T[];
    [key: string]: unknown;
}

/**
 * استبعاد مفاتيح محددة من كائن
 * @param object - الكائن الأصلي
 * @param keys - المفاتيح المراد استبعادها
 * @returns كائن جديد بدون المفاتيح المحددة
 */
export const excludeObjectKeys = <T extends GenericObject>(
    object: T,
    keys: (keyof T)[]
): Partial<T> => {
    const newObject = { ...object };
    keys.forEach(key => delete newObject[key]);
    return newObject;
};

/**
 * معالجة نتيجة قاعدة البيانات وتحويلها إلى مصفوفة
 * @param result - نتيجة قاعدة البيانات
 * @returns مصفوفة من النتائج
 */
export const resolveDatabaseResult = <T>(
    result: DatabaseResult<T> | T | T[] | null | undefined
): T[] => {
    let resolved: T | T[] | null | undefined = (result as DatabaseResult<T>)?.data 
        ? (result as DatabaseResult<T>).data 
        : result as T | T[] | null | undefined;
    
    resolved = resolved ?? [];
    resolved = Array.isArray(resolved) ? resolved : resolved ? [resolved] : [];
    resolved = resolved.length === 1 && (resolved[0] == null || !resolved[0]) ? [] : resolved;
    
    return resolved as T[];
};

export type { GenericObject, DatabaseResult };
