import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * واجهة الملف المرفوع
 */
interface UploadedFile {
    name: string;
    mv: (path: string, callback: (err?: Error) => void) => void;
}

// للحصول على __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * حفظ ملف في المجلد المحدد
 * @param file - الملف المراد حفظه
 * @param folder - اسم المجلد (الافتراضي: uploads)
 * @returns مسار الملف المحفوظ
 */
const saveFile = (file: UploadedFile, folder: string = 'uploads'): string => {
    const filePath = join(__dirname, '../', folder, file.name);
    file.mv(filePath, (err?: Error) => {
        if (err) throw err;
    });
    return filePath;
};

/**
 * حذف ملف من النظام
 * @param filePath - مسار الملف المراد حذفه
 */
const deleteFile = (filePath: string): void => {
    if (existsSync(filePath)) {
        unlinkSync(filePath);
    }
};

export default { saveFile, deleteFile };
export type { UploadedFile };
