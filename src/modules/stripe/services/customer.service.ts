/**
 * خدمة إدارة العملاء - Customer Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات العميل من Stripe Server
 */
export interface FormattedCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  defaultPaymentMethod: string | null;
  balance: number;
  currency: string | null;
  delinquent: boolean;
  created: string;
  livemode: boolean;
  metadata: Record<string, string>;
  address: {
    city: string | null;
    country: string | null;
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    state: string | null;
  } | null;
}

/**
 * بيانات إنشاء عميل
 */
export interface CreateCustomerData {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  address?: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  };
}

/**
 * بيانات تحديث عميل
 */
export interface UpdateCustomerData {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethod?: string;
  address?: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postalCode?: string;
    state?: string;
  };
}

/**
 * بيانات طريقة الدفع
 */
export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة العميل من الخادم
 */
interface CustomerResponse {
  customer: FormattedCustomer;
}

/**
 * استجابة قائمة العملاء
 */
interface CustomersListResponse {
  customers: FormattedCustomer[];
  hasMore: boolean;
}

/**
 * استجابة طرق الدفع
 */
interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
}

/**
 * استجابة الحذف
 */
interface DeleteResponse {
  id: string;
  deleted: boolean;
}

/**
 * خدمة إدارة العملاء في Stripe
 * تتواصل مع خادم Stripe على البورت 4242
 */
class StripeCustomerService {

  /**
   * إنشاء عميل جديد
   * POST /api/customers
   */
  async createCustomer(data: CreateCustomerData): ServiceResult<FormattedCustomer> {
    try {
      if (!data.email) {
        return [null, new Error('Email is required')];
      }

      const requestBody: Record<string, unknown> = {
        email: data.email,
        name: data.name,
        phone: data.phone,
        description: data.description,
        metadata: data.metadata,
      };

      // تحويل address إلى الصيغة المطلوبة من الخادم
      if (data.address) {
        requestBody.address = {
          line1: data.address.line1,
          line2: data.address.line2,
          city: data.address.city,
          state: data.address.state,
          postalCode: data.address.postalCode,
          country: data.address.country,
        };
      }

      const [response, error] = await stripeApi.post<CustomerResponse>(
        '/customers',
        requestBody,
        stripeApi.generateIdempotencyKey('cus_create')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء العميل')];
      }

      console.log(`✅ Customer created via Stripe Server: ${response?.customer?.id}`);
      return [response?.customer || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء العميل')];
    }
  }

  /**
   * الحصول على عميل بواسطة المعرف
   * GET /api/customers/:customerId
   */
  async getCustomer(customerId: string): ServiceResult<FormattedCustomer> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      // ✅ إرسال customerId في Cookie للمصادقة
      const [response, error] = await stripeApi.get<CustomerResponse>(
        `/customers/${customerId}`,
        undefined,
        customerId // ✅ customerId يُرسل في Cookie
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب العميل')];
      }

      return [response?.customer || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب العميل')];
    }
  }

