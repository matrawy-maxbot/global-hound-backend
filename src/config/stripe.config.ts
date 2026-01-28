import joi from 'joi';

/**
 * إعدادات Stripe
 * Stripe Configuration
 * 
 * الآن يتم التواصل مع خادم Stripe الخارجي على البورت 4242
 * بدلاً من استخدام Stripe SDK مباشرة
 */

interface StripeConfigEnv {
  STRIPE_SERVER_URL: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_ADMIN_API_KEY: string;
}

interface StripeConfig {
  /**
   * URL خادم Stripe الخارجي (البورت 4242)
   * هذا هو الخادم الذي يتعامل مع Stripe API
   */
  stripeServerUrl: string;
  /**
   * Publishable Key للـ Frontend
   */
  publishableKey: string;
  /**
   * Webhook Secret للتحقق من أحداث Stripe
   */
  webhookSecret: string;
  /**
   * Admin API Key للتواصل مع stripe_server
   */
  adminApiKey: string;
  /**
   * إصدار API (للتوافق فقط)
   */
  apiVersion: string;
}

const stripeEnvSchema: joi.ObjectSchema<StripeConfigEnv> = joi.object({
  STRIPE_SERVER_URL: joi.string().uri().default('http://localhost:4242/api').description('Stripe Server URL'),
  STRIPE_PUBLISHABLE_KEY: joi.string().allow('').default('').description('Stripe Publishable Key'),
  STRIPE_WEBHOOK_SECRET: joi.string().allow('').default('').description('Stripe Webhook Secret'),
  STRIPE_ADMIN_API_KEY: joi.string().required().description('Stripe Admin API Key for server communication'),
}).unknown(true);

const { value: stripeEnvVars, error: stripeValidationError } = stripeEnvSchema.validate(process.env, {
  abortEarly: false,
});

if (stripeValidationError) {
  console.warn('⚠️ Stripe configuration validation warning:', stripeValidationError.message);
}

/**
 * إعدادات Stripe المُصدّرة
 * 
 * ملاحظة مهمة: 
 * - stripeServerUrl: هو URL الخادم الخارجي على البورت 4242
 * - publishableKey: يُستخدم في Frontend فقط
 * - لم نعد نحتاج secretKey لأن الخادم الخارجي يتعامل معه
 */
export const stripeConfig: StripeConfig = {
  stripeServerUrl: stripeEnvVars?.STRIPE_SERVER_URL || process.env.STRIPE_SERVER_URL || 'http://localhost:4242/api',
  publishableKey: stripeEnvVars?.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: stripeEnvVars?.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '',
  adminApiKey: stripeEnvVars?.STRIPE_ADMIN_API_KEY || process.env.STRIPE_ADMIN_API_KEY || '',
  apiVersion: '2024-09-30.acacia',
};

/**
 * حالات الاشتراك - متوافقة مع Stripe
 */
export const SUBSCRIPTION_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
] as const;

export type StripeSubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

/**
 * فترات الفوترة
 */
export const BILLING_INTERVALS = ['day', 'week', 'month', 'year'] as const;
export type StripeBillingInterval = typeof BILLING_INTERVALS[number];

/**
 * العملات المدعومة (متوافقة مع التوثيق)
 */
export const SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'chf', 'sek', 'nok', 'dkk'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * إعدادات الاشتراك الافتراضية
 */
export const SUBSCRIPTION_DEFAULTS = {
  paymentBehavior: 'default_incomplete' as const,
  collectionMethod: 'charge_automatically' as const,
  prorationBehavior: 'create_prorations' as const,
};

/**
 * التحقق من صحة إعدادات Stripe
 */
export function validateStripeConfig(): boolean {
  if (!stripeConfig.stripeServerUrl) {
    console.error('❌ STRIPE_SERVER_URL is not configured');
    return false;
  }
  
  console.log(`✅ Stripe configuration validated - Server URL: ${stripeConfig.stripeServerUrl}`);
  return true;
}

export default stripeConfig;
