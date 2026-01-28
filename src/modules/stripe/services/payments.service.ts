/**
 * خدمة إدارة المدفوعات - Payments Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات إنشاء Payment Intent
 */
export interface CreatePaymentIntentData {
  amount: number;
  currency: string;
  paymentMethodTypes?: string[];
  description?: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
}

/**
 * بيانات تحديث Payment Intent
 */
export interface UpdatePaymentIntentData {
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
}

/**
 * Payment Intent المُنسق
 */
export interface FormattedPaymentIntent {
  id: string;
  amount: number;
  amountFormatted: string;
  amountReceived: number;
  currency: string;
  status: string;
  clientSecret: string;
  customerId: string | null;
  paymentMethodId: string | null;
  description: string | null;
  metadata: Record<string, string>;
  receiptEmail: string | null;
  captureMethod: string;
  confirmationMethod: string;
  created: string;
  canceledAt: string | null;
  cancellationReason: string | null;
  latestChargeId: string | null;
  livemode: boolean;
  setupFutureUsage: string | null;
  statementDescriptor: string | null;
  statementDescriptorSuffix: string | null;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة Payment Intent
 */
interface PaymentIntentResponse {
  paymentIntent: FormattedPaymentIntent;
  clientSecret: string;
}

/**
 * استجابة قائمة Payment Intents
 */
interface PaymentIntentsListResponse {
  paymentIntents: FormattedPaymentIntent[];
  hasMore: boolean;
}

/**
 * خدمة إدارة المدفوعات
 * تتواصل مع خادم Stripe على البورت 4242
 */
class StripePaymentsService {

  /**
   * إنشاء Payment Intent جديد
   * POST /api/payments/intents
   */
  async createPaymentIntent(data: CreatePaymentIntentData): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!data.amount || !data.currency) {
        return [null, new Error('Amount and currency are required')];
      }

      const requestBody: Record<string, unknown> = {
        amount: data.amount,
        currency: data.currency,
        paymentMethodTypes: data.paymentMethodTypes || ['card'],
        description: data.description,
        metadata: data.metadata,
        receiptEmail: data.receiptEmail,
        captureMethod: data.captureMethod,
        setupFutureUsage: data.setupFutureUsage,
      };

      const [response, error] = await stripeApi.post<PaymentIntentResponse>(
        '/payments/intents',
        requestBody,
        stripeApi.generateIdempotencyKey('pi_create')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء Payment Intent')];
      }

      console.log(`✅ Payment Intent created via Stripe Server: ${response?.paymentIntent?.id}`);
      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء Payment Intent')];
    }
  }

  /**
   * إنشاء Payment Intent بسيط
   * POST /api/payments/simple
   */
  async createSimplePaymentIntent(amount: number, currency: string = 'usd'): ServiceResult<FormattedPaymentIntent> {
    try {
      const [response, error] = await stripeApi.post<PaymentIntentResponse>(
        '/payments/simple',
        { amount, currency },
        stripeApi.generateIdempotencyKey('pi_simple')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء Payment Intent')];
      }

      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء Payment Intent')];
    }
  }

  /**
   * الحصول على Payment Intent
   * GET /api/payments/intents/:paymentIntentId
   */
  async getPaymentIntent(paymentIntentId: string): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const [response, error] = await stripeApi.get<PaymentIntentResponse>(
        `/payments/intents/${paymentIntentId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب Payment Intent')];
      }

      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب Payment Intent')];
    }
  }

  /**
   * الحصول على قائمة Payment Intents
   * GET /api/payments/intents
   */
  async listPaymentIntents(options?: {
    limit?: number;
    startingAfter?: string;
  }): ServiceResult<{ paymentIntents: FormattedPaymentIntent[]; hasMore: boolean }> {
    try {
      const params: Record<string, string | number> = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.startingAfter) params.starting_after = options.startingAfter;

      const [response, error] = await stripeApi.get<PaymentIntentsListResponse>(
        '/payments/intents',
        params
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب قائمة Payment Intents')];
      }

      return [response || { paymentIntents: [], hasMore: false }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب قائمة Payment Intents')];
    }
  }

  /**
   * تحديث Payment Intent
   * PUT /api/payments/intents/:paymentIntentId
   */
  async updatePaymentIntent(paymentIntentId: string, data: UpdatePaymentIntentData): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const [response, error] = await stripeApi.put<PaymentIntentResponse>(
        `/payments/intents/${paymentIntentId}`,
        data as Record<string, unknown>
      );

      if (error) {
        return [null, resolveError(error, 'فشل في تحديث Payment Intent')];
      }

      console.log(`✅ Payment Intent updated: ${paymentIntentId}`);
      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث Payment Intent')];
    }
  }

  /**
   * تأكيد Payment Intent
   * POST /api/payments/intents/:paymentIntentId/confirm
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    options?: {
      paymentMethodId?: string;
      returnUrl?: string;
      receiptEmail?: string;
      setupFutureUsage?: 'off_session' | 'on_session';
    }
  ): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const [response, error] = await stripeApi.post<PaymentIntentResponse>(
        `/payments/intents/${paymentIntentId}/confirm`,
        options as Record<string, unknown>,
        stripeApi.generateIdempotencyKey(`pi_confirm_${paymentIntentId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في تأكيد Payment Intent')];
      }

      console.log(`✅ Payment Intent confirmed: ${paymentIntentId}`);
      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تأكيد Payment Intent')];
    }
  }

  /**
   * التقاط Payment Intent (للـ Manual Capture)
   * POST /api/payments/intents/:paymentIntentId/capture
   */
  async capturePaymentIntent(paymentIntentId: string, amountToCapture?: number): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const requestBody: Record<string, unknown> = {};
      if (amountToCapture !== undefined) {
        requestBody.amountToCapture = amountToCapture;
      }

      const [response, error] = await stripeApi.post<PaymentIntentResponse>(
        `/payments/intents/${paymentIntentId}/capture`,
        requestBody,
        stripeApi.generateIdempotencyKey(`pi_capture_${paymentIntentId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في التقاط Payment Intent')];
      }

      console.log(`✅ Payment Intent captured: ${paymentIntentId}`);
      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في التقاط Payment Intent')];
    }
  }

  /**
   * إلغاء Payment Intent
   * POST /api/payments/intents/:paymentIntentId/cancel
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    cancellationReason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'abandoned'
  ): ServiceResult<FormattedPaymentIntent> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const requestBody: Record<string, unknown> = {};
      if (cancellationReason) {
        requestBody.cancellationReason = cancellationReason;
      }

      const [response, error] = await stripeApi.post<PaymentIntentResponse>(
        `/payments/intents/${paymentIntentId}/cancel`,
        requestBody,
        stripeApi.generateIdempotencyKey(`pi_cancel_${paymentIntentId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إلغاء Payment Intent')];
      }

      console.log(`✅ Payment Intent canceled: ${paymentIntentId}`);
      return [response?.paymentIntent || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إلغاء Payment Intent')];
    }
  }
}

// تصدير instance واحد (Singleton)
const stripePaymentsService = new StripePaymentsService();

export default stripePaymentsService;
export { StripePaymentsService };
