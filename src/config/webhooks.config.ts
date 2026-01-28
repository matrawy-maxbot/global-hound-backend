import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface WebhooksConfigEnv {
  WEBHOOK_SECRET: string;
  WEBHOOK_RETRY_COUNT: number;
  WEBHOOK_RETRY_DELAY: number;
}

// تعريف Schema للتحقق من الإعدادات
const webhooksSchema: ObjectSchema = object.keys({
  WEBHOOK_SECRET: string.required(),
  WEBHOOK_RETRY_COUNT: number.integer().min(0).default(3),
  WEBHOOK_RETRY_DELAY: number.integer().min(0).default(5000),
}).unknown();

const { value: webhooksConfig, error } = webhooksSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<WebhooksConfigEnv>;

if (error) {
  throw new Error(
    `Webhooks configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  WEBHOOK_SECRET,
  WEBHOOK_RETRY_COUNT,
  WEBHOOK_RETRY_DELAY,
} = webhooksConfig;
