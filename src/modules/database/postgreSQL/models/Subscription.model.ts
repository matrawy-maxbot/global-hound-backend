import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/db.config.js';

/**
 * نموذج الاشتراكات - Subscription Model
 * يحتوي على معلومات اشتراكات المستخدمين وخططهم
 * @module SubscriptionModel
 */

// ===================== Enums =====================

/**
 * حالات الاشتراك - متوافقة مع Stripe
 * Subscription statuses - Stripe compatible
 */
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused'
}

/**
 * فترات الفوترة - متوافقة مع Stripe
 * Billing intervals - Stripe compatible
 */
export enum BillingInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

// ===================== Interfaces =====================

interface SubscriptionAttributes {
  id: string;
  user_id: string;
  // Stripe IDs
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  // Plan info (flexible string instead of enum)
  plan_name: string;
  status: SubscriptionStatus;
  // Billing
  billing_interval: BillingInterval;
  billing_interval_count: number;
  amount: number;
  currency: string;
  // Dates
  current_period_start: Date;
  current_period_end: Date;
  trial_start?: Date;
  trial_end?: Date;
  canceled_at?: Date;
  cancel_at_period_end: boolean;
  // Payment
  default_payment_method?: string;
  // Metadata
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 
  'id' | 'status' | 'stripe_subscription_id' | 'stripe_customer_id' | 'stripe_price_id' |
  'billing_interval_count' | 'trial_start' | 'trial_end' | 'canceled_at' | 'cancel_at_period_end' |
  'default_payment_method' | 'metadata' | 'created_at' | 'updated_at'
> {}

// ===================== Model Definition =====================

class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  declare id: string;
  declare user_id: string;
  // Stripe IDs
  declare stripe_subscription_id?: string;
  declare stripe_customer_id?: string;
  declare stripe_price_id?: string;
  // Plan info
  declare plan_name: string;
  declare status: SubscriptionStatus;
  // Billing
  declare billing_interval: BillingInterval;
  declare billing_interval_count: number;
  declare amount: number;
  declare currency: string;
  // Dates
  declare current_period_start: Date;
  declare current_period_end: Date;
  declare trial_start?: Date;
  declare trial_end?: Date;
  declare canceled_at?: Date;
  declare cancel_at_period_end: boolean;
  // Payment
  declare default_payment_method?: string;
  // Metadata
  declare metadata?: Record<string, unknown>;
  declare created_at: Date;
  declare updated_at: Date;

  /**
   * التحقق مما إذا كان الاشتراك نشطاً
   */
  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE || this.status === SubscriptionStatus.TRIALING;
  }

  /**
   * التحقق مما إذا كانت الفترة الحالية منتهية
   */
  isPeriodExpired(): boolean {
    return new Date() > this.current_period_end;
  }

  /**
   * التحقق مما إذا كان في فترة تجريبية
   */
  isInTrial(): boolean {
    if (!this.trial_end) return false;
    return this.status === SubscriptionStatus.TRIALING && new Date() < this.trial_end;
  }

  /**
   * الحصول على الأيام المتبقية في الفترة الحالية
   */
  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.current_period_end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * التحقق مما إذا كان الاشتراك سيُلغى في نهاية الفترة
   */
  willCancelAtPeriodEnd(): boolean {
    return this.cancel_at_period_end;
  }
}

Subscription.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'معرف الاشتراك الفريد - Subscription ID'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'معرف المستخدم - User ID (NULL if user deleted)'
    },
    // Stripe IDs
    stripe_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'معرف اشتراك Stripe - Stripe Subscription ID'
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'معرف عميل Stripe - Stripe Customer ID'
    },
    stripe_price_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'معرف سعر Stripe - Stripe Price ID'
    },
    // Plan info - flexible string
    plan_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'اسم الخطة - Plan Name (e.g., basic, premium, enterprise)'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: false,
      defaultValue: SubscriptionStatus.INCOMPLETE,
      comment: 'حالة الاشتراك - Subscription Status'
    },
    // Billing
    billing_interval: {
      type: DataTypes.ENUM(...Object.values(BillingInterval)),
      allowNull: false,
      defaultValue: BillingInterval.MONTH,
      comment: 'فترة الفوترة - Billing Interval'
    },
    billing_interval_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'عدد فترات الفوترة - Billing Interval Count'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'المبلغ بالسنت - Amount in cents'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'usd',
      comment: 'العملة - Currency (lowercase)'
    },
    // Dates
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'بداية الفترة الحالية - Current Period Start'
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'نهاية الفترة الحالية - Current Period End'
    },
    trial_start: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'بداية الفترة التجريبية - Trial Start'
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'نهاية الفترة التجريبية - Trial End'
    },
    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'تاريخ الإلغاء - Canceled At'
    },
    cancel_at_period_end: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'إلغاء في نهاية الفترة - Cancel At Period End'
    },
    // Payment
    default_payment_method: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'طريقة الدفع الافتراضية - Default Payment Method ID'
    },
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'بيانات إضافية - Additional Metadata'
    }
  },
  {
    sequelize,
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_subscription_user_id'
      },
      {
        fields: ['status'],
        name: 'idx_subscription_status'
      },
      {
        fields: ['plan_name'],
        name: 'idx_subscription_plan_name'
      },
      {
        fields: ['stripe_subscription_id'],
        name: 'idx_subscription_stripe_id'
      },
      {
        fields: ['stripe_customer_id'],
        name: 'idx_subscription_stripe_customer'
      },
      {
        fields: ['current_period_end'],
        name: 'idx_subscription_period_end'
      },
      {
        unique: true,
        fields: ['user_id', 'status'],
        name: 'unique_active_subscription',
        where: {
          status: {
            [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
          }
        }
      }
    ],
    comment: 'جدول الاشتراكات - Subscriptions Table'
  }
);

export default Subscription;
export type { SubscriptionAttributes, SubscriptionCreationAttributes };
