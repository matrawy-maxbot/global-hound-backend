import { Op, FindOptions, Order } from 'sequelize';
import { PGinsert, PGupdate, PGdelete, PGselectAll } from '../config/postgre.manager.js';
import { Subscription } from '../models/index.js';
import { SubscriptionStatus, BillingInterval } from '../models/Subscription.model.js';
import { resolveError } from '../../../../utils/errors/errorResolver.util.js';

// ===================== Types =====================

/**
 * بيانات الاشتراك - متوافقة مع Stripe
 */
interface SubscriptionData {
  id?: string;
  user_id: string;
  // Stripe IDs
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  // Plan info
  plan_name: string;
  status?: SubscriptionStatus;
  // Billing
  billing_interval: BillingInterval;
  billing_interval_count?: number;
  amount: number;
  currency?: string;
  // Dates
  current_period_start?: Date;
  current_period_end: Date;
  trial_start?: Date;
  trial_end?: Date;
  canceled_at?: Date;
  cancel_at_period_end?: boolean;
  // Payment
  default_payment_method?: string;
  // Metadata
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: unknown;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: Order;
}

/**
 * بيانات التحديث - متوافقة مع Stripe
 */
interface UpdateData {
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  plan_name?: string;
  status?: SubscriptionStatus;
  billing_interval?: BillingInterval;
  billing_interval_count?: number;
  amount?: number;
  currency?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  trial_start?: Date;
  trial_end?: Date;
  canceled_at?: Date;
  cancel_at_period_end?: boolean;
  default_payment_method?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

// ===================== Service Class =====================

/**
 * خدمة إدارة الاشتراكات - Subscriptions Service
 * تحتوي على جميع العمليات المتعلقة بإدارة اشتراكات المستخدمين
 * Contains all operations related to subscriptions management
 */
class SubscriptionsService {

