import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, object, number, boolean } = types;

interface SecurityConfigEnv {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  API_KEY: string;
  BOT_TOKEN: string;
  API_BOT_AUTHORIZATION: string;
  CORS_ORIGIN: string;
  CORS_METHODS: string;
  CORS_HEADERS: string;
  CORS_EXPOSED_HEADERS: string;
  CORS_CREDENTIALS: string;
  CORS_MAX_AGE: string;
  CORS_OPTIONS_SUCCESS_STATUS: string;
  CLAMAV_HOST: string;
  CLAMAV_PORT: number;
  REQUIRE_CLAMAV: boolean;
}

// تعريف Schema للتحقق من الإعدادات
const securitySchema: ObjectSchema = object.keys({
  // JWT
  JWT_SECRET: string.required(),
  JWT_EXPIRES_IN: string.default('1h'),
  JWT_REFRESH_EXPIRES_IN: string.default('7d'),
  API_KEY: string.required(),

  // Discord Bot Token
  BOT_TOKEN: string.required(),
  API_BOT_AUTHORIZATION: string.required(),

  // CORS
  CORS_ORIGIN: string.required(), // قائمة مفصولة بفواصل
  CORS_METHODS: string.default('GET,POST,PUT,DELETE,PATCH,OPTIONS'),
  CORS_HEADERS: string.default('Content-Type,Authorization,X-Requested-With,serverID,serverid'),
  CORS_EXPOSED_HEADERS: string.default('X-Total-Count,X-Page-Count'),
  CORS_CREDENTIALS: string.default('true'),
  CORS_MAX_AGE: string.default('86400'), // 24 ساعة
  CORS_OPTIONS_SUCCESS_STATUS: string.default('204'),

  CLAMAV_HOST: string.default('localhost'),
  CLAMAV_PORT: number.default(3310),
  REQUIRE_CLAMAV: boolean.default(true),
}).unknown();

const { value: securityConfig, error } = securitySchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<SecurityConfigEnv>;

if (error) {
  throw new Error(
    `Security configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

// تحويل CORS_ORIGIN إلى array
const parseCorsOrigin = (origin: string): string[] => {
  if (!origin) return [];
  return origin.split(',').map((o: string) => o.trim()).filter(Boolean);
};

export const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  API_KEY,
  BOT_TOKEN,
  API_BOT_AUTHORIZATION,
  CORS_METHODS,
  CORS_HEADERS,
  CORS_EXPOSED_HEADERS,
  CORS_MAX_AGE,
  CORS_OPTIONS_SUCCESS_STATUS,
  CLAMAV_HOST,
  CLAMAV_PORT,
  REQUIRE_CLAMAV,
} = securityConfig;

export const CORS_ORIGIN: string[] = parseCorsOrigin(securityConfig.CORS_ORIGIN);
export const CORS_CREDENTIALS: boolean = securityConfig.CORS_CREDENTIALS === 'true';
