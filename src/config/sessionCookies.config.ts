import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface SessionCookiesConfigEnv {
  SESSION_SECRET: string;
  SESSION_MAX_AGE: number;
  COOKIE_SECRET: string;
  COOKIE_MAX_AGE: number;
}

// تعريف Schema للتحقق من الإعدادات
const sessionCookiesSchema: ObjectSchema = object.keys({
  SESSION_SECRET: string.required(),
  SESSION_MAX_AGE: number.integer().min(1).required(),
  COOKIE_SECRET: string.required(),
  COOKIE_MAX_AGE: number.integer().min(1).required(),
}).unknown(true); // السماح بمتغيرات إضافية

// التحقق من القيم
const { value: sessionCookiesConfig, error } = sessionCookiesSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<SessionCookiesConfigEnv>;

if (error) {
  throw new Error(
    `Session Cookies configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  SESSION_SECRET,
  SESSION_MAX_AGE,
  COOKIE_SECRET,
  COOKIE_MAX_AGE,
} = sessionCookiesConfig;
