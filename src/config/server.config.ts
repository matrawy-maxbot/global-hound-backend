import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

type NodeEnv = 'development' | 'production' | 'testing';

interface ServerConfigEnv {
  SERVER_HOST: string;
  SERVER_PORT: number;
  NODE_ENV: NodeEnv;
  BASE_URL: string;
}

// تعريف Schema للتحقق من الإعدادات
const serverSchema: ObjectSchema = object.keys({
  SERVER_HOST: string.hostname().default('0.0.0.0'),
  SERVER_PORT: number.integer().min(1).max(65535).default(3000),
  NODE_ENV: string
    .valid('development', 'production', 'testing')
    .default('development'),
  BASE_URL: string.uri().required(),
}).unknown();

const { value: serverConfig, error } = serverSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<ServerConfigEnv>;

if (error) {
  throw new Error(
    `Server configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  SERVER_HOST,
  SERVER_PORT,
  NODE_ENV,
  BASE_URL,
} = serverConfig;
