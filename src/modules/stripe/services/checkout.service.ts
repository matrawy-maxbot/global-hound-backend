/**
 * خدمة إدارة Checkout Sessions - Checkout Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات إنشاء Checkout Session للاشتراك
 */
export interface CreateSubscriptionCheckoutData {
  priceId: string;
  quantity?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  allowPromotionCodes?: boolean;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * بيانات إنشاء Checkout Session للدفع لمرة واحدة
 */
export interface CreatePaymentCheckoutData {
  lineItems: Array<{
    price: string;
    quantity: number;
  }>;
  customerEmail?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Checkout Session المُنسق
 */
export interface FormattedCheckoutSession {
  id: string;
  url: string;
  status: string;
  mode: 'payment' | 'subscription' | 'setup';
  customerId: string | null;
  customerEmail: string | null;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  subscriptionId: string | null;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  expiresAt: string;
  created: string;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة Checkout Session
 */
interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * استجابة تفاصيل Checkout Session
 */
interface CheckoutSessionDetailsResponse {
  session: FormattedCheckoutSession;
}

/**
 * استجابة قائمة Checkout Sessions
 */
interface CheckoutSessionsListResponse {
  sessions: FormattedCheckoutSession[];
  hasMore: boolean;
}

/**
 * خدمة إدارة Checkout Sessions
 * تتواصل مع خادم Stripe على البورت 4242
 */
class StripeCheckoutService {

  /**
   * إنشاء Checkout Session للاشتراك
   * POST /api/checkout/subscription
   */
  async createSubscriptionCheckout(data: CreateSubscriptionCheckoutData): ServiceResult<{ sessionId: string; url: string }> {
    try {
      if (!data.priceId) {
        return [null, new Error('Price ID is required')];
      }

      const requestBody: Record<string, unknown> = {
        priceId: data.priceId,
        quantity: data.quantity || 1,
        trialPeriodDays: data.trialPeriodDays,
        metadata: data.metadata,
        allowPromotionCodes: data.allowPromotionCodes,
      };

      // إضافة URLs إذا تم توفيرها
      if (data.successUrl) requestBody.successUrl = data.successUrl;
      if (data.cancelUrl) requestBody.cancelUrl = data.cancelUrl;

      const [response, error] = await stripeApi.post<CheckoutSessionResponse>(
        '/checkout/subscription',
        requestBody,
        stripeApi.generateIdempotencyKey(`checkout_sub_${data.priceId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء جلسة Checkout')];
      }

      console.log(`✅ Checkout session created: ${response?.sessionId}`);
      return [response || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء جلسة Checkout')];
    }
  }

  /**
   * إنشاء Checkout Session للدفع لمرة واحدة
   * POST /api/checkout/payment
   */
  async createPaymentCheckout(data: CreatePaymentCheckoutData): ServiceResult<{ sessionId: string; url: string }> {
    try {
      if (!data.lineItems || data.lineItems.length === 0) {
        return [null, new Error('Line items are required')];
      }

      const requestBody: Record<string, unknown> = {
        lineItems: data.lineItems,
        customerEmail: data.customerEmail,
        metadata: data.metadata,
      };

      if (data.successUrl) requestBody.successUrl = data.successUrl;
      if (data.cancelUrl) requestBody.cancelUrl = data.cancelUrl;

      const [response, error] = await stripeApi.post<CheckoutSessionResponse>(
        '/checkout/payment',
        requestBody,
        stripeApi.generateIdempotencyKey('checkout_payment')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء جلسة Checkout')];
      }

      console.log(`✅ Checkout session created: ${response?.sessionId}`);
      return [response || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء جلسة Checkout')];
    }
  }

  /**
   * الحصول على تفاصيل Checkout Session
   * GET /api/checkout/:sessionId
   */
  async getCheckoutSession(sessionId: string): ServiceResult<FormattedCheckoutSession> {
    try {
      if (!sessionId) {
        return [null, new Error('Session ID is required')];
      }

      const [response, error] = await stripeApi.get<CheckoutSessionDetailsResponse>(
        `/checkout/${sessionId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب جلسة Checkout')];
      }

      return [response?.session || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب جلسة Checkout')];
    }
  }

  /**
   * إلغاء Checkout Session
   * POST /api/checkout/:sessionId/expire
   */
  async expireCheckoutSession(sessionId: string): ServiceResult<FormattedCheckoutSession> {
    try {
      if (!sessionId) {
        return [null, new Error('Session ID is required')];
      }

      const [response, error] = await stripeApi.post<CheckoutSessionDetailsResponse>(
        `/checkout/${sessionId}/expire`,
        {},
        stripeApi.generateIdempotencyKey(`checkout_expire_${sessionId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إلغاء جلسة Checkout')];
      }

      console.log(`✅ Checkout session expired: ${sessionId}`);
      return [response?.session || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إلغاء جلسة Checkout')];
    }
  }

  /**
   * الحصول على قائمة Checkout Sessions للعميل الحالي
   * GET /api/checkout
   */
  async listCheckoutSessions(options?: {
    status?: 'open' | 'complete' | 'expired';
    limit?: number;
  }): ServiceResult<{ sessions: FormattedCheckoutSession[]; hasMore: boolean }> {
    try {
      const params: Record<string, string | number> = {};
      if (options?.status) params.status = options.status;
      if (options?.limit) params.limit = options.limit;

      const [response, error] = await stripeApi.get<CheckoutSessionsListResponse>(
        '/checkout',
        params
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب قائمة Checkout Sessions')];
      }

      return [response || { sessions: [], hasMore: false }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب قائمة Checkout Sessions')];
    }
  }
}

// تصدير instance واحد (Singleton)
const stripeCheckoutService = new StripeCheckoutService();

export default stripeCheckoutService;
export { StripeCheckoutService };
