import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, object } = types;

interface KafkaConfigEnv {
  KAFKA_BROKER: string;
  KAFKA_CLIENT_ID: string;
  KAFKA_GROUP_ID: string;
}

// تعريف Schema للتحقق من الإعدادات
const kafkaSchema: ObjectSchema = object.keys({
  KAFKA_BROKER: string.required(),
  KAFKA_CLIENT_ID: string.required(),
  KAFKA_GROUP_ID: string.required(),
}).unknown();

const { value: kafkaConfig, error } = kafkaSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<KafkaConfigEnv>;

if (error) {
  throw new Error(
    `Kafka configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  KAFKA_BROKER,
  KAFKA_CLIENT_ID,
  KAFKA_GROUP_ID,
} = kafkaConfig;
