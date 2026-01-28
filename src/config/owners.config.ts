import joi from 'joi';
import type { ObjectSchema, ValidationResult } from 'joi';

const types = joi.types();
const { string, number, object } = types;

interface OwnersConfigEnv {
  ownerIDs: string[];
}

// تعريف Schema للتحقق من الإعدادات
const ownerSchema: ObjectSchema = object.keys({
  ownerIDs: string.default('').custom((value: string) => {
    if (!value) return [];
    return value.split(',').map((id: string) => id.trim());
  }),
}).unknown();

const { value: ownerConfig, error } = ownerSchema.validate(process.env, {
  abortEarly: false,
}) as ValidationResult<OwnersConfigEnv>;

if (error) {
  throw new Error(
    `Owners configuration validation error: ${error.details.map((x) => x.message).join(', ')}`
  );
}

export const {
  ownerIDs,
} = ownerConfig;
