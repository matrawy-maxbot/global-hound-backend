/**
 * Stripe API Client - التواصل مع Stripe Server على البورت 4242
 * يستخدم fetch للتواصل مع خادم Stripe الخارجي
 */

import { stripeConfig } from '../../config/stripe.config.js';

/**
 * خيارات الطلب
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  credentials?: 'include' | 'same-origin' | 'omit';
  customerId?: string; // ✅ إضافة customerId لإرساله في Cookie
}

/**
 * نتيجة الطلب
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Stripe API Client
 * للتواصل مع خادم Stripe على البورت 4242
 */
class StripeApiClient {
  private baseUrl: string;
  private isInitialized: boolean = false;

  constructor() {
    this.baseUrl = stripeConfig.stripeServerUrl;
    this.initialize();
  }

  /**
   * تهيئة الـ Client
   */
  private initialize(): void {
    if (!this.baseUrl) {
      console.warn('⚠️ STRIPE_SERVER_URL is not configured, using default: http://localhost:4242/api');
      this.baseUrl = 'http://localhost:4242/api';
    }
    
    this.isInitialized = true;
    console.log(`✅ Stripe API Client initialized - Base URL: ${this.baseUrl}`);
    console.log(`🔑 Admin API Key configured: ${stripeConfig.adminApiKey ? 'Yes (' + stripeConfig.adminApiKey.substring(0, 10) + '...)' : 'NO - MISSING!'}`);
  }

  /**
   * التحقق من جاهزية الـ Client
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * إنشاء Headers للطلب
   */
  private createHeaders(customHeaders?: Record<string, string>, idempotencyKey?: string, customerId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-api-key': stripeConfig.adminApiKey, // مفتاح التواصل مع stripe_server
      ...customHeaders,
    };

    // إضافة Idempotency Key للعمليات الكتابية
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    // ✅ إضافة Cookie لـ customerId (مطلوب من stripe_server)
    if (customerId) {
      headers['Cookie'] = `customer=${customerId}`;
    }

    return headers;
  }

  /**
   * توليد Idempotency Key فريد
   */
  generateIdempotencyKey(prefix: string = 'req'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * تنفيذ طلب HTTP
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    idempotencyKey?: string
  ): Promise<[T | null, Error | null]> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.createHeaders(options.headers, idempotencyKey, options.customerId);

      console.log(`🔗 Stripe API Request URL: ${url}`);
      console.log(`🔗 Stripe API Request Headers:`, headers);
      console.log(`🔗 Stripe API Request options:`, options);

      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        credentials: options.credentials || 'include', // مهم للكوكيز
      };

      if (options.body && ['POST', 'PUT', 'DELETE'].includes(fetchOptions.method!)) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      console.log(`🔗 Stripe API Request: ${fetchOptions.method} ${url}`);
      if (options.customerId) {
        console.log(`🍪 With Customer Cookie: ${options.customerId}`);
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json() as ApiResponse<T>;

      if (!response.ok) {
        const errorMessage = data.error?.message || `HTTP Error: ${response.status}`;
        console.error(`❌ Stripe API Error: ${errorMessage}`);
        return [null, new Error(errorMessage)];
      }

      return [data.data || data as unknown as T, null];
    } catch (error) {
      console.error(`❌ Stripe API Request Failed:`, error);
      return [null, error as Error];
    }
  }

  /**
   * طلب GET
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>, customerId?: string): Promise<[T | null, Error | null]> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET', customerId });
  }

  /**
   * طلب POST
   */
  async post<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
    customerId?: string
  ): Promise<[T | null, Error | null]> {
    return this.request<T>(
      endpoint,
      { method: 'POST', body, customerId },
      idempotencyKey || this.generateIdempotencyKey('post')
    );
  }

  /**
   * طلب PUT
   */
  async put<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
    customerId?: string
  ): Promise<[T | null, Error | null]> {
    return this.request<T>(
      endpoint,
      { method: 'PUT', body, customerId },
      idempotencyKey || this.generateIdempotencyKey('put')
    );
  }

  /**
   * طلب DELETE
   */
  async delete<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    customerId?: string
  ): Promise<[T | null, Error | null]> {
    return this.request<T>(endpoint, { method: 'DELETE', body, customerId });
  }

  /**
   * الحصول على Base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// إنشاء instance واحد (Singleton)
const stripeApi = new StripeApiClient();

export { stripeApi, StripeApiClient };
export default stripeApi;
