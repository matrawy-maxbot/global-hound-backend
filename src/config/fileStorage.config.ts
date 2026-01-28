import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface FileStorageConfigEnv {
  FILE_STORAGE_PATH: string;
  MAX_FILE_SIZE: number;
  AWS_ACCESS_KEY?: string;
  AWS_SECRET_KEY?: string;
  AWS_BUCKET_NAME?: string;
  UPLOAD_DIR: string;
  BASE_URL: string;
}

// تعريف Schema للتحقق من الإعدادات
const fileStorageSchema: ObjectSchema = object.keys({
  FILE_STORAGE_PATH: string.required(),
  MAX_FILE_SIZE: number.integer().min(1).required(),
  AWS_ACCESS_KEY: string.optional().allow(''),
  AWS_SECRET_KEY: string.optional().allow(''),
  AWS_BUCKET_NAME: string.optional().allow(''),
  UPLOAD_DIR: string.default('./uploads'),
  BASE_URL: string.default('http://localhost:3000'),
}).unknown(); // السماح بمتغيرات إضافية

// التحقق من القيم
const { value: fileStorageConfig, error } = fileStorageSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<FileStorageConfigEnv>;

if (error) {
  throw new Error(
    `File Storage configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  FILE_STORAGE_PATH,
  MAX_FILE_SIZE,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET_NAME,
  UPLOAD_DIR,
  BASE_URL,
} = fileStorageConfig;