  /**
   * الحصول على العميل الحالي من Cookie
   * GET /api/customers/me
   */
  async getCurrentCustomer(): ServiceResult<FormattedCustomer> {
    try {
      const [response, error] = await stripeApi.get<CustomerResponse>('/customers/me');

      if (error) {
        return [null, resolveError(error, 'فشل في جلب العميل الحالي')];
      }

      return [response?.customer || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب العميل الحالي')];
    }
  }

  /**
   * البحث عن عميل بواسطة البريد الإلكتروني
   * GET /api/customers?email=xxx
   */
  async findByEmail(email: string): ServiceResult<FormattedCustomer | null> {
    try {
      if (!email) {
        return [null, new Error('Email is required')];
      }

      const [response, error] = await stripeApi.get<CustomersListResponse>(
        '/customers',
        { email, limit: 1 }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في البحث عن العميل')];
      }

      if (!response?.customers || response.customers.length === 0) {
        return [null, null]; // No customer found
      }

      return [response.customers[0], null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في البحث عن العميل')];
    }
  }

  /**
   * البحث عن جميع العملاء بواسطة البريد الإلكتروني
   * GET /api/customers?email=xxx
   * يرجع جميع العملاء بنفس الإيميل (قد يكون هناك أكثر من عميل)
   */
  async findAllByEmail(email: string): ServiceResult<FormattedCustomer[]> {
    try {
      if (!email) {
        return [null, new Error('Email is required')];
      }

      const [response, error] = await stripeApi.get<CustomersListResponse>(
        '/customers',
        { email, limit: 100 } // جلب جميع العملاء بهذا الإيميل
      );

      if (error) {
        return [null, resolveError(error, 'فشل في البحث عن العملاء')];
      }

      return [response?.customers || [], null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في البحث عن العملاء')];
    }
  }

  /**
   * تحديث عميل
   * PUT /api/customers/:customerId
   */
  async updateCustomer(customerId: string, data: UpdateCustomerData): ServiceResult<FormattedCustomer> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      const requestBody: Record<string, unknown> = {};

      if (data.email !== undefined) requestBody.email = data.email;
      if (data.name !== undefined) requestBody.name = data.name;
      if (data.phone !== undefined) requestBody.phone = data.phone;
      if (data.description !== undefined) requestBody.description = data.description;
      if (data.metadata !== undefined) requestBody.metadata = data.metadata;

      if (data.address) {
        requestBody.address = {
          line1: data.address.line1,
          line2: data.address.line2,
          city: data.address.city,
          state: data.address.state,
          postalCode: data.address.postalCode,
          country: data.address.country,
        };
      }

      const [response, error] = await stripeApi.put<CustomerResponse>(
        `/customers/${customerId}`,
        requestBody
      );

      if (error) {
        return [null, resolveError(error, 'فشل في تحديث العميل')];
      }

      console.log(`✅ Customer updated via Stripe Server: ${customerId}`);
      return [response?.customer || null, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في تحديث العميل')];
    }
  }

  /**
   * حذف عميل
   * DELETE /api/customers/:customerId
   */
  async deleteCustomer(customerId: string): ServiceResult<boolean> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      const [response, error] = await stripeApi.delete<DeleteResponse>(
        `/customers/${customerId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في حذف العميل')];
      }

      console.log(`✅ Customer deleted via Stripe Server: ${customerId}`);
      return [response?.deleted || false, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في حذف العميل')];
    }
  }

  /**
   * إنشاء أو الحصول على عميل
   * يبحث أولاً عن عميل بالبريد الإلكتروني، إذا لم يجده ينشئ جديد
   */
  async getOrCreateCustomer(email: string, data?: Omit<CreateCustomerData, 'email'>): ServiceResult<FormattedCustomer> {
    try {
      // البحث عن عميل موجود
      const [existingCustomer, findError] = await this.findByEmail(email);

      if (findError) {
        return [null, findError];
      }

      if (existingCustomer) {
        return [existingCustomer, null];
      }

      // إنشاء عميل جديد
      return await this.createCustomer({
        email,
        ...data,
      });
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء أو جلب العميل')];
    }
  }

  /**
   * إرفاق طريقة دفع للعميل
   * POST /api/customers/:customerId/payment-methods
   */
  async attachPaymentMethod(customerId: string, paymentMethodId: string, setAsDefault: boolean = true): ServiceResult<boolean> {
    try {
      if (!customerId || !paymentMethodId) {
        return [null, new Error('Customer ID and Payment Method ID are required')];
      }

      const [, error] = await stripeApi.post(
        `/customers/${customerId}/payment-methods`,
        {
          paymentMethodId,
          setAsDefault,
        },
        stripeApi.generateIdempotencyKey('pm_attach')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إرفاق طريقة الدفع')];
      }

      console.log(`✅ Payment method ${paymentMethodId} attached to customer ${customerId}`);
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إرفاق طريقة الدفع')];
    }
  }

  /**
   * فصل طريقة دفع عن عميل
   * DELETE /api/customers/:customerId/payment-methods/:paymentMethodId
   */
  async detachPaymentMethod(customerId: string, paymentMethodId: string): ServiceResult<boolean> {
    try {
      if (!customerId || !paymentMethodId) {
        return [null, new Error('Customer ID and Payment Method ID are required')];
      }

      const [, error] = await stripeApi.delete(
        `/customers/${customerId}/payment-methods/${paymentMethodId}`
      );

      if (error) {
        return [null, resolveError(error, 'فشل في فصل طريقة الدفع')];
      }

      console.log(`✅ Payment method ${paymentMethodId} detached from customer ${customerId}`);
      return [true, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في فصل طريقة الدفع')];
    }
  }

  /**
   * الحصول على طرق الدفع للعميل
   * GET /api/customers/:customerId/payment-methods
   */
  async getPaymentMethods(customerId: string, type: string = 'card'): ServiceResult<PaymentMethod[]> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      const [response, error] = await stripeApi.get<PaymentMethodsResponse>(
        `/customers/${customerId}/payment-methods`,
        { type }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب طرق الدفع')];
      }

      return [response?.paymentMethods || [], null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب طرق الدفع')];
    }
  }

  /**
   * إنشاء Setup Intent للعميل
   * ملاحظة: يستخدم Checkout Session بدلاً من Setup Intent مباشر
   */
  async createSetupIntent(customerId: string): ServiceResult<{ clientSecret: string; setupIntentId: string }> {
    try {
      if (!customerId) {
        return [null, new Error('Customer ID is required')];
      }

      // استخدام checkout session للإعداد
      const [response, error] = await stripeApi.post<{ clientSecret: string; setupIntentId: string }>(
        `/checkout/setup`,
        { customerId },
        stripeApi.generateIdempotencyKey('setup_intent')
      );

      if (error) {
        return [null, resolveError(error, 'فشل في إنشاء Setup Intent')];
      }

      return [response, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في إنشاء Setup Intent')];
    }
  }

  /**
   * الحصول على قائمة العملاء (للمشرفين فقط)
   * GET /api/customers
   */
  async listCustomers(options?: {
    limit?: number;
    startingAfter?: string;
    email?: string;
  }): ServiceResult<{ customers: FormattedCustomer[]; hasMore: boolean }> {
    try {
      const params: Record<string, string | number> = {};
      
      if (options?.limit) params.limit = options.limit;
      if (options?.startingAfter) params.starting_after = options.startingAfter;
      if (options?.email) params.email = options.email;

      const [response, error] = await stripeApi.get<CustomersListResponse>(
        '/customers',
        params
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب قائمة العملاء')];
      }

      return [response || { customers: [], hasMore: false }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب قائمة العملاء')];
    }
  }
}

// تصدير instance واحد (Singleton)
const stripeCustomerService = new StripeCustomerService();

export default stripeCustomerService;
export { StripeCustomerService };