  /**
   * الحصول على جميع الاشتراكات
   * Get all subscriptions
   */
  static async getAll(options: QueryOptions = {}): ServiceResult<SubscriptionData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const subscriptions = await Subscription.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات')];
    }
  }

  /**
   * الحصول على اشتراك بواسطة المعرف
   * Get subscription by ID
   */
  static async getById(id: string): ServiceResult<SubscriptionData> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف الاشتراك مطلوب'), 'فشل في جلب الاشتراك')];
      }

      const subscriptions = await PGselectAll(Subscription, { id });
      return [subscriptions[0] as SubscriptionData || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراك')];
    }
  }

  /**
   * الحصول على اشتراكات المستخدم
   * Get subscriptions by user ID
   */
  static async getByUserId(userId: string, options: QueryOptions = {}): ServiceResult<SubscriptionData[]> {
    try {
      if (!userId) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في جلب الاشتراكات')];
      }

      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        where: { user_id: userId },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const subscriptions = await Subscription.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب اشتراكات المستخدم')];
    }
  }

  /**
   * الحصول على الاشتراك النشط للمستخدم
   * Get active subscription for user
   */
  static async getActiveByUserId(userId: string): ServiceResult<SubscriptionData> {
    try {
      if (!userId) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في جلب الاشتراك النشط')];
      }

      const subscription = await Subscription.findOne({
        where: {
          user_id: userId,
          status: {
            [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
          }
        }
      });

      // تحويل Sequelize Model إلى plain object
      const subscriptionData = subscription ? (subscription.toJSON ? subscription.toJSON() : subscription) as SubscriptionData : null;
      return [subscriptionData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراك النشط')];
    }
  }

  /**
   * الحصول على اشتراك بواسطة Stripe Subscription ID
   * Get subscription by Stripe Subscription ID
   */
  static async getByStripeSubscriptionId(stripeSubscriptionId: string): ServiceResult<SubscriptionData> {
    try {
      if (!stripeSubscriptionId) {
        return [null, resolveError(new Error('معرف اشتراك Stripe مطلوب'), 'فشل في جلب الاشتراك')];
      }

      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscriptionId }
      });

      // تحويل Sequelize Model إلى plain object
      const subscriptionData = subscription ? (subscription.toJSON ? subscription.toJSON() : subscription) as SubscriptionData : null;
      return [subscriptionData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراك')];
    }
  }

  /**
   * الحصول على اشتراكات بواسطة Stripe Customer ID
   * Get subscriptions by Stripe Customer ID
   */
  static async getByStripeCustomerId(stripeCustomerId: string): ServiceResult<SubscriptionData[]> {
    try {
      if (!stripeCustomerId) {
        return [null, resolveError(new Error('معرف عميل Stripe مطلوب'), 'فشل في جلب الاشتراكات')];
      }

      const subscriptions = await Subscription.findAll({
        where: { stripe_customer_id: stripeCustomerId },
        order: [['created_at', 'DESC']]
      });

      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات')];
    }
  }

  /**
   * الحصول على الاشتراكات حسب الحالة
   * Get subscriptions by status
   */
  static async getByStatus(status: SubscriptionStatus, options: QueryOptions = {}): ServiceResult<SubscriptionData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        where: { status },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const subscriptions = await Subscription.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات')];
    }
  }

  /**
   * الحصول على الاشتراكات حسب الخطة
   * Get subscriptions by plan name
   */
  static async getByPlanName(planName: string, options: QueryOptions = {}): ServiceResult<SubscriptionData[]> {
    try {
      const { limit, offset, order = [['created_at', 'DESC']] } = options;
      
      const queryOptions: FindOptions = {
        where: { plan_name: planName },
        order,
        ...(limit && { limit }),
        ...(offset && { offset })
      };

      const subscriptions = await Subscription.findAll(queryOptions);
      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات')];
    }
  }

  /**
   * الحصول على الاشتراكات المنتهية قريباً
   * Get expiring subscriptions
   */
  static async getExpiringSoon(days: number = 7): ServiceResult<SubscriptionData[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const subscriptions = await Subscription.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          current_period_end: {
            [Op.between]: [new Date(), futureDate]
          }
        },
        order: [['current_period_end', 'ASC']]
      });

      // تحويل Sequelize Models إلى plain objects
      const subscriptionsData = subscriptions.map(sub => (sub.toJSON ? sub.toJSON() : sub) as SubscriptionData);
      return [subscriptionsData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراكات المنتهية قريباً')];
    }
  }

  /**
   * إنشاء اشتراك جديد
   * Create new subscription
   */
  static async create(subscriptionData: SubscriptionData): ServiceResult<SubscriptionData> {
    try {
      if (!subscriptionData || !subscriptionData.user_id) {
        return [null, resolveError(new Error('معرف المستخدم مطلوب'), 'فشل في إنشاء الاشتراك')];
      }

      // التحقق من عدم وجود اشتراك نشط للمستخدم
      const [existingActive] = await this.getActiveByUserId(subscriptionData.user_id);
      if (existingActive) {
        return [null, resolveError(new Error('المستخدم لديه اشتراك نشط بالفعل'), 'فشل في إنشاء الاشتراك')];
      }

      const newSubscription = await PGinsert(Subscription, {
        ...subscriptionData,
        status: subscriptionData.status || SubscriptionStatus.INCOMPLETE,
        current_period_start: subscriptionData.current_period_start || new Date(),
        cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
        billing_interval_count: subscriptionData.billing_interval_count || 1,
        currency: subscriptionData.currency || 'usd'
      });

      return [newSubscription.data as SubscriptionData, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء الاشتراك')];
    }
  }

  /**
   * إنشاء أو تحديث اشتراك من Stripe Webhook
   * Create or update subscription from Stripe Webhook
   */
  static async upsertFromStripe(stripeSubscriptionId: string, data: Partial<SubscriptionData>): ServiceResult<SubscriptionData> {
    try {
      const [existing] = await this.getByStripeSubscriptionId(stripeSubscriptionId);
      
      if (existing) {
        await this.update(existing.id!, data);
        const [updated] = await this.getById(existing.id!);
        return [updated, null];
      } else {
        return await this.create(data as SubscriptionData);
      }
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء/تحديث الاشتراك')];
    }
  }

  /**
   * تحديث اشتراك
   * Update subscription
   */
  static async update(id: string, updateData: UpdateData): ServiceResult<{ changedRows: number }> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف الاشتراك مطلوب'), 'فشل في التحديث')];
      }

      const result = await PGupdate(Subscription, updateData, { id });
      return [{ changedRows: result?.changedRows || 0 }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث الاشتراك')];
    }
  }

  /**
   * تفعيل اشتراك
   * Activate subscription
   */
  static async activate(id: string): ServiceResult<{ changedRows: number }> {
    try {
      return await this.update(id, { 
        status: SubscriptionStatus.ACTIVE
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تفعيل الاشتراك')];
    }
  }

  /**
   * تحديد نوع المعرف وجلب الاشتراك
   * Identify ID type and get subscription
   * يدعم كلاً من UUID و stripe_subscription_id
   */
  static async getByIdOrStripeId(identifier: string): ServiceResult<SubscriptionData> {
    try {
      // التحقق إذا كان المعرف هو stripe_subscription_id (يبدأ بـ sub_)
      if (identifier.startsWith('sub_')) {
        return await this.getByStripeSubscriptionId(identifier);
      }
      // وإلا نعتبره UUID
      return await this.getById(identifier);
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الاشتراك')];
    }
  }

  /**
   * تحديث اشتراك باستخدام ID أو stripe_subscription_id
   * Update subscription by ID or stripe_subscription_id
   */
  static async updateByIdOrStripeId(identifier: string, data: UpdateData): ServiceResult<{ changedRows: number }> {
    try {
      // التحقق إذا كان المعرف هو stripe_subscription_id (يبدأ بـ sub_)
      if (identifier.startsWith('sub_')) {
        // جلب الاشتراك أولاً للحصول على الـ id
        const [subscription, error] = await this.getByStripeSubscriptionId(identifier);
        if (error || !subscription) {
          return [null, resolveError(new Error('الاشتراك غير موجود'), 'فشل في تحديث الاشتراك')];
        }
        return await this.update((subscription as any).id, data);
      }
      // وإلا نستخدم الـ id مباشرة
      return await this.update(identifier, data);
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث الاشتراك')];
    }
  }

  /**
   * إلغاء اشتراك فوراً
   * Cancel subscription immediately
   * يدعم كلاً من UUID و stripe_subscription_id
   */
  static async cancel(identifier: string): ServiceResult<{ changedRows: number }> {
    try {
      return await this.updateByIdOrStripeId(identifier, {
        status: SubscriptionStatus.CANCELED,
        canceled_at: new Date()
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إلغاء الاشتراك')];
    }
  }

  /**
   * إيقاف الاشتراك مؤقتاً
   * Pause subscription temporarily
   * يدعم كلاً من UUID و stripe_subscription_id
   */
  static async pause(identifier: string): ServiceResult<{ changedRows: number }> {
    try {
      return await this.updateByIdOrStripeId(identifier, {
        status: SubscriptionStatus.PAUSED
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إيقاف الاشتراك مؤقتاً')];
    }
  }

  /**
   * استئناف اشتراك موقوف مؤقتاً
   * Resume a paused subscription
   * يدعم كلاً من UUID و stripe_subscription_id
   */
  static async resume(identifier: string): ServiceResult<{ changedRows: number }> {
    try {
      return await this.updateByIdOrStripeId(identifier, {
        status: SubscriptionStatus.ACTIVE
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في استئناف الاشتراك')];
    }
  }

  /**
   * تجديد اشتراك (تحديث الفترة)
   * Renew subscription (update period)
   */
  static async renew(id: string, newPeriodEnd: Date): ServiceResult<{ changedRows: number }> {
    try {
      return await this.update(id, {
        status: SubscriptionStatus.ACTIVE,
        current_period_start: new Date(),
        current_period_end: newPeriodEnd
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تجديد الاشتراك')];
    }
  }

  /**
   * تغيير خطة الاشتراك
   * Change subscription plan
   */
  static async changePlan(id: string, newPlanName: string, newPriceId: string, newAmount: number): ServiceResult<{ changedRows: number }> {
    try {
      return await this.update(id, {
        plan_name: newPlanName,
        stripe_price_id: newPriceId,
        amount: newAmount
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تغيير خطة الاشتراك')];
    }
  }

  /**
   * تحديث الاشتراكات المنتهية
   * Update expired subscriptions
   */
  static async updateExpiredSubscriptions(): ServiceResult<number> {
    try {
      const [affectedCount] = await Subscription.update(
        { status: SubscriptionStatus.PAST_DUE },
        {
          where: {
            status: SubscriptionStatus.ACTIVE,
            current_period_end: {
              [Op.lt]: new Date()
            }
          }
        }
      );

      return [affectedCount, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث الاشتراكات المنتهية')];
    }
  }

  /**
   * حذف اشتراك
   * Delete subscription
   */
  static async delete(id: string): ServiceResult<boolean> {
    try {
      if (!id) {
        return [null, resolveError(new Error('معرف الاشتراك مطلوب'), 'فشل في حذف الاشتراك')];
      }

      await PGdelete(Subscription, { id });
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف الاشتراك')];
    }
  }

  /**
   * إحصائيات الاشتراكات
   * Get subscription statistics
   */
  static async getStatistics(): ServiceResult<{
    total: number;
    active: number;
    trialing: number;
    canceled: number;
    pastDue: number;
    byPlan: Record<string, number>;
  }> {
    try {
      const [total, active, trialing, canceled, pastDue] = await Promise.all([
        Subscription.count(),
        Subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        Subscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
        Subscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
        Subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } })
      ]);

      const planCounts = await Subscription.findAll({
        attributes: [
          'plan_name',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['plan_name'],
        raw: true
      }) as unknown as Array<{ plan_name: string; count: string }>;

      const byPlan: Record<string, number> = {};
      planCounts.forEach(item => {
        byPlan[item.plan_name] = parseInt(item.count);
      });

      return [{
        total,
        active,
        trialing,
        canceled,
        pastDue,
        byPlan
      }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب إحصائيات الاشتراكات')];
    }
  }
}

// استيراد sequelize للإحصائيات
import sequelize from '../config/db.config.js';

export default SubscriptionsService;
export type { SubscriptionData, QueryOptions, UpdateData };
export { SubscriptionStatus, BillingInterval };
