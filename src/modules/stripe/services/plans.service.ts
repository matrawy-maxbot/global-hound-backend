/**
 * خدمة إدارة الخطط والأسعار - Plans Service
 * تتواصل مع Stripe Server على البورت 4242
 */

import stripeApi from '../stripe.api.js';
import { stripeConfig } from '../../../config/stripe.config.js';
import { resolveError } from '../../../utils/errors/errorResolver.util.js';

/**
 * بيانات السعر المُنسق
 */
export interface FormattedPrice {
  id: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  active: boolean;
  currency: string;
  unitAmount: number | null;
  unitAmountFormatted: string;
  type: 'one_time' | 'recurring';
  interval: string | null;
  intervalCount: number | null;
  trialPeriodDays: number | null;
  metadata: Record<string, string>;
  nickname: string | null;
  lookupKey: string | null;
  features: string[];
}

/**
 * بيانات المنتج المُنسق
 */
export interface FormattedProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  images: string[];
  metadata: Record<string, string>;
  defaultPriceId: string | null;
  prices: FormattedPrice[];
  features: string[];
}

/**
 * السعر الخام من الخادم
 */
interface RawPrice {
  id: string;
  product: {
    id: string;
    name: string;
    description: string | null;
  } | string;
  unit_amount: number | null;
  currency: string;
  active: boolean;
  type: 'one_time' | 'recurring';
  recurring?: {
    interval: string;
    interval_count: number;
    trial_period_days: number | null;
  };
  metadata: Record<string, string>;
  nickname: string | null;
  lookup_key: string | null;
}

/**
 * المنتج الخام من الخادم
 */
interface RawProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  images: string[];
  metadata: Record<string, string>;
  default_price: string | null;
}

type ServiceResult<T> = Promise<[T | null, Error | null]>;

/**
 * استجابة Config من الخادم
 */
interface ConfigResponse {
  publishableKey: string;
  prices: RawPrice[];
}

/**
 * استجابة الأسعار
 */
interface PricesResponse {
  prices: RawPrice[];
  hasMore: boolean;
}

/**
 * استجابة المنتجات
 */
interface ProductsResponse {
  products: RawProduct[];
  hasMore: boolean;
}

/**
 * خدمة إدارة الخطط والأسعار
 * تتواصل مع خادم Stripe على البورت 4242
 */
class PlansService {

