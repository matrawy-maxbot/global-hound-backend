/**
 * خدمة إدارة اشتراكات Stripe - Stripe Subscriptions Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import SubscriptionsService, {
  SubscriptionData,
  SubscriptionStatus,
  BillingInterval
} from '../../database/postgreSQL/services/subscriptions.service.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات إنشاء اشتراك
 */
export interface CreateStripeSubscriptionData {
  userId: string;
  customerId: string;
  priceId: string;
  quantity?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  paymentBehavior?: 'default_incomplete' | 'allow_incomplete' | 'error_if_incomplete' | 'pending_if_incomplete';
  defaultPaymentMethod?: string;
  couponId?: string;
}

/**
 * بيانات تحديث اشتراك
 */
export interface UpdateStripeSubscriptionData {
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  defaultPaymentMethod?: string;
  couponId?: string | null;
}

/**
 * الاشتراك المُنسق
 */
export interface FormattedStripeSubscription {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  planName: string;
  billingInterval: BillingInterval;
  billingIntervalCount: number;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  defaultPaymentMethodId: string | null;
  latestInvoiceId: string | null;
  metadata: Record<string, string>;
  clientSecret?: string;
}

/**
 * الاشتراك الخام من الخادم
 */
interface RawSubscription {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  startDate: string;
  created: string;
  items: Array<{
    id: string;
    price: {
      id: string;
      product: string | { name: string };
      unit_amount: number;
      currency: string;
      recurring?: {
        interval: string;
        interval_count: number;
      };
    };
    quantity: number;
  }>;
  latestInvoiceId: string | null;
  defaultPaymentMethodId: string | null;
  metadata: Record<string, string>;
  collectionMethod: string;
  currency: string;
  livemode: boolean;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة الاشتراك
 */
interface SubscriptionResponse {
  subscription: RawSubscription;
  clientSecret?: string;
}

/**
 * استجابة قائمة الاشتراكات
 */
interface SubscriptionsListResponse {
  subscriptions: RawSubscription[];
  hasMore?: boolean;
}

/**
 * استجابة معاينة الفاتورة
 */
interface InvoicePreviewResponse {
  total: number;
  subtotal: number;
  currency: string;
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

/**
 * خدمة إدارة اشتراكات Stripe
 * تتواصل مع خادم Stripe على البورت 4242 وتحدّث قاعدة البيانات المحلية
 */
class StripeSubscriptionsService {

  /**
   * تحويل حالة Stripe إلى حالة محلية
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      'incomplete': SubscriptionStatus.INCOMPLETE,
      'incomplete_expired': SubscriptionStatus.INCOMPLETE_EXPIRED,
      'trialing': SubscriptionStatus.TRIALING,
      'active': SubscriptionStatus.ACTIVE,
      'past_due': SubscriptionStatus.PAST_DUE,
      'canceled': SubscriptionStatus.CANCELED,
      'unpaid': SubscriptionStatus.UNPAID,
      'paused': SubscriptionStatus.PAUSED,
    };
    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  /**
   * تحويل فترة الفوترة
   */
  private mapBillingInterval(interval: string): BillingInterval {
    const intervalMap: Record<string, BillingInterval> = {
      'day': BillingInterval.DAY,
      'week': BillingInterval.WEEK,
      'month': BillingInterval.MONTH,
      'year': BillingInterval.YEAR,
    };
    return intervalMap[interval] || BillingInterval.MONTH;
  }

  /**
   * تنسيق الاشتراك الخام
   */
  private formatSubscription(raw: RawSubscription, clientSecret?: string): FormattedStripeSubscription {
    const item = raw.items?.[0];
    const price = item?.price;
    const productName = typeof price?.product === 'object' ? price.product.name : 'Unknown Plan';

    return {
      id: raw.id,
      stripeSubscriptionId: raw.id,
      stripeCustomerId: raw.customerId,
      stripePriceId: price?.id || '',
      status: this.mapStripeStatus(raw.status),
      planName: productName,
      billingInterval: this.mapBillingInterval(price?.recurring?.interval || 'month'),
      billingIntervalCount: price?.recurring?.interval_count || 1,
      amount: price?.unit_amount || 0,
      currency: raw.currency || price?.currency || 'usd',
      currentPeriodStart: new Date(raw.currentPeriodStart),
      currentPeriodEnd: new Date(raw.currentPeriodEnd),
      cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
      canceledAt: raw.canceledAt ? new Date(raw.canceledAt) : null,
      trialStart: raw.trialStart ? new Date(raw.trialStart) : null,
      trialEnd: raw.trialEnd ? new Date(raw.trialEnd) : null,
      defaultPaymentMethodId: raw.defaultPaymentMethodId,
      latestInvoiceId: raw.latestInvoiceId,
      metadata: raw.metadata || {},
      clientSecret,
    };
  }

