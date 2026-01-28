import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface WebSocketConfigEnv {
  WEBSOCKET_PORT: number;
  WEBSOCKET_PATH: string;
  WEBSOCKET_ORIGIN: string;
}

// تعريف Schema للتحقق من الإعدادات
const websocketSchema: ObjectSchema = object.keys({
  WEBSOCKET_PORT: number.integer().min(1).max(65535).default(8080),
  WEBSOCKET_PATH: string.default('/ws'),
  WEBSOCKET_ORIGIN: string.default('*'),
}).unknown();

const { value: websocketConfig, error } = websocketSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<WebSocketConfigEnv>;

if (error) {
  throw new Error(
    `WebSocket configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  WEBSOCKET_PORT,
  WEBSOCKET_PATH,
  WEBSOCKET_ORIGIN,
} = websocketConfig;
