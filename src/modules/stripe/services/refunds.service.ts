/**
 * خدمة إدارة الاستردادات - Refunds Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات إنشاء استرداد
 */
export interface CreateRefundData {
  paymentIntentId?: string;
  chargeId?: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

/**
 * الاسترداد المُنسق
 */
export interface FormattedRefund {
  id: string;
  amount: number;
  amountFormatted: string;
  currency: string;
  chargeId: string | null;
  paymentIntentId: string | null;
  reason: string | null;
  status: string;
  failureReason: string | null;
  metadata: Record<string, string>;
  created: string;
  receiptNumber: string | null;
  sourceTransferReversal: string | null;
  transferReversal: string | null;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة الاسترداد
 */
interface RefundResponse {
  refund: FormattedRefund;
}

/**
 * استجابة قائمة الاستردادات
 */
interface RefundsListResponse {
  refunds: FormattedRefund[];
  hasMore: boolean;
}

/**
 * خدمة إدارة الاستردادات
 * تتواصل مع خادم Stripe على البورت 4242
 */
class StripeRefundsService {

  /**
   * إنشاء استرداد جديد
   * POST /api/refunds
   */
  async createRefund(data: CreateRefundData): ServiceResult<FormattedRefund> {
    try {
      if (!data.paymentIntentId && !data.chargeId) {
        return [null, new Error('Payment Intent ID or Charge ID is required')];
      }

      const requestBody: Record<string, unknown> = {
        paymentIntentId: data.paymentIntentId,
        chargeId: data.chargeId,
        amount: data.amount,
        reason: data.reason,
        metadata: data.metadata,
      };

      const [response, error] = await stripeApi.post<RefundResponse>(
        '/refunds',
        requestBody,
        stripeApi.generateIdempotencyKey('refund_create')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء الاسترداد')];
      }

      console.log(`✅ Refund created: ${response?.refund?.id}`);
      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء الاسترداد')];
    }
  }

  /**
   * استرداد كامل المبلغ
   * POST /api/refunds/full
   */
  async createFullRefund(
    paymentIntentId: string,
    options?: {
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      metadata?: Record<string, string>;
    }
  ): ServiceResult<FormattedRefund> {
    try {
      if (!paymentIntentId) {
        return [null, new Error('Payment Intent ID is required')];
      }

      const requestBody: Record<string, unknown> = {
        paymentIntentId,
        reason: options?.reason,
        metadata: options?.metadata,
      };

      const [response, error] = await stripeApi.post<RefundResponse>(
        '/refunds/full',
        requestBody,
        stripeApi.generateIdempotencyKey(`refund_full_${paymentIntentId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء الاسترداد الكامل')];
      }

      console.log(`✅ Full refund created for: ${paymentIntentId}`);
      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء الاسترداد الكامل')];
    }
  }

  /**
   * استرداد جزئي
   * POST /api/refunds/partial
   */
  async createPartialRefund(
    paymentIntentId: string,
    amount: number,
    options?: {
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      metadata?: Record<string, string>;
    }
  ): ServiceResult<FormattedRefund> {
    try {
      if (!paymentIntentId || !amount) {
        return [null, new Error('Payment Intent ID and amount are required')];
      }

      const requestBody: Record<string, unknown> = {
        paymentIntentId,
        amount,
        reason: options?.reason,
        metadata: options?.metadata,
      };

      const [response, error] = await stripeApi.post<RefundResponse>(
        '/refunds/partial',
        requestBody,
        stripeApi.generateIdempotencyKey(`refund_partial_${paymentIntentId}_${amount}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء الاسترداد الجزئي')];
      }

      console.log(`✅ Partial refund created: ${amount} for ${paymentIntentId}`);
      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء الاسترداد الجزئي')];
    }
  }

  /**
   * الحصول على استرداد
   * GET /api/refunds/:refundId
   */
  async getRefund(refundId: string): ServiceResult<FormattedRefund> {
    try {
      if (!refundId) {
        return [null, new Error('Refund ID is required')];
      }

      const [response, error] = await stripeApi.get<RefundResponse>(
        `/refunds/${refundId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب الاسترداد')];
      }

      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاسترداد')];
    }
  }

  /**
   * تحديث metadata الاسترداد
   * PUT /api/refunds/:refundId
   */
  async updateRefund(refundId: string, metadata: Record<string, string>): ServiceResult<FormattedRefund> {
    try {
      if (!refundId) {
        return [null, new Error('Refund ID is required')];
      }

      const [response, error] = await stripeApi.put<RefundResponse>(
        `/refunds/${refundId}`,
        { metadata }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في تحديث الاسترداد')];
      }

      console.log(`✅ Refund updated: ${refundId}`);
      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث الاسترداد')];
    }
  }

  /**
   * إلغاء استرداد معلق
   * POST /api/refunds/:refundId/cancel
   */
  async cancelRefund(refundId: string): ServiceResult<FormattedRefund> {
    try {
      if (!refundId) {
        return [null, new Error('Refund ID is required')];
      }

      const [response, error] = await stripeApi.post<RefundResponse>(
        `/refunds/${refundId}/cancel`,
        {},
        stripeApi.generateIdempotencyKey(`refund_cancel_${refundId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إلغاء الاسترداد')];
      }

      console.log(`✅ Refund canceled: ${refundId}`);
      return [response?.refund || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إلغاء الاسترداد')];
    }
  }

  /**
   * الحصول على قائمة الاستردادات
   * GET /api/refunds
   */
  async listRefunds(options?: {
    limit?: number;
    startingAfter?: string;
    charge?: string;
    paymentIntent?: string;
  }): ServiceResult<{ refunds: FormattedRefund[]; hasMore: boolean }> {
    try {
      const params: Record<string, string | number> = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.startingAfter) params.starting_after = options.startingAfter;
      if (options?.charge) params.charge = options.charge;
      if (options?.paymentIntent) params.payment_intent = options.paymentIntent;

      const [response, error] = await stripeApi.get<RefundsListResponse>(
        '/refunds',
        params
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب قائمة الاستردادات')];
      }

      return [response || { refunds: [], hasMore: false }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب قائمة الاستردادات')];
    }
  }
}

// تصدير instance واحد (Singleton)
const stripeRefundsService = new StripeRefundsService();

export default stripeRefundsService;
export { StripeRefundsService };