  /**
   * مزامنة اشتراك مع قاعدة البيانات المحلية
   */
  private async syncToDatabase(
    userId: string,
    formatted: FormattedStripeSubscription
  ): ServiceResult<SubscriptionData> {
    const subscriptionData: SubscriptionData = {
      user_id: userId,
      stripe_subscription_id: formatted.stripeSubscriptionId,
      stripe_customer_id: formatted.stripeCustomerId,
      stripe_price_id: formatted.stripePriceId,
      plan_name: formatted.planName,
      status: formatted.status,
      billing_interval: formatted.billingInterval,
      billing_interval_count: formatted.billingIntervalCount,
      amount: formatted.amount,
      currency: formatted.currency,
      current_period_start: formatted.currentPeriodStart,
      current_period_end: formatted.currentPeriodEnd,
      cancel_at_period_end: formatted.cancelAtPeriodEnd,
      canceled_at: formatted.canceledAt || null,
      trial_start: formatted.trialStart || null,
      trial_end: formatted.trialEnd || null,
      default_payment_method: formatted.defaultPaymentMethodId || null,
      metadata: formatted.metadata,
    };

    return await SubscriptionsService.upsertFromStripe(
      formatted.stripeSubscriptionId,
      subscriptionData
    );
  }

  /**
   * إنشاء اشتراك جديد
   * POST /api/subscriptions
   */
  async createSubscription(data: CreateStripeSubscriptionData): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!data.customerId || !data.priceId || !data.userId) {
        return [null, new Error('Customer ID, Price ID, and User ID are required')];
      }

      // التحقق من عدم وجود اشتراك نشط
      const [existingActive] = await SubscriptionsService.getActiveByUserId(data.userId);
      if (existingActive) {
        return [null, new Error('User already has an active subscription')];
      }

      const requestBody: Record<string, unknown> = {
        priceId: data.priceId,
        quantity: data.quantity || 1,
        metadata: {
          ...data.metadata,
          user_id: data.userId,
        },
      };

      if (data.trialPeriodDays !== undefined) requestBody.trialPeriodDays = data.trialPeriodDays;
      if (data.paymentBehavior) requestBody.paymentBehavior = data.paymentBehavior;
      if (data.defaultPaymentMethod) requestBody.defaultPaymentMethod = data.defaultPaymentMethod;
      if (data.couponId) requestBody.couponId = data.couponId;

      // ✅ إرسال customerId في Cookie (كما يتوقع stripe_server)
      const [response, error] = await stripeApi.post<SubscriptionResponse>(
        '/subscriptions',
        requestBody,
        stripeApi.generateIdempotencyKey(`sub_create_${data.priceId}`),
        data.customerId // ✅ customerId يُرسل في Cookie
      );

      if (error) {
        console.error('❌ Error creating subscription:', error);
        return [null, resolveError(error, 'فشل في إنشاء الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned from server')];
      }

      const formatted = this.formatSubscription(response.subscription, response.clientSecret);
      console.log(`✅ Subscription created via Stripe Server: ${formatted.id}`);

      // مزامنة مع قاعدة البيانات
      await this.syncToDatabase(data.userId, formatted);

