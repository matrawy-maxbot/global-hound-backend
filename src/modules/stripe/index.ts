/**
 * Stripe Module - Export all Stripe services
 * 
 * تم تحديث هذا الموديول ليتواصل مع خادم Stripe الخارجي
 * على البورت 4242 بدلاً من استخدام Stripe SDK مباشرة
 */

// Stripe API Client - التواصل مع خادم Stripe على البورت 4242
export { stripeApi, StripeApiClient } from './stripe.api.js';

// Services - خدمات Stripe
export { default as plansService, PlansService } from './services/plans.service.js';
export type { FormattedPrice, FormattedProduct } from './services/plans.service.js';

export { default as stripeSubscriptionsService, StripeSubscriptionsService } from './services/stripe-subscriptions.service.js';
export type { 
  CreateStripeSubscriptionData, 
  UpdateStripeSubscriptionData, 
  FormattedStripeSubscription 
} from './services/stripe-subscriptions.service.js';

export { default as stripeCustomerService, StripeCustomerService } from './services/customer.service.js';
export type { 
  FormattedCustomer, 
  CreateCustomerData, 
  UpdateCustomerData,
  PaymentMethod,
} from './services/customer.service.js';

export { default as stripePaymentsService, StripePaymentsService } from './services/payments.service.js';
export type {
  CreatePaymentIntentData,
  UpdatePaymentIntentData,
  FormattedPaymentIntent,
} from './services/payments.service.js';

export { default as stripeCheckoutService, StripeCheckoutService } from './services/checkout.service.js';
export type {
  CreateSubscriptionCheckoutData,
  CreatePaymentCheckoutData,
  FormattedCheckoutSession,
} from './services/checkout.service.js';

export { default as stripeRefundsService, StripeRefundsService } from './services/refunds.service.js';
export type {
  CreateRefundData,
  FormattedRefund,
} from './services/refunds.service.js';

// Config
export { 
  stripeConfig, 
  validateStripeConfig,
  SUBSCRIPTION_STATUSES,
  BILLING_INTERVALS,
  SUPPORTED_CURRENCIES,
  SUBSCRIPTION_DEFAULTS,
} from '../../config/stripe.config.js';
export type { 
  StripeSubscriptionStatus, 
  StripeBillingInterval, 
  SupportedCurrency 
} from '../../config/stripe.config.js';
