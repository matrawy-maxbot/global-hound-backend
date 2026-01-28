# 📚 توثيق مشروع Global Hound - Backend

## � فهرس المحتويات

1. [نظرة عامة على المشروع](#-نظرة-عامة-على-المشروع)
2. [هيكل المشروع](#-هيكل-المشروع)
3. [نظام الإعدادات](#️-نظام-الإعدادات-configuration-system)
4. [نظام Middlewares](#️-نظام-middlewares)
5. [نظام المصادقة](#-نظام-المصادقة-authentication-system)
6. [نظام قاعدة البيانات](#️-نظام-قاعدة-البيانات)
7. [نظام Stripe](#-نظام-stripe)
8. [نظام التخزين المؤقت](#-نظام-التخزين-المؤقت-redis-cache)
9. [واجهة API](#-واجهة-api-restful-routes)
10. [الأدوات المساعدة](#-الأدوات-المساعدة-utilities)
11. [تشغيل المشروع](#-تشغيل-المشروع)
12. [الأمان](#-الأمان)
13. [المراقبة والسجلات](#-المراقبة-والسجلات)
14. [تنفيذ المتطلبات الأساسية](#-تنفيذ-المتطلبات-الأساسية-requirements-implementation)
    - [Authentication & Roles](#1️⃣-authentication--roles-المصادقة-والأدوار)
    - [Subscription Logic - Stripe](#2️⃣-subscription-logic---stripe-test-mode-منطق-الاشتراكات)
    - [User Dashboard](#3️⃣-user-dashboard-لوحة-تحكم-المستخدم)
    - [Admin Panel](#4️⃣-admin-panel-لوحة-تحكم-المشرف)
    - [Security & Best Practices](#5️⃣-security--best-practices-الأمان-وأفضل-الممارسات)
15. [ملخص التنفيذ](#-ملخص-التنفيذ)
16. [Graceful Shutdown](#️-graceful-shutdown)
17. [الدعم والتواصل](#-الدعم-والتواصل)

---

## �📋 نظرة عامة على المشروع

هذا المشروع هو **منصة Backend متكاملة** مبنية باستخدام **Node.js + Express.js + TypeScript**. يوفر واجهة برمجة تطبيقات RESTful لإدارة المستخدمين، الاشتراكات، المدفوعات عبر Stripe، وإدارة السيارات.

### 🛠️ التقنيات المستخدمة

| التقنية | الوصف |
|---------|-------|
| **Node.js** | بيئة التشغيل |
| **Express.js** | إطار عمل الويب |
| **TypeScript** | لغة البرمجة |
| **PostgreSQL** | قاعدة البيانات الرئيسية (مع Sequelize ORM) |
| **MongoDB** | قاعدة بيانات ثانوية (MongoDB Atlas) |
| **Redis** | التخزين المؤقت وإدارة الجلسات |
| **Stripe** | معالجة المدفوعات والاشتراكات |
| **Passport.js** | المصادقة |
| **JWT** | إدارة التوكنات |
| **Winston** | تسجيل الأحداث |
| **Joi** | التحقق من البيانات |

---

## 📁 هيكل المشروع

```
backend/
├── src/
│   ├── app.ts                    # تطبيق Express الرئيسي
│   ├── server.ts                 # نقطة دخول الخادم
│   ├── config/                   # ملفات الإعدادات
│   ├── middlewares/              # Middlewares
│   ├── modules/                  # الوحدات الرئيسية
│   │   ├── api/                  # واجهة API
│   │   ├── auth/                 # نظام المصادقة
│   │   ├── cache/                # التخزين المؤقت (Redis)
│   │   ├── database/             # قواعد البيانات
│   │   └── stripe/               # تكامل Stripe
│   └── utils/                    # أدوات مساعدة
├── docs/                         # التوثيق
├── logs/                         # ملفات السجلات
└── package.json                  # تبعيات المشروع
```

---

## ⚙️ نظام الإعدادات (Configuration System)

### 📂 ملفات البيئة

يستخدم المشروع نظام إعدادات متقدم مع ملفات `.env` منفصلة لكل مكون:

| الملف | الوصف |
|-------|-------|
| `Server.env` | إعدادات الخادم (المنفذ، البيئة، URL) |
| `Database.env` | إعدادات قواعد البيانات (PostgreSQL, MongoDB, Redis) |
| `Security.env` | إعدادات الأمان (JWT, CORS, API Keys) |
| `Stripe.env` | إعدادات Stripe للمدفوعات |
| `SessionCookies.env` | إعدادات الجلسات والكوكيز |
| `IntegratedAuthentication.env` | OAuth (Google, Facebook, GitHub) |
| `Notifications.env` | البريد الإلكتروني (SMTP) و SMS (Twilio) |
| `FileStorage.env` | تخزين الملفات (Local/AWS S3) |

### 🔧 إعدادات الخادم (`server.config.ts`)

```typescript
interface ServerConfigEnv {
  SERVER_HOST: string;     // عنوان الخادم (افتراضي: 0.0.0.0)
  SERVER_PORT: number;     // المنفذ (افتراضي: 3003)
  NODE_ENV: 'development' | 'production' | 'testing';
  BASE_URL: string;        // URL الأساسي للـ API
}
```

### 🔐 إعدادات الأمان (`security.config.ts`)

```typescript
interface SecurityConfigEnv {
  JWT_SECRET: string;              // مفتاح JWT
  JWT_EXPIRES_IN: string;          // مدة صلاحية Access Token (افتراضي: 1h)
  JWT_REFRESH_EXPIRES_IN: string;  // مدة صلاحية Refresh Token (افتراضي: 7d)
  API_KEY: string;                 // مفتاح API
  BOT_TOKEN: string;               // توكن Discord Bot
  CORS_ORIGIN: string;             // Origins المسموح بها (مفصولة بفاصلة)
  CORS_METHODS: string;            // HTTP Methods المسموح بها
  CORS_CREDENTIALS: string;        // السماح بإرسال Credentials
}
```

### 💳 إعدادات Stripe (`stripe.config.ts`)

```typescript
interface StripeConfig {
  stripeServerUrl: string;    // URL خادم Stripe الخارجي (البورت 4242)
  publishableKey: string;     // Publishable Key للـ Frontend
  webhookSecret: string;      // Webhook Secret
  adminApiKey: string;        // Admin API Key للتواصل الداخلي
  apiVersion: string;         // إصدار API
}
```

### 🗄️ إعدادات قواعد البيانات (`database.config.ts`)

```typescript
// PostgreSQL
interface PostgreSQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// MongoDB
interface MongoDBConfig {
  uri: string;  // MongoDB Connection URI
}

// Redis
interface RedisConfig {
  available: boolean;  // هل Redis متاح؟
  host: string;
  port: number;
  password: string;
  db: number;
}
```

---

## 🛡️ نظام Middlewares

### 🔒 Security Middlewares

#### 1. CORS Middleware (`cors.middleware.ts`)
- التحقق من Origins المسموح بها
- إحصائيات الطلبات (allowed, blocked, noOrigin)
- دعم Preflight Requests

```typescript
// إعدادات CORS
const corsOptions: CorsOptions = {
  origin: originValidator,
  methods: CORS_METHODS.split(','),
  allowedHeaders: CORS_HEADERS.split(','),
  credentials: CORS_CREDENTIALS,
  maxAge: 86400,  // 24 ساعة
};
```

#### 2. Helmet Middleware (`helmet.middleware.ts`)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (منع clickjacking)
- XSS Filter
- No Sniff
- إخفاء X-Powered-By

#### 3. Rate Limiter Middleware (`rateLimiter.middleware.ts`)
- حماية من هجمات Brute Force
- استخدام Redis للتخزين المؤقت
- إعدادات مخصصة لكل نوع طلب

```typescript
// أنواع Rate Limiters
authRateLimiter:    5 طلبات / 15 دقيقة    // تسجيل الدخول
generalRateLimiter: 100 طلب / 15 دقيقة   // الطلبات العامة
strictRateLimiter:  10 طلبات / 5 دقائق   // الطلبات الحساسة
```

#### 4. Session Middleware (`session.middleware.ts`)
- تخزين الجلسات في Redis (أو Memory Store كـ Fallback)
- دعم Secure Cookies في الإنتاج
- HttpOnly Cookies للحماية من XSS

#### 5. XSS Clean Middleware (`xssClean.middleware.ts`)
- تنظيف المدخلات من أكواد XSS

### 📝 Logging Middlewares

#### 1. Request Logger (`requestLogger.middleware.ts`)
- تسجيل جميع الطلبات باستخدام Morgan
- يعمل فقط في بيئة التطوير

#### 2. Response Time (`responseTime.middleware.ts`)
- قياس وقت الاستجابة لكل طلب

### ⚠️ Error Handling Middlewares

#### 1. Error Handler (`errorHandler.middleware.ts`)
- معالجة مركزية للأخطاء
- إخفاء تفاصيل الأخطاء في الإنتاج
- تسجيل الأخطاء

#### 2. Not Found (`notFound.middleware.ts`)
- معالجة الطلبات لمسارات غير موجودة

### ✅ Validation Middleware (`validation.middleware.ts`)
- التحقق من البيانات باستخدام Joi
- دعم params, query, body, headers
- رسائل خطأ مفصلة

---

## 🔐 نظام المصادقة (Authentication System)

### 📋 نظرة عامة

النظام يدعم:
- ✅ تسجيل الدخول عبر البريد الإلكتروني وكلمة المرور
- ✅ تسجيل الدخول عبر Google OAuth2
- ✅ نظام التوكنات (Access Token + Refresh Token)
- ✅ نظام الأدوار (Owner, Admin, User, Guest)

### 👥 أنواع المستخدمين

| الدور | الوصف | الصلاحيات |
|-------|-------|-----------|
| **Owner** | مالك النظام | جميع الصلاحيات |
| **Admin** | مشرف | صلاحيات محددة حسب permissions |
| **User** | مستخدم عادي | صلاحيات أساسية |
| **Guest** | زائر | قراءة فقط |

### 🔑 إدارة التوكنات

```typescript
// إنشاء توكن
function generateToken(data: { userID: string }, isRefresh: boolean): string;

// التحقق من التوكن
function validateToken(token: string): TokenPayload | null;
```

### 🛡️ Role Middleware (`role.middleware.ts`)

```typescript
// التحقق من الدور
checkRole(['owner', 'admin'], ['view_users']);

// التسلسل الهرمي: Owner > Admin > User > Guest
```

### 💳 Subscription Middleware (`subscription.middleware.ts`)

```typescript
// التحقق من الاشتراك
checkSubscription(['user'], ['Pro', 'Enterprise']);

// خيارات:
// - verifyFromStripe: التحقق من Stripe مباشرة
// - customMessage: رسالة خطأ مخصصة
```

### 📍 مسارات المصادقة

| المسار | الوصف |
|--------|-------|
| `POST /api/v1/auth/register` | تسجيل مستخدم جديد |
| `POST /api/v1/auth/login/email` | تسجيل الدخول (إيميل + كلمة مرور) |
| `POST /api/v1/auth/google` | تسجيل الدخول عبر Google |
| `POST /api/v1/auth/refresh` | تجديد التوكن |
| `POST /api/v1/auth/logout` | تسجيل الخروج |
| `GET /api/v1/auth/validate` | التحقق من صلاحية التوكن |

---

## 🗄️ نظام قاعدة البيانات

### 📊 PostgreSQL (Sequelize ORM)

#### 🔌 إعداد الاتصال (`db.config.ts`)

```typescript
const sequelizeOptions: Options = {
  dialect: 'postgres',
  pool: { max: 200, min: 5 },
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }  // لـ Supabase
  }
};
```

### 📋 النماذج (Models)

#### 1. User Model (`User.model.ts`)

```typescript
interface UserAttributes {
  id: string;              // UUID
  email: string;           // فريد
  password_hash?: string;  // للتسجيل المحلي فقط
  auth_provider: 'local' | 'google';
  google_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### 2. Subscription Model (`Subscription.model.ts`)

```typescript
interface SubscriptionAttributes {
  id: string;
  user_id: string;
  // Stripe IDs
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  // Plan info
  plan_name: string;
  status: SubscriptionStatus;
  // Billing
  billing_interval: 'day' | 'week' | 'month' | 'year';
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
}

// حالات الاشتراك (متوافقة مع Stripe)
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused'
}
```

#### 3. Car Model (`Car.model.ts`)

```typescript
interface CarAttributes {
  id: string;           // UUID
  car_make: string;     // الشركة المصنعة (BMW, Toyota)
  car_model: string;    // الموديل (325, Camry)
  car_model_year: number;  // سنة الصنع
  car_vin: string;      // VIN (17 حرف، فريد)
  created_at: Date;
  updated_at: Date;
}
```

#### 4. ProjectAdmin Model (`ProjectAdmin.model.ts`)

```typescript
interface ProjectAdminAttributes {
  id: string;
  user_id: string;
  permissions: string[];  // قائمة الصلاحيات
  created_at: Date;
  updated_at: Date;
}
```

#### 5. Token Model (`Token.model.ts`)

```typescript
interface TokenAttributes {
  id: string;
  token: string;
  type: 'access' | 'refresh' | 'resetPassword' | 'verifyEmail';
  refresh_token?: string;
  expires_at: Date;
  used: boolean;
  ip_address?: string;
  user_agent?: string;
}
```

---

## 💳 نظام Stripe

### 📋 نظرة عامة

يتواصل النظام مع **خادم Stripe خارجي** على البورت 4242 بدلاً من استخدام Stripe SDK مباشرة.

### 🔗 Stripe API Client (`stripe.api.ts`)

```typescript
class StripeApiClient {
  baseUrl: string;  // http://localhost:4242/api
  
  async request<T>(endpoint: string, options?: RequestOptions): Promise<[T | null, Error | null]>;
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<[T | null, Error | null]>;
  async post<T>(endpoint: string, body: Record<string, any>): Promise<[T | null, Error | null]>;
  async put<T>(endpoint: string, body: Record<string, any>): Promise<[T | null, Error | null]>;
  async delete<T>(endpoint: string): Promise<[T | null, Error | null]>;
}
```

### 📦 خدمات Stripe

#### 1. Customer Service (`customer.service.ts`)

```typescript
class StripeCustomerService {
  async createCustomer(data: CreateCustomerData): Promise<[FormattedCustomer | null, Error | null]>;
  async getCustomerById(customerId: string): Promise<[FormattedCustomer | null, Error | null]>;
  async updateCustomer(customerId: string, data: UpdateCustomerData): Promise<[FormattedCustomer | null, Error | null]>;
  async deleteCustomer(customerId: string): Promise<[boolean, Error | null]>;
  async findAllByEmail(email: string): Promise<[FormattedCustomer[] | null, Error | null]>;
  async getPaymentMethods(customerId: string): Promise<[PaymentMethod[] | null, Error | null]>;
}
```

#### 2. Plans Service (`plans.service.ts`)

```typescript
class PlansService {
  async getActivePrices(): Promise<[FormattedPrice[] | null, Error | null]>;
  async getSubscriptionPrices(): Promise<[FormattedPrice[] | null, Error | null]>;
  async getPriceById(priceId: string): Promise<[FormattedPrice | null, Error | null]>;
  async getProductsWithPrices(): Promise<[FormattedProduct[] | null, Error | null]>;
  async getProductById(productId: string): Promise<[FormattedProduct | null, Error | null]>;
}
```

#### 3. Subscriptions Service (`stripe-subscriptions.service.ts`)

```typescript
class StripeSubscriptionsService {
  async createSubscription(data: CreateStripeSubscriptionData): Promise<[FormattedStripeSubscription | null, Error | null]>;
  async getSubscription(subscriptionId: string): Promise<[FormattedStripeSubscription | null, Error | null]>;
  async getCustomerSubscriptions(customerId: string): Promise<[FormattedStripeSubscription[] | null, Error | null]>;
  async updateSubscription(subscriptionId: string, data: UpdateStripeSubscriptionData): Promise<[FormattedStripeSubscription | null, Error | null]>;
  async cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<[FormattedStripeSubscription | null, Error | null]>;
  async pauseSubscription(subscriptionId: string): Promise<[FormattedStripeSubscription | null, Error | null]>;
  async resumeSubscription(subscriptionId: string): Promise<[FormattedStripeSubscription | null, Error | null]>;
}
```

#### 4. Checkout Service (`checkout.service.ts`)

```typescript
class StripeCheckoutService {
  async createSubscriptionCheckout(data: CreateSubscriptionCheckoutData): Promise<[FormattedCheckoutSession | null, Error | null]>;
  async createPaymentCheckout(data: CreatePaymentCheckoutData): Promise<[FormattedCheckoutSession | null, Error | null]>;
}
```

#### 5. Payments Service (`payments.service.ts`)

```typescript
class StripePaymentsService {
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<[FormattedPaymentIntent | null, Error | null]>;
  async getPaymentIntent(paymentIntentId: string): Promise<[FormattedPaymentIntent | null, Error | null]>;
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<[FormattedPaymentIntent | null, Error | null]>;
  async cancelPaymentIntent(paymentIntentId: string): Promise<[FormattedPaymentIntent | null, Error | null]>;
}
```

#### 6. Refunds Service (`refunds.service.ts`)

```typescript
class StripeRefundsService {
  async createRefund(data: CreateRefundData): Promise<[FormattedRefund | null, Error | null]>;
  async getRefund(refundId: string): Promise<[FormattedRefund | null, Error | null]>;
}
```

---

## 🚀 نظام التخزين المؤقت (Redis Cache)

### 📋 نظرة عامة

النظام يستخدم Redis للتخزين المؤقت مع دعم **Batch Processing** لتحسين الأداء.

### 🔧 Redis Queue Batch Manager

```typescript
// إعدادات المدير
interface RedisQueueBatchManagerOptions {
  batchInterval?: number;      // فترة المعالجة لـ SET/DEL (500ms)
  getBatchInterval?: number;   // فترة المعالجة لـ GET (25ms)
  maxBatchSize?: number;       // أقصى حجم دفعة SET/DEL (100,000)
  getMaxBatchSize?: number;    // أقصى حجم دفعة GET (20,000)
  enableMetrics?: boolean;     // تفعيل الإحصائيات
}
```

### 📊 الوظائف المتاحة

```typescript
// تخزين قيمة
cacheSet<T>(key: string, value: T, ttl: number = 3600): void;
cacheSetAsync<T>(key: string, value: T, ttl: number = 3600): Promise<string>;

// استرجاع قيمة
cacheGet(key: string): Promise<unknown>;

// حذف قيمة
cacheDelete(key: string): void;
cacheDeleteAsync(key: string): Promise<number>;
```

### 🔄 Fallback

إذا كان Redis غير متاح، يستخدم النظام **In-Memory Cache** كبديل مع تنظيف دوري للمفاتيح المنتهية.

---

## 🌐 واجهة API (RESTful Routes)

### 📍 المسارات الأساسية

| المسار الأساسي | الوصف |
|----------------|-------|
| `/api/v1/auth` | المصادقة |
| `/api/v1/users` | إدارة المستخدمين |
| `/api/v1/project-admins` | إدارة مشرفي المشاريع |
| `/api/v1/subscriptions` | إدارة الاشتراكات |
| `/api/v1/plans` | الخطط والأسعار |
| `/api/v1/customers` | عملاء Stripe |
| `/api/v1/cars` | إدارة السيارات |

### 👤 مسارات المستخدمين (`/api/v1/users`)

| Method | المسار | الوصف | الصلاحيات |
|--------|--------|-------|-----------|
| `GET` | `/` | جميع المستخدمين | owner, admin (view_users) |
| `GET` | `/:id` | مستخدم بالمعرف | owner, admin (view_users) |
| `GET` | `/email/:email` | مستخدم بالإيميل | owner, admin (view_users) |
| `PUT` | `/:id` | تحديث مستخدم | owner |
| `DELETE` | `/:id` | حذف مستخدم | owner |

### 💳 مسارات الاشتراكات (`/api/v1/subscriptions`)

| Method | المسار | الوصف | الصلاحيات |
|--------|--------|-------|-----------|
| `GET` | `/` | جميع الاشتراكات | owner, admin |
| `GET` | `/me` | اشتراكي | owner, admin, user |
| `POST` | `/me/cancel` | إلغاء اشتراكي | owner, admin, user |
| `GET` | `/user/:userId` | اشتراكات مستخدم | owner, admin |
| `GET` | `/user/:userId/active` | الاشتراك النشط | owner, admin |
| `GET` | `/statistics` | الإحصائيات | owner |
| `GET` | `/expiring` | الاشتراكات المنتهية | owner, admin |

### 📋 مسارات الخطط (`/api/v1/plans`)

| Method | المسار | الوصف | الصلاحيات |
|--------|--------|-------|-----------|
| `GET` | `/config` | Stripe Publishable Key | عام |
| `GET` | `/prices` | جميع الأسعار | عام |
| `GET` | `/subscription-prices` | أسعار الاشتراكات | عام |
| `GET` | `/products` | المنتجات مع الأسعار | عام |
| `GET` | `/prices/:priceId` | سعر محدد | عام |
| `GET` | `/products/:productId` | منتج محدد | عام |
| `POST` | `/subscriptions` | إنشاء اشتراك | مصادق |
| `GET` | `/subscriptions/:id` | اشتراك محدد | مصادق |
| `POST` | `/subscriptions/:id/cancel` | إلغاء اشتراك | مصادق |

### 🚗 مسارات السيارات (`/api/v1/cars`)

| Method | المسار | الوصف | الصلاحيات |
|--------|--------|-------|-----------|
| `GET` | `/` | جميع السيارات | owner, admin, user (+ اشتراك) |
| `GET` | `/:id` | سيارة بالمعرف | owner, admin, user (+ اشتراك) |
| `GET` | `/vin/:vin` | سيارة بـ VIN | owner, admin, user (+ اشتراك) |
| `GET` | `/statistics` | إحصائيات السيارات | owner, admin (view_cars) |
| `POST` | `/` | إنشاء سيارة | owner, admin (create_cars) |
| `PUT` | `/:id` | تحديث سيارة | owner, admin (update_cars) |
| `DELETE` | `/:id` | حذف سيارة | owner, admin (delete_cars) |

### 👨‍💼 مسارات مشرفي المشاريع (`/api/v1/project-admins`)

| Method | المسار | الوصف | الصلاحيات |
|--------|--------|-------|-----------|
| `GET` | `/` | جميع المشرفين | owner |
| `GET` | `/:id` | مشرف بالمعرف | owner |
| `GET` | `/user/:userId` | مشرف بمعرف المستخدم | owner |
| `GET` | `/permission/:permission` | مشرفين بصلاحية | owner |
| `POST` | `/` | إنشاء مشرف | owner |
| `PUT` | `/:id` | تحديث مشرف | owner |
| `DELETE` | `/:id` | حذف مشرف | owner |

---

## 🔧 الأدوات المساعدة (Utilities)

### 📤 Response Handler (`responseHandler.util.ts`)

```typescript
// إرسال استجابة موحدة
successResponse(res: Response, data: ResponseData, message?: string, status?: number): Response;
```

### 🔒 Hash Utility (`hash.util.ts`)

```typescript
// تشفير كلمة المرور
hashPassword(password: string, saltNumber?: number): Promise<string>;

// مقارنة كلمات المرور
comparePassword(password: string, hash: string): Promise<boolean>;
```

### 📝 Logger (`logger.util.ts`)

```typescript
// Winston Logger
logger.info(message);
logger.error(message);
logger.warn(message);

// الملفات:
// - logs/error.log (أخطاء فقط)
// - logs/combined.log (جميع السجلات)
```

---

## 🚀 تشغيل المشروع

### 📋 المتطلبات

- Node.js >= 18
- PostgreSQL
- Redis (اختياري)
- حساب Stripe (للمدفوعات)

### 💻 أوامر التشغيل

```bash
# تثبيت التبعيات
npm install

# تشغيل بيئة التطوير
npm run dev

# بناء المشروع
npm run build

# تشغيل الإنتاج
npm run start

# فحص TypeScript
npm run typecheck

# فحص Linting
npm run lint
```

### 🌐 نقاط الوصول

| النقطة | الوصف |
|--------|-------|
| `http://localhost:3003` | الصفحة الرئيسية |
| `http://localhost:3003/health` | فحص صحة الخادم |
| `http://localhost:3003/api/v1/*` | واجهة API |
| `http://localhost:3003/cors-stats` | إحصائيات CORS (dev فقط) |

---

## 🔒 الأمان

### ✅ ميزات الأمان المُطبقة

1. **Helmet** - حماية HTTP Headers
2. **CORS** - التحكم في Origins
3. **Rate Limiting** - حماية من DDoS
4. **XSS Protection** - منع هجمات XSS
5. **JWT Authentication** - مصادقة آمنة
6. **Password Hashing** - تشفير bcrypt
7. **Secure Sessions** - جلسات Redis
8. **Input Validation** - Joi schemas

### 🔑 أفضل الممارسات

- استخدام HTTPS في الإنتاج
- تغيير JWT_SECRET بانتظام
- تفعيل secure cookies في الإنتاج
- مراقبة Rate Limit logs
- تحديث التبعيات بانتظام

---

## 📊 المراقبة والسجلات

### 📝 ملفات السجلات

```
logs/
├── error.log      # أخطاء فقط
└── combined.log   # جميع السجلات
```

### 📈 Health Check

```json
GET /health

{
  "status": "OK",
  "timestamp": "2026-01-28T10:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected",
  "memory": {
    "used": "50 MB",
    "total": "100 MB"
  }
}
```

## ✅ تنفيذ المتطلبات الأساسية (Requirements Implementation)

هذا القسم يوضح كيفية تنفيذ كل متطلب من متطلبات المشروع الأساسية.

---

### 1️⃣ Authentication & Roles (المصادقة والأدوار)

#### ✅ User Registration and Login (تسجيل المستخدمين وتسجيل الدخول)

**الملفات المعنية:**
- [src/modules/auth/routes/auth.route.ts](../src/modules/auth/routes/auth.route.ts)
- [src/modules/auth/services/auth.service.ts](../src/modules/auth/services/auth.service.ts)
- [src/modules/database/postgreSQL/services/users.service.ts](../src/modules/database/postgreSQL/services/users.service.ts)

**التنفيذ:**

```typescript
// تسجيل مستخدم جديد
POST /api/v1/auth/register
Body: { email, password, first_name?, last_name?, display_name? }

// تسجيل الدخول بالإيميل وكلمة المرور
POST /api/v1/auth/login/email
Body: { email, password }

// تسجيل الدخول عبر Google OAuth2
POST /api/v1/auth/google
Body: { credential } // Google ID Token
```

**المميزات:**
- ✅ تسجيل محلي (إيميل + كلمة مرور مشفرة بـ bcrypt)
- ✅ تسجيل عبر Google OAuth2 (باستخدام `google-auth-library`)
- ✅ التحقق من صحة البيانات قبل التسجيل
- ✅ منع تكرار الإيميل
- ✅ دعم التسجيل أو تسجيل الدخول التلقائي لحسابات Google

---

#### ✅ JWT-based Authentication (المصادقة المبنية على JWT)

**الملفات المعنية:**
- [src/modules/auth/services/auth.service.ts](../src/modules/auth/services/auth.service.ts)
- [src/modules/auth/index.ts](../src/modules/auth/index.ts)
- [src/config/security.config.ts](../src/config/security.config.ts)

**التنفيذ:**

```typescript
// توليد التوكنات
function generateToken(data: { userID: string }, isRefresh: boolean): string {
  const expiresIn = isRefresh ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
  return jwt.sign(data, JWT_SECRET, { expiresIn });
}

// التحقق من التوكن
function validateToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
```

**المميزات:**
- ✅ Access Token (صلاحية قصيرة - افتراضياً 1 ساعة)
- ✅ Refresh Token (صلاحية طويلة - افتراضياً 7 أيام)
- ✅ تخزين التوكنات في قاعدة البيانات للتحقق والإبطال
- ✅ تجديد التوكن عبر `/api/v1/auth/refresh-token`
- ✅ التحقق من صلاحية التوكن عبر `/api/v1/auth/validate`

**مسارات التوكن:**
| المسار | الوصف |
|--------|-------|
| `POST /api/v1/auth/refresh-token` | تجديد Access Token باستخدام Refresh Token |
| `GET /api/v1/auth/validate?token=xxx` | التحقق من صلاحية التوكن وجلب بيانات المستخدم |
| `GET /api/v1/auth/me` | جلب بيانات المستخدم الحالي |

---

#### ✅ Role-based Access Control (التحكم بالوصول حسب الأدوار)

**الملفات المعنية:**
- [src/modules/auth/middlewares/role.middleware.ts](../src/modules/auth/middlewares/role.middleware.ts)
- [src/modules/auth/index.ts](../src/modules/auth/index.ts)

**الأدوار المدعومة:**

| الدور | المستوى | الوصف |
|-------|---------|-------|
| `owner` | 1 (أعلى) | مالك النظام - جميع الصلاحيات تلقائياً |
| `admin` | 2 | مشرف - صلاحيات محددة حسب `permissions` |
| `user` | 3 | مستخدم عادي - صلاحيات أساسية |
| `guest` | 4 (أدنى) | زائر غير مصادق - قراءة فقط |

**التنفيذ:**

```typescript
// Middleware للتحقق من الأدوار
export const checkRole = (
  roles: UserRole[] = [], 
  adminPermissions: string[] = []
): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || 'guest';

    // التسلسل الهرمي: Owner > Admin > User > Guest
    const isAuthorized = roles.includes(userRole) || 
      (userRole === 'owner' && (roles.includes('admin') || roles.includes('user'))) ||
      (userRole === 'admin' && roles.includes('user'));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Owner معفى من فحص الصلاحيات
    if (userRole === 'owner') {
      next();
      return;
    }

    // فحص صلاحيات Admin
    if (userRole === 'admin' && adminPermissions.length > 0) {
      const permissions = req.user?.permissions || [];
      const hasAll = adminPermissions.every(p => permissions.includes(p));
      if (!hasAll) {
        res.status(403).json({ error: 'Missing permissions' });
        return;
      }
    }

    next();
  };
};
```

**أمثلة الاستخدام:**

```typescript
// السماح فقط للـ Owner
router.get('/stats', checkRole(['owner']), controller);

// السماح للـ Owner و Admin (مع صلاحية view_users)
router.get('/users', checkRole(['owner', 'admin'], ['view_users']), controller);

// السماح لجميع المستخدمين المصادق عليهم
router.get('/profile', checkRole(['owner', 'admin', 'user']), controller);
```

**صلاحيات Admin المتاحة:**
- `view_users` - عرض المستخدمين
- `view_cars` - عرض السيارات
- `create_cars` - إنشاء سيارات
- `update_cars` - تحديث سيارات
- `delete_cars` - حذف سيارات

---

### 2️⃣ Subscription Logic - Stripe Test Mode (منطق الاشتراكات)

#### ✅ Paid Subscription Plans (خطط الاشتراك المدفوعة)

**الملفات المعنية:**
- [src/modules/stripe/services/plans.service.ts](../src/modules/stripe/services/plans.service.ts)
- [src/modules/api/v1/restful/controllers/plans.controller.ts](../src/modules/api/v1/restful/controllers/plans.controller.ts)
- [src/modules/api/v1/restful/routes/plans.routes.ts](../src/modules/api/v1/restful/routes/plans.routes.ts)

**التنفيذ:**

```typescript
// جلب جميع الأسعار النشطة
GET /api/v1/plans/prices

// جلب أسعار الاشتراكات فقط (recurring)
GET /api/v1/plans/subscription-prices

// جلب المنتجات مع أسعارها
GET /api/v1/plans/products

// جلب Stripe Publishable Key للـ Frontend
GET /api/v1/plans/config
```

**نموذج السعر المُنسق:**
```typescript
interface FormattedPrice {
  id: string;                    // price_xxx
  productId: string;             // prod_xxx
  productName: string;           // "Pro Plan"
  active: boolean;
  currency: string;              // "USD"
  unitAmount: number;            // 1999 (بالسنت)
  unitAmountFormatted: string;   // "$19.99"
  type: 'one_time' | 'recurring';
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;         // 1
  trialPeriodDays: number | null;
  features: string[];            // من metadata
}
```

---

#### ✅ Stripe Checkout Integration (تكامل Stripe Checkout)

**الملفات المعنية:**
- [src/modules/stripe/services/checkout.service.ts](../src/modules/stripe/services/checkout.service.ts)
- [src/modules/stripe/services/stripe-subscriptions.service.ts](../src/modules/stripe/services/stripe-subscriptions.service.ts)

**التنفيذ:**

```typescript
// إنشاء جلسة Checkout للاشتراك
POST /api/v1/plans/subscriptions
Body: {
  customerId?: string,      // معرف العميل في Stripe (اختياري)
  priceId: string,          // معرف السعر (مطلوب)
  quantity?: number,        // الكمية (افتراضي: 1)
  trialPeriodDays?: number, // أيام التجربة المجانية
  paymentBehavior?: string, // سلوك الدفع
  couponId?: string,        // كوبون خصم
  metadata?: object         // بيانات إضافية
}
```

**مسار إنشاء اشتراك:**
1. التحقق من المستخدم المصادق (`req.user`)
2. البحث عن/إنشاء عميل Stripe بالإيميل
3. إنشاء الاشتراك في Stripe مع `metadata: { user_id }`
4. حفظ الاشتراك في قاعدة البيانات المحلية
5. إرجاع `clientSecret` للدفع (إذا كان incomplete)

```typescript
// خدمة إنشاء الاشتراك
async createSubscription(data: CreateStripeSubscriptionData) {
  // التحقق من عدم وجود اشتراك نشط
  const [existingActive] = await SubscriptionsService.getActiveByUserId(data.userId);
  if (existingActive) {
    return [null, new Error('User already has an active subscription')];
  }

  // إنشاء الاشتراك في Stripe Server (البورت 4242)
  const [response, error] = await stripeApi.post('/subscriptions', {
    priceId: data.priceId,
    quantity: data.quantity || 1,
    metadata: { user_id: data.userId, ...data.metadata }
  }, idempotencyKey, data.customerId);

  // مزامنة مع قاعدة البيانات المحلية
  await this.syncToDatabase(data.userId, formattedSubscription);

  return [formattedSubscription, null];
}
```

---

#### ✅ Webhook Handling (معالجة Webhooks)

**الأحداث المدعومة:**

| الحدث | الوصف | الإجراء |
|-------|-------|---------|
| `customer.subscription.created` | إنشاء اشتراك جديد | مزامنة مع DB المحلية |
| `customer.subscription.updated` | تحديث اشتراك | تحديث الحالة في DB المحلية |
| `customer.subscription.deleted` | حذف/إلغاء اشتراك | تحديث الحالة إلى `canceled` |
| `invoice.payment_succeeded` | نجاح الدفع | تسجيل العملية |
| `invoice.payment_failed` | فشل الدفع | تسجيل وإشعار |

**التنفيذ:**

```typescript
// معالجة Webhook في stripe-subscriptions.service.ts
async handleWebhookEvent(event: { type: string; data: { object: any } }) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const formatted = this.formatSubscription(subscription);
        await this.syncToDatabase(userId, formatted);
        console.log(`✅ Synced subscription ${subscription.id}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        // تحديث الحالة إلى canceled
        await SubscriptionsService.update(subscription.id, {
          status: SubscriptionStatus.CANCELED,
          canceled_at: new Date()
        });
      }
      break;
    }
  }
  return [true, null];
}
```

---

#### ✅ User Access Control Based on Subscription (التحكم بالوصول حسب الاشتراك)

**الملفات المعنية:**
- [src/modules/auth/middlewares/subscription.middleware.ts](../src/modules/auth/middlewares/subscription.middleware.ts)

**التنفيذ:**

```typescript
// Middleware للتحقق من الاشتراك
export const checkSubscription = (
  applyToRoles: UserRole[] = ['user'], 
  plans: string[],
  options: { verifyFromStripe?: boolean } = { verifyFromStripe: true }
): RequestHandler => {
  return async (req, res, next) => {
    const user = req.user;

    // Owner دائماً معفى
    if (user?.role === 'owner') {
      next();
      return;
    }

    // التحقق إذا كان الدور يحتاج اشتراك
    if (!applyToRoles.includes(user.role)) {
      next();
      return;
    }

    // التحقق من الاشتراك
    let hasValidSubscription = false;
    
    if (options.verifyFromStripe) {
      hasValidSubscription = await verifySubscriptionFromStripe(user, plans);
    } else {
      hasValidSubscription = await verifySubscriptionFromDatabase(user.userID, plans);
    }

    if (!hasValidSubscription) {
      res.status(403).json({
        error: 'SUBSCRIPTION_REQUIRED',
        requiredPlans: plans
      });
      return;
    }

    next();
  };
};
```

**حالات الاشتراك والوصول:**

| حالة الاشتراك | الوصول مسموح؟ |
|---------------|---------------|
| `active` | ✅ نعم |
| `trialing` | ✅ نعم |
| `past_due` | ⚠️ محدود (حسب الإعداد) |
| `canceled` | ❌ لا |
| `unpaid` | ❌ لا |
| `paused` | ❌ لا |
| `incomplete` | ❌ لا |

**مثال الاستخدام:**

```typescript
// مسار السيارات - يتطلب اشتراك "test subscription" للمستخدمين العاديين
router.get(
  '/',
  checkRole(['owner', 'admin', 'user']),
  checkSubscription(['user'], ['test subscription']),
  carsController.getAllCars
);
```

**التحقق المزدوج (Stripe + Local DB):**

```typescript
// التحقق من قاعدة البيانات المحلية لحالات الإلغاء اليدوي
async function verifySubscriptionFromStripe(user, allowedPlans) {
  // 1. جلب الاشتراكات من Stripe
  const [stripeSubscriptions] = await stripeSubscriptionsService.getCustomerSubscriptions(customerId);

  for (const sub of stripeSubscriptions) {
    // 2. التحقق من الحالة المحلية (قد تكون مختلفة)
    const [localSub] = await SubscriptionsService.getByStripeSubscriptionId(sub.id);
    
    if (localSub?.status === 'canceled' || localSub?.status === 'paused') {
      // الاشتراك ملغى محلياً، تجاهله
      continue;
    }

    // 3. التحقق من الخطة
    if (allowedPlans.includes(sub.planName)) {
      return true;
    }
  }
  return false;
}
```

---

#### ✅ Stripe Webhook Signature Verification (التحقق من توقيع Webhook)

**التنفيذ:**

يتم التحقق من توقيع Webhook على مستوى **Stripe Server** (البورت 4242) باستخدام:

```typescript
// في stripe_server (خادم منفصل)
const sig = req.headers['stripe-signature'];
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

try {
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  // معالجة الحدث
} catch (err) {
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

**الإعداد في `stripe.config.ts`:**

```typescript
export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // ...
};
```

---

### 3️⃣ User Dashboard (لوحة تحكم المستخدم)

#### ✅ Protected Route (مسار محمي)

**الملفات المعنية:**
- [src/modules/api/v1/restful/routes/cars.routes.ts](../src/modules/api/v1/restful/routes/cars.routes.ts)
- [src/modules/api/v1/restful/controllers/cars.controller.ts](../src/modules/api/v1/restful/controllers/cars.controller.ts)

**التنفيذ:**

```typescript
// مسار محمي يتطلب مصادقة + اشتراك نشط
router.get(
  '/',
  checkRole(['owner', 'admin', 'user']),           // التحقق من المصادقة والدور
  checkSubscription(['user'], ['test subscription']), // التحقق من الاشتراك
  carsController.getAllCars
);
```

---

#### ✅ Display Sample Records with Search, Pagination & Filtering

**التنفيذ في `cars.controller.ts`:**

```typescript
export const getAllCars = async (req, res, next) => {
  const { limit, offset, order, search, make, year } = req.query;

  const options: QueryOptions = {
    limit: Math.min(parseInt(limit) || 50, 200),  // حد أقصى 200
    offset: parseInt(offset) || 0,
    order: order ? JSON.parse(order) : undefined
  };

  let cars, error;

  // 🔍 البحث (Search)
  if (search) {
    [cars, error] = await CarsService.search(search, options);
  } 
  // 🏭 فلترة حسب الشركة المصنعة (Filtering)
  else if (make) {
    [cars, error] = await CarsService.getByMake(make, options);
  } 
  // 📅 فلترة حسب سنة الصنع (Filtering)
  else if (year) {
    [cars, error] = await CarsService.getByYear(parseInt(year), options);
  } 
  else {
    [cars, error] = await CarsService.getAll(options);
  }

  // 📊 جلب العدد الكلي للـ Pagination
  const [totalCount] = await CarsService.count();

  // 📄 حساب بيانات Pagination
  const count = totalCount || 0;
  const nextOffset = offset ? parseInt(offset) + currentLimit : currentLimit;
  const left = Math.max(0, count - nextOffset);

  send(res, { 
    success: true, 
    data: result, 
    count,        // العدد الكلي
    nextOffset,   // الـ offset التالي
    left          // المتبقي
  }, 'Success', 200);
};
```

**Query Parameters:**

| Parameter | النوع | الوصف | مثال |
|-----------|-------|-------|------|
| `limit` | number | عدد النتائج (max: 200) | `?limit=10` |
| `offset` | number | بداية النتائج | `?offset=20` |
| `search` | string | البحث في make, model, VIN | `?search=BMW` |
| `make` | string | فلترة حسب الشركة | `?make=Toyota` |
| `year` | number | فلترة حسب السنة | `?year=2023` |
| `order` | JSON | ترتيب النتائج | `?order=[["car_make","ASC"]]` |

**مثال الاستجابة:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-xxx",
      "car_make": "BMW",
      "car_model": "325i",
      "car_model_year": 2023,
      "car_vin": "WBAPH5C55BA123456"
    }
  ],
  "count": 150,       // إجمالي السجلات
  "nextOffset": 10,   // للصفحة التالية
  "left": 140,        // المتبقي
  "message": "Success"
}
```

---

#### ✅ Server-side Pagination (الترقيم من جانب الخادم)

**التنفيذ في `cars.service.ts`:**

```typescript
async getAll(options?: QueryOptions): Promise<[Car[] | null, Error | null]> {
  const cars = await Car.findAll({
    limit: options?.limit || 50,
    offset: options?.offset || 0,
    order: options?.order || [['created_at', 'DESC']]
  });
  return [cars, null];
}

async count(): Promise<[number | null, Error | null]> {
  const count = await Car.count();
  return [count, null];
}

async search(query: string, options?: QueryOptions): Promise<[Car[] | null, Error | null]> {
  const cars = await Car.findAll({
    where: {
      [Op.or]: [
        { car_make: { [Op.iLike]: `%${query}%` } },
        { car_model: { [Op.iLike]: `%${query}%` } },
        { car_vin: { [Op.iLike]: `%${query}%` } }
      ]
    },
    limit: options?.limit,
    offset: options?.offset
  });
  return [cars, null];
}
```

---

### 4️⃣ Admin Panel (لوحة تحكم المشرف)

#### ✅ Admin-only Access (الوصول للمشرفين فقط)

**الملفات المعنية:**
- [src/modules/api/v1/restful/routes/users.routes.ts](../src/modules/api/v1/restful/routes/users.routes.ts)
- [src/modules/api/v1/restful/routes/subscriptions.routes.ts](../src/modules/api/v1/restful/routes/subscriptions.routes.ts)
- [src/modules/api/v1/restful/routes/projectAdmins.routes.ts](../src/modules/api/v1/restful/routes/projectAdmins.routes.ts)

**التنفيذ:**

```typescript
// مسارات للـ Admin فقط (مع صلاحية view_users)
router.get('/', checkRole(['owner', 'admin'], ['view_users']), usersController.getAllUsers);

// مسارات للـ Owner فقط
router.get('/statistics', checkRole(['owner']), subscriptionsController.getSubscriptionStatistics);
```

---

#### ✅ View All Users (عرض جميع المستخدمين)

**المسار:** `GET /api/v1/users`

```typescript
export const getAllUsers = async (req, res, next) => {
  const { limit, offset, order, search, auth_provider } = req.query;

  const [users, error] = await UsersService.getAll(options);
  const [totalCount] = await UsersService.count();

  // فلترة حسب البحث
  if (search) {
    filteredUsers = users.filter(user => 
      user.email?.toLowerCase().includes(search) ||
      user.display_name?.toLowerCase().includes(search)
    );
  }

  // فلترة حسب نوع المصادقة (local/google)
  if (auth_provider && auth_provider !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.auth_provider === auth_provider);
  }

  send(res, { success: true, data: filteredUsers, count, nextOffset, left });
};
```

---

#### ✅ View User Subscription Status (عرض حالة اشتراك المستخدم)

**المسارات:**

```typescript
// اشتراكات مستخدم محدد
GET /api/v1/subscriptions/user/:userId
Access: owner, admin

// الاشتراك النشط لمستخدم محدد
GET /api/v1/subscriptions/user/:userId/active
Access: owner, admin

// جميع الاشتراكات
GET /api/v1/subscriptions
Access: owner, admin
Query: ?status=active&plan_name=Pro

// إحصائيات الاشتراكات
GET /api/v1/subscriptions/statistics
Access: owner only
```

**التنفيذ:**

```typescript
export const getSubscriptionsByUserId = async (req, res, next) => {
  const userId = req.params.userId;

  // جلب من Stripe مع مزامنة تلقائية
  const [user] = await UsersService.getById(userId);
  const [stripeCustomers] = await stripeCustomerService.findAllByEmail(user.email);
  
  for (const customer of stripeCustomers) {
    const [subs] = await stripeSubscriptionsService.getCustomerSubscriptions(customer.id);
    // مزامنة كل اشتراك مع DB المحلية
    for (const sub of subs) {
      await SubscriptionsService.upsertFromStripe(sub.stripeSubscriptionId, {...});
    }
  }

  send(res, { success: true, data: allSubscriptions });
};
```

---

#### ✅ Enable/Disable User Access Manually (تمكين/تعطيل وصول المستخدم يدوياً)

**المسارات:**

```typescript
// إلغاء اشتراك يدوياً
POST /api/v1/subscriptions/:id/cancel
Access: owner only

// إيقاف اشتراك مؤقتاً
POST /api/v1/subscriptions/:id/pause
Access: owner only

// استئناف اشتراك موقوف
POST /api/v1/subscriptions/:id/resume
Access: owner only

// تفعيل اشتراك
POST /api/v1/subscriptions/:id/activate
Access: owner only
```

**التنفيذ:**

```typescript
// إلغاء اشتراك (Admin Override)
export const cancelSubscription = async (req, res, next) => {
  const id = req.params.id;
  
  // تحديث الحالة في DB المحلية مباشرة
  const [result, error] = await SubscriptionsService.cancel(id);
  
  // ملاحظة: هذا يلغي الاشتراك محلياً حتى لو كان نشطاً في Stripe
  // مفيد للـ Admin Override
  
  send(res, { success: true, data: result }, 'تم إلغاء الاشتراك بنجاح');
};

// في subscription.middleware.ts - التحقق المزدوج
const [localSubscription] = await SubscriptionsService.getByStripeSubscriptionId(sub.id);
if (localSubscription?.status === 'canceled' || localSubscription?.status === 'paused') {
  // الاشتراك معطل محلياً بواسطة Admin
  continue; // رفض الوصول حتى لو نشط في Stripe
}
```

**إدارة صلاحيات Admin:**

```typescript
// إنشاء مشرف جديد
POST /api/v1/project-admins
Body: { user_id: "uuid", permissions: ["view_users", "view_cars"] }

// إضافة صلاحية
POST /api/v1/project-admins/:id/permissions
Body: { permission: "create_cars" }

// إزالة صلاحية
DELETE /api/v1/project-admins/:id/permissions
Body: { permission: "delete_cars" }
```

---

### 5️⃣ Security & Best Practices (الأمان وأفضل الممارسات)

#### ✅ Environment Variables for Secrets (متغيرات البيئة للأسرار)

**الملفات:**
- `src/config/environments/*.env`

| الملف | المحتوى |
|-------|---------|
| `Security.env` | JWT_SECRET, API_KEY, CORS settings |
| `Database.env` | DB credentials (PostgreSQL, MongoDB, Redis) |
| `Stripe.env` | Stripe keys and secrets |
| `IntegratedAuthentication.env` | OAuth credentials |

**مثال `Security.env`:**

```env
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
API_KEY=your-api-key
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

**القراءة الآمنة:**

```typescript
// security.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: './src/config/environments/Security.env' });

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET is required');
})();
```

---

#### ✅ Secure Password Hashing (تشفير كلمات المرور)

**الملف:** [src/utils/hash.util.ts](../src/utils/hash.util.ts)

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// تشفير كلمة المرور
export async function hashPassword(password: string, saltRounds = SALT_ROUNDS): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

// مقارنة كلمة المرور
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**الاستخدام:**

```typescript
// عند التسجيل
const password_hash = await hashPassword(password);
await UsersService.registerLocal({ email, password_hash });

// عند تسجيل الدخول
const isValid = await comparePassword(password, user.password_hash);
```

---

#### ✅ Input Validation (التحقق من المدخلات)

**الملفات:**
- [src/modules/api/v1/restful/validators/*.validator.ts](../src/modules/api/v1/restful/validators/)
- [src/middlewares/validation/validation.middleware.ts](../src/middlewares/validation/validation.middleware.ts)

**التنفيذ باستخدام Joi:**

```typescript
// cars.validator.ts
export const createCarSchema = {
  body: Joi.object({
    car_make: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'شركة التصنيع مطلوبة' }),
    
    car_model: Joi.string().trim().min(1).max(100).required(),
    
    car_model_year: Joi.number().integer().min(1900).max(2100).required(),
    
    car_vin: Joi.string().length(17).uppercase()
      .pattern(/^[A-HJ-NPR-Z0-9]{17}$/) // VIN pattern (no I, O, Q)
      .required()
  })
};

// users.validator.ts
export const updateUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    first_name: Joi.string().trim().min(1).max(100),
    last_name: Joi.string().trim().min(1).max(100),
    avatar_url: Joi.string().uri().allow('')
  }).min(1)
};
```

**Middleware:**

```typescript
// validation.middleware.ts
export default function validationMiddlewareFactory(
  schema: Joi.ObjectSchema,
  property: 'body' | 'params' | 'query'
): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    req[property] = value; // استخدام القيم المُنظفة
    next();
  };
}
```

**الاستخدام في Routes:**

```typescript
router.post(
  '/',
  checkRole(['owner', 'admin'], ['create_cars']),
  validationMiddlewareFactory(carsValidator.createCarSchema.body!, 'body'),
  carsController.createCar
);
```

---

#### ✅ Clean Error Handling (معالجة الأخطاء النظيفة)

**الملفات:**
- [src/middlewares/errors/errorHandler.middleware.ts](../src/middlewares/errors/errorHandler.middleware.ts)
- [src/utils/errors/errorResolver.util.ts](../src/utils/errors/errorResolver.util.ts)

**Error Handler Middleware:**

```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // تسجيل الخطأ
  logger.error(err.message, { stack: err.stack, path: req.path });

  // إخفاء التفاصيل في الإنتاج
  const response = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  };

  res.status(res.statusCode || 500).json(response);
};
```

**نمط Result Tuple:**

```typescript
// جميع الـ Services تُرجع [result, error]
const [user, error] = await UsersService.getById(id);

if (error) {
  res.status(500);
  return next(error);
}

if (!user) {
  send(res, { success: false }, 'User not found', 404);
  return;
}
```

---

#### ✅ Logical and Readable Project Structure (هيكل مشروع منطقي)

```
backend/
├── src/
│   ├── app.ts                     # تهيئة Express
│   ├── server.ts                  # نقطة الدخول
│   │
│   ├── config/                    # 🔧 الإعدادات
│   │   ├── environments/          # ملفات .env
│   │   ├── database.config.ts
│   │   ├── security.config.ts
│   │   ├── stripe.config.ts
│   │   └── ...
│   │
│   ├── middlewares/               # 🛡️ Middlewares
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── security/
│   │   └── validation/
│   │
│   ├── modules/                   # 📦 الوحدات
│   │   ├── api/v1/restful/        # RESTful API
│   │   │   ├── controllers/       # منطق الـ Endpoints
│   │   │   ├── routes/            # تعريف المسارات
│   │   │   └── validators/        # مخططات التحقق
│   │   │
│   │   ├── auth/                  # 🔐 المصادقة
│   │   │   ├── middlewares/       # role, subscription
│   │   │   ├── routes/
│   │   │   └── services/
│   │   │
│   │   ├── database/              # 🗄️ قواعد البيانات
│   │   │   └── postgreSQL/
│   │   │       ├── models/        # Sequelize Models
│   │   │       └── services/      # Data Access Layer
│   │   │
│   │   ├── stripe/                # 💳 Stripe
│   │   │   ├── stripe.api.ts      # API Client
│   │   │   └── services/          # Stripe Services
│   │   │
│   │   └── cache/                 # ⚡ Redis Cache
│   │
│   └── utils/                     # 🔧 أدوات مساعدة
│       ├── errors/
│       ├── hash.util.ts
│       ├── jwt.util.ts
│       ├── logger.util.ts
│       └── responseHandler.util.ts
│
├── docs/                          # 📚 التوثيق
├── logs/                          # 📝 السجلات
└── package.json
```

**مبادئ التنظيم:**
- **Separation of Concerns** - فصل المسؤوليات
- **Modular Architecture** - بنية وحدوية
- **Clear Naming** - تسمية واضحة
- **Consistent Patterns** - أنماط متسقة

---

## 📊 ملخص التنفيذ

| المتطلب | الحالة | الملاحظات |
|---------|--------|-----------|
| User Registration | ✅ مكتمل | Local + Google OAuth2 |
| JWT Authentication | ✅ مكتمل | Access + Refresh Tokens |
| Role-based Access | ✅ مكتمل | Owner > Admin > User > Guest |
| Subscription Plans | ✅ مكتمل | Stripe Integration |
| Stripe Checkout | ✅ مكتمل | عبر Stripe Server |
| Webhook Handling | ✅ مكتمل | كل الأحداث المطلوبة |
| Access Control by Subscription | ✅ مكتمل | Middleware + DB Check |
| Webhook Signature Verification | ✅ مكتمل | في Stripe Server |
| Protected Dashboard | ✅ مكتمل | Auth + Subscription |
| Search | ✅ مكتمل | Full-text search |
| Pagination | ✅ مكتمل | Server-side |
| Filtering | ✅ مكتمل | Multiple filters |
| Admin View Users | ✅ مكتمل | With permissions |
| Admin View Subscriptions | ✅ مكتمل | Per user + stats |
| Admin Override | ✅ مكتمل | Cancel/Pause locally |
| Environment Variables | ✅ مكتمل | Separated .env files |
| Password Hashing | ✅ مكتمل | bcrypt |
| Input Validation | ✅ مكتمل | Joi schemas |
| Error Handling | ✅ مكتمل | Centralized handler |
| Project Structure | ✅ مكتمل | Modular & clean |

---

## 🛠️ Graceful Shutdown

الخادم يدعم الإيقاف الآمن عند:
- `SIGTERM` - إشارة إنهاء
- `SIGINT` - Ctrl+C
- `uncaughtException` - استثناء غير معالج
- `unhandledRejection` - Promise rejection

### خطوات الإيقاف الآمن:
1. إغلاق اتصال قاعدة البيانات
2. إيقاف قبول اتصالات جديدة
3. إغلاق الاتصالات النشطة
4. إنهاء العملية

---

## 📞 الدعم والتواصل

- **المؤلف:** El-khodary
- **الإصدار:** 1.0.0
- **الترخيص:** ISC

---

*آخر تحديث: يناير 2026*