  /**
   * تنسيق المبلغ للعرض
   */
  private formatAmount(amount: number | null, currency: string): string {
    if (amount === null || amount === 0) return 'Free';

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    });

    return formatter.format(amount / 100);
  }

  /**
   * استخراج الميزات من metadata
   */
  private extractFeatures(metadata: Record<string, string> | null): string[] {
    if (!metadata) return [];

    const features: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith('feature_') || key === 'features') {
        if (key === 'features') {
          try {
            const parsed = JSON.parse(String(value));
            if (Array.isArray(parsed)) {
              features.push(...parsed);
            }
          } catch {
            features.push(String(value));
          }
        } else {
          features.push(String(value));
        }
      }
    }

    return features;
  }

  /**
   * تحويل السعر الخام إلى صيغة منسقة
   */
  private formatPrice(price: RawPrice): FormattedPrice {
    const product = typeof price.product === 'object' ? price.product : null;

    return {
      id: price.id,
      productId: typeof price.product === 'string' ? price.product : product?.id || '',
      productName: product?.name || '',
      productDescription: product?.description || null,
      active: price.active,
      currency: price.currency.toUpperCase(),
      unitAmount: price.unit_amount,
      unitAmountFormatted: this.formatAmount(price.unit_amount, price.currency),
      type: price.type,
      interval: price.recurring?.interval || null,
      intervalCount: price.recurring?.interval_count || null,
      trialPeriodDays: price.recurring?.trial_period_days || null,
      metadata: price.metadata || {},
      nickname: price.nickname,
      lookupKey: price.lookup_key,
      features: this.extractFeatures(price.metadata) || this.extractFeatures(product?.description ? { description: product.description } : null),
    };
  }

  /**
   * تحويل المنتج الخام إلى صيغة منسقة
   */
  private formatProduct(product: RawProduct, prices: FormattedPrice[] = []): FormattedProduct {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      images: product.images || [],
      metadata: product.metadata || {},
      defaultPriceId: product.default_price,
      prices: prices,
      features: this.extractFeatures(product.metadata),
    };
  }

  /**
   * الحصول على الإعدادات والأسعار
   * GET /api/config
   */
  async getConfig(): ServiceResult<{ publishableKey: string; prices: FormattedPrice[] }> {
    try {
      const [response, error] = await stripeApi.get<ConfigResponse>('/config');

      if (error) {
        return [null, resolveError(error, 'فشل في جلب الإعدادات')];
      }

      const formattedPrices = response?.prices?.map(p => this.formatPrice(p)) || [];

      return [{
        publishableKey: response?.publishableKey || '',
        prices: formattedPrices
      }, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الإعدادات')];
    }
  }

  /**
   * الحصول على جميع الأسعار النشطة
   * GET /api/config/prices
   */
  async getActivePrices(): ServiceResult<FormattedPrice[]> {
    try {
      const [response, error] = await stripeApi.get<PricesResponse>(
        '/config/prices',
        { active: true }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب الأسعار')];
      }

      const formattedPrices = response?.prices?.map(p => this.formatPrice(p)) || [];
      return [formattedPrices, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب الأسعار')];
    }
  }

  /**
   * الحصول على الأسعار المتكررة فقط (الاشتراكات)
   * يستخدم /api/config ويفلتر النتائج
   */
  async getSubscriptionPrices(): ServiceResult<FormattedPrice[]> {
    try {
      const [config, error] = await this.getConfig();

      if (error) {
        return [null, error];
      }

      // فلترة الأسعار المتكررة فقط
      const subscriptionPrices = config?.prices.filter(p => p.type === 'recurring') || [];
      return [subscriptionPrices, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب أسعار الاشتراكات')];
    }
  }

  /**
   * الحصول على سعر بواسطة المعرف
   * يستخدم /api/config ويبحث عن السعر
   */
  async getPriceById(priceId: string): ServiceResult<FormattedPrice> {
    try {
      if (!priceId) {
        return [null, new Error('Price ID is required')];
      }

      const [config, error] = await this.getConfig();

      if (error) {
        return [null, error];
      }

      const price = config?.prices.find(p => p.id === priceId);

      if (!price) {
        return [null, new Error('Price not found')];
      }

      return [price, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب السعر')];
    }
  }

  /**
   * الحصول على جميع المنتجات
   * GET /api/config/products
   */
  async getProducts(): ServiceResult<FormattedProduct[]> {
    try {
      const [response, error] = await stripeApi.get<ProductsResponse>(
        '/config/products',
        { active: true }
      );

      if (error) {
        return [null, resolveError(error, 'فشل في جلب المنتجات')];
      }

      const formattedProducts = response?.products?.map(p => this.formatProduct(p)) || [];
      return [formattedProducts, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المنتجات')];
    }
  }

  /**
   * الحصول على جميع المنتجات مع أسعارها
   * يجمع بين المنتجات والأسعار
   */
  async getProductsWithPrices(): ServiceResult<FormattedProduct[]> {
    try {
      // جلب الإعدادات (تحتوي على الأسعار)
      const [config, configError] = await this.getConfig();
      if (configError) {
        return [null, configError];
      }

      // جلب المنتجات
      const [products, productsError] = await this.getProducts();
      if (productsError) {
        return [null, productsError];
      }

      // تجميع الأسعار حسب المنتج
      const pricesByProduct = new Map<string, FormattedPrice[]>();
      for (const price of config?.prices || []) {
        const productId = price.productId;
        if (!pricesByProduct.has(productId)) {
          pricesByProduct.set(productId, []);
        }
        pricesByProduct.get(productId)!.push(price);
      }

      // دمج الأسعار مع المنتجات
      const productsWithPrices = products?.map(product => ({
        ...product,
        prices: pricesByProduct.get(product.id) || [],
      })) || [];

      return [productsWithPrices, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المنتجات')];
    }
  }

  /**
   * الحصول على منتج بواسطة المعرف
   */
  async getProductById(productId: string): ServiceResult<FormattedProduct> {
    try {
      if (!productId) {
        return [null, new Error('Product ID is required')];
      }

      const [productsWithPrices, error] = await this.getProductsWithPrices();

      if (error) {
        return [null, error];
      }

      const product = productsWithPrices?.find(p => p.id === productId);

      if (!product) {
        return [null, new Error('Product not found')];
      }

      return [product, null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المنتج')];
    }
  }

  /**
   * الحصول على الـ Publishable Key
   */
  getPublishableKey(): string {
    return stripeConfig.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * الحصول على Publishable Key من الخادم
   * GET /api/config
   */
  async fetchPublishableKey(): ServiceResult<string> {
    try {
      const [config, error] = await this.getConfig();

      if (error) {
        return [null, error];
      }

      return [config?.publishableKey || '', null];
    } catch (error) {
      return [null, resolveError(error as Error, 'فشل في جلب المفتاح')];
    }
  }
}

// تصدير instance واحد (Singleton)
const plansService = new PlansService();

export default plansService;
export { PlansService };