      return [formatted, null];
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      return [null, resolveError(error as Error, 'فشل في إنشاء الاشتراك')];
    }
  }

  /**
   * الحصول على اشتراك
   * GET /api/subscriptions/:subscriptionId
   */
  async getSubscription(subscriptionId: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const [response, error] = await stripeApi.get<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('Subscription not found')];
      }

      return [this.formatSubscription(response.subscription), null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراك')];
    }
  }

  /**
   * الحصول على اشتراكات العميل الحالي
   * GET /api/subscriptions
   */
  async getMySubscriptions(status?: string): ServiceResult<FormattedStripeSubscription[]> {
    try {
      const params: Record<string, string | number> = {};
      if (status) params.status = status;

      const [response, error] = await stripeApi.get<SubscriptionsListResponse>(
        '/subscriptions',
        params
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب الاشتراكات')];
      }

      const formatted = response?.subscriptions?.map(sub => this.formatSubscription(sub)) || [];
      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات')];
    }
  }

  /**
   * تحديث اشتراك
   * PUT /api/subscriptions/:subscriptionId
   */
  async updateSubscription(
    subscriptionId: string,
    data: UpdateStripeSubscriptionData,
    userId?: string
  ): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const requestBody: Record<string, unknown> = {};

      if (data.priceId) requestBody.priceId = data.priceId;
      if (data.quantity !== undefined) requestBody.quantity = data.quantity;
      if (data.metadata !== undefined) requestBody.metadata = data.metadata;
      if (data.prorationBehavior) requestBody.prorationBehavior = data.prorationBehavior;
      if (data.defaultPaymentMethod) requestBody.defaultPaymentMethod = data.defaultPaymentMethod;
      if (data.couponId !== undefined) requestBody.couponId = data.couponId;

      const [response, error] = await stripeApi.put<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}`,
        requestBody
      );

      if (error) {
        return [null, resolveError(error, 'فشل في تحديث الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      const formatted = this.formatSubscription(response.subscription);
      console.log(`✅ Subscription updated via Stripe Server: ${subscriptionId}`);

      // مزامنة مع قاعدة البيانات
      const userIdToUse = userId || formatted.metadata?.user_id;
      if (userIdToUse) {
        await this.syncToDatabase(userIdToUse, formatted);
      }

      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث الاشتراك')];
    }
  }

  /**
   * إلغاء اشتراك فوراً
   * DELETE /api/subscriptions/:subscriptionId
   */
  async cancelSubscription(subscriptionId: string, userId?: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const [response, error] = await stripeApi.delete<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إلغاء الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      const formatted = this.formatSubscription(response.subscription);
      console.log(`✅ Subscription canceled via Stripe Server: ${subscriptionId}`);

      // مزامنة مع قاعدة البيانات
      const userIdToUse = userId || formatted.metadata?.user_id;
      if (userIdToUse) {
        await this.syncToDatabase(userIdToUse, formatted);
      }

      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إلغاء الاشتراك')];
    }
  }

  /**
   * جدولة إلغاء الاشتراك في نهاية الفترة
   * POST /api/subscriptions/:subscriptionId/cancel-at-period-end
   */
  async cancelAtPeriodEnd(subscriptionId: string, userId?: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const [response, error] = await stripeApi.post<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}/cancel-at-period-end`,
        {},
        stripeApi.generateIdempotencyKey(`sub_cancel_${subscriptionId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جدولة إلغاء الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      const formatted = this.formatSubscription(response.subscription);
      console.log(`✅ Subscription scheduled for cancellation: ${subscriptionId}`);

      // مزامنة مع قاعدة البيانات
      const userIdToUse = userId || formatted.metadata?.user_id;
      if (userIdToUse) {
        await this.syncToDatabase(userIdToUse, formatted);
      }

      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جدولة إلغاء الاشتراك')];
    }
  }

  /**
   * إعادة تفعيل اشتراك
   * POST /api/subscriptions/:subscriptionId/reactivate
   */
  async reactivateSubscription(subscriptionId: string, userId?: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const [response, error] = await stripeApi.post<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}/reactivate`,
        {},
        stripeApi.generateIdempotencyKey(`sub_reactivate_${subscriptionId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إعادة تفعيل الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      const formatted = this.formatSubscription(response.subscription);
      console.log(`✅ Subscription reactivated: ${subscriptionId}`);

      // مزامنة مع قاعدة البيانات
      const userIdToUse = userId || formatted.metadata?.user_id;
      if (userIdToUse) {
        await this.syncToDatabase(userIdToUse, formatted);
      }

      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إعادة تفعيل الاشتراك')];
    }
  }

  /**
   * إيقاف اشتراك مؤقتاً
   * POST /api/subscriptions/:subscriptionId/pause
   */
  async pauseSubscription(subscriptionId: string, resumesAt?: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const requestBody: Record<string, unknown> = {};
      if (resumesAt) requestBody.resumesAt = resumesAt;

      const [response, error] = await stripeApi.post<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}/pause`,
        requestBody,
        stripeApi.generateIdempotencyKey(`sub_pause_${subscriptionId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إيقاف الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      return [this.formatSubscription(response.subscription), null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إيقاف الاشتراك')];
    }
  }

  /**
   * استئناف اشتراك متوقف
   * POST /api/subscriptions/:subscriptionId/resume
   */
  async resumeSubscription(subscriptionId: string): ServiceResult<FormattedStripeSubscription> {
    try {
      if (!subscriptionId) {
        return [null, new Error('Subscription ID is required')];
      }

      const [response, error] = await stripeApi.post<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}/resume`,
        {},
        stripeApi.generateIdempotencyKey(`sub_resume_${subscriptionId}`)
      );

      if (error) {
        return [null, resolveError(error, 'فشل في استئناف الاشتراك')];
      }

      if (!response?.subscription) {
        return [null, new Error('No subscription returned')];
      }

      return [this.formatSubscription(response.subscription), null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في استئناف الاشتراك')];
    }
  }

  /**
   * تغيير خطة الاشتراك
   */
  async changePlan(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations',
    userId?: string
  ): ServiceResult<FormattedStripeSubscription> {
    return this.updateSubscription(subscriptionId, {
      priceId: newPriceId,
      prorationBehavior,
    }, userId);
  }

  /**
   * معاينة فاتورة الترقية/التخفيض
   * GET /api/subscriptions/:subscriptionId/invoice-preview
   */
  async previewProration(
    subscriptionId: string,
    newPriceId: string
  ): ServiceResult<{
    immediateTotal: number;
    nextInvoiceTotal: number;
    prorationDate: Date;
    lineItems: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  }> {
    try {
      if (!subscriptionId || !newPriceId) {
        return [null, new Error('Subscription ID and new Price ID are required')];
      }

      const [response, error] = await stripeApi.get<InvoicePreviewResponse>(
        `/subscriptions/${subscriptionId}/invoice-preview`,
        { newPriceId }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في معاينة الفاتورة')];
      }

      return [{
        immediateTotal: response?.total || 0,
        nextInvoiceTotal: response?.subtotal || 0,
        prorationDate: new Date(),
        lineItems: response?.lines?.map(line => ({
          description: line.description || '',
          amount: line.amount,
          quantity: line.quantity || 1,
        })) || [],
      }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في معاينة الفاتورة')];
    }
  }

  /**
   * الحصول على اشتراكات العميل بواسطة Customer ID
   * ملاحظة: يتطلب صلاحيات Admin على الخادم
   */
  async getCustomerSubscriptions(
    customerId: string,
    status?: string
  ): ServiceResult<FormattedStripeSubscription[]> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      const params: Record<string, string | number> = { customer: customerId };
      if (status && status !== 'all') params.status = status;

      const [response, error] = await stripeApi.get<SubscriptionsListResponse>(
        '/subscriptions',
        params,
        customerId
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب اشتراكات العميل')];
      }

      const formatted = response?.subscriptions?.map(sub => this.formatSubscription(sub)) || [];
      return [formatted, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب اشتراكات العميل')];
    }
  }

  /**
   * معالجة Webhook من خادم Stripe
   * ملاحظة: هذه الوظيفة تُستخدم لمعالجة الأحداث المحلية
   */
  async handleWebhookEvent(event: {
    type: string;
    data: { object: RawSubscription & { metadata?: { user_id?: string } } };
  }): ServiceResult<boolean> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const userId = subscription.metadata?.user_id;

          if (userId) {
            const formatted = this.formatSubscription(subscription);
            await this.syncToDatabase(userId, formatted);
            console.log(`✅ Synced subscription ${subscription.id} for user ${userId}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const userId = subscription.metadata?.user_id;

          if (userId) {
            const formatted = this.formatSubscription(subscription);
            await this.syncToDatabase(userId, formatted);
            console.log(`✅ Synced deleted subscription ${subscription.id}`);
          }
          break;
        }

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed': {
          console.log(`📋 Invoice event: ${event.type}`);
          break;
        }
      }

      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في معالجة Webhook')];
    }
  }
}

// تصدير instance واحد (Singleton)
const stripeSubscriptionsService = new StripeSubscriptionsService();

export default stripeSubscriptionsService;
export { StripeSubscriptionsService };
