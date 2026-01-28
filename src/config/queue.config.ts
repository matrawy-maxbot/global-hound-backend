import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface QueueConfigEnv {
  RABBITMQ_HOST: string;
  RABBITMQ_PORT: number;
  RABBITMQ_USER: string;
  RABBITMQ_PASSWORD: string;
  RABBITMQ_VHOST: string;
  RABBITMQ_QUEUE: string;
  RABBITMQ_EXCHANGE: string;
  RABBITMQ_EXCHANGE_TYPE: 'direct' | 'topic' | 'fanout' | 'headers';
  RABBITMQ_RETRY_COUNT: number;
  RABBITMQ_RETRY_DELAY_MS: number;
  RABBITMQ_HEARTBEAT: number;
}

// تعريف Schema للتحقق من الإعدادات
const queueSchema: ObjectSchema = object.keys({
  RABBITMQ_HOST: string.hostname().required(),
  RABBITMQ_PORT: number.integer().min(1).max(65535).required(),
  RABBITMQ_USER: string.required(),
  RABBITMQ_PASSWORD: string.required(),
  RABBITMQ_VHOST: string.default('/'),
  RABBITMQ_QUEUE: string.required(),
  RABBITMQ_EXCHANGE: string.required(),
  RABBITMQ_EXCHANGE_TYPE: string
    .valid('direct', 'topic', 'fanout', 'headers')
    .default('direct'),
  RABBITMQ_RETRY_COUNT: number.integer().min(0).default(5),
  RABBITMQ_RETRY_DELAY_MS: number.integer().min(0).default(5000),
  RABBITMQ_HEARTBEAT: number.integer().min(0).default(60),
}).unknown();

const { value: queueConfig, error } = queueSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<QueueConfigEnv>;

if (error) {
  throw new Error(
    `Queue configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  RABBITMQ_HOST,
  RABBITMQ_PORT,
  RABBITMQ_USER,
  RABBITMQ_PASSWORD,
  RABBITMQ_VHOST,
  RABBITMQ_QUEUE,
  RABBITMQ_EXCHANGE,
  RABBITMQ_EXCHANGE_TYPE,
  RABBITMQ_RETRY_COUNT,
  RABBITMQ_RETRY_DELAY_MS,
  RABBITMQ_HEARTBEAT,
} = queueConfig;
