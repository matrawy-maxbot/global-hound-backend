# 📚 Global Hound - Backend Project Documentation

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Project Structure](#-project-structure)
3. [Configuration System](#️-configuration-system)
4. [Middlewares System](#️-middlewares-system)
5. [Authentication System](#-authentication-system)
6. [Database System](#️-database-system)
7. [Stripe System](#-stripe-system)
8. [Caching System (Redis)](#-caching-system-redis-cache)
9. [API Interface (RESTful Routes)](#-api-interface-restful-routes)
10. [Utilities](#-utilities)
11. [Running the Project](#-running-the-project)
12. [Security](#-security)
13. [Monitoring and Logs](#-monitoring-and-logs)
14. [Core Requirements Implementation](#-core-requirements-implementation)
    - [Authentication & Roles](#1️⃣-authentication--roles)
    - [Subscription Logic - Stripe](#2️⃣-subscription-logic---stripe-test-mode)
    - [User Dashboard](#3️⃣-user-dashboard)
    - [Admin Panel](#4️⃣-admin-panel)
    - [Security & Best Practices](#5️⃣-security--best-practices)
15. [Implementation Summary](#-implementation-summary)
16. [Graceful Shutdown](#️-graceful-shutdown)
17. [Support and Contact](#-support-and-contact)

---

## 📋 Project Overview

This project is a **comprehensive Backend platform** built with **Node.js + Express.js + TypeScript**. It provides a RESTful API for managing users, subscriptions, payments via Stripe, and vehicle management.

### 🛠️ Technologies Used

| Technology | Description |
|------------|-------------|
| **Node.js** | Runtime Environment |
| **Express.js** | Web Framework |
| **TypeScript** | Programming Language |
| **PostgreSQL** | Primary Database (with Sequelize ORM) |
| **MongoDB** | Secondary Database (MongoDB Atlas) |
| **Redis** | Caching and Session Management |
| **Stripe** | Payment and Subscription Processing |
| **Passport.js** | Authentication |
| **JWT** | Token Management |
| **Winston** | Event Logging |
| **Joi** | Data Validation |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Main Express Application
│   ├── server.ts                 # Server Entry Point
│   ├── config/                   # Configuration Files
│   ├── middlewares/              # Middlewares
│   ├── modules/                  # Main Modules
│   │   ├── api/                  # API Interface
│   │   ├── auth/                 # Authentication System
│   │   ├── cache/                # Caching (Redis)
│   │   ├── database/             # Databases
│   │   └── stripe/               # Stripe Integration
│   └── utils/                    # Utility Tools
├── docs/                         # Documentation
├── logs/                         # Log Files
└── package.json                  # Project Dependencies
```

---

## ⚙️ Configuration System

### 📂 Environment Files

The project uses an advanced configuration system with separate `.env` files for each component:

| File | Description |
|------|-------------|
| `Server.env` | Server Settings (Port, Environment, URL) |
| `Database.env` | Database Settings (PostgreSQL, MongoDB, Redis) |
| `Security.env` | Security Settings (JWT, CORS, API Keys) |
| `Stripe.env` | Stripe Payment Settings |
| `SessionCookies.env` | Session and Cookie Settings |
| `IntegratedAuthentication.env` | OAuth (Google, Facebook, GitHub) |
| `Notifications.env` | Email (SMTP) and SMS (Twilio) |
| `FileStorage.env` | File Storage (Local/AWS S3) |

### 🔧 Server Configuration (`server.config.ts`)

```typescript
interface ServerConfigEnv {
  SERVER_HOST: string;     // Server Address (default: 0.0.0.0)
  SERVER_PORT: number;     // Port (default: 3003)
  NODE_ENV: 'development' | 'production' | 'testing';
  BASE_URL: string;        // Base URL for API
}
```

### 🔐 Security Configuration (`security.config.ts`)

```typescript
interface SecurityConfigEnv {
  JWT_SECRET: string;              // JWT Secret Key
  JWT_EXPIRES_IN: string;          // Access Token Expiry (default: 1h)
  JWT_REFRESH_EXPIRES_IN: string;  // Refresh Token Expiry (default: 7d)
  API_KEY: string;                 // API Key
  BOT_TOKEN: string;               // Discord Bot Token
  CORS_ORIGIN: string;             // Allowed Origins (comma-separated)
  CORS_METHODS: string;            // Allowed HTTP Methods
  CORS_CREDENTIALS: string;        // Allow Credentials
}
```

### 💳 Stripe Configuration (`stripe.config.ts`)

```typescript
interface StripeConfig {
  stripeServerUrl: string;    // External Stripe Server URL (port 4242)
  publishableKey: string;     // Publishable Key for Frontend
  webhookSecret: string;      // Webhook Secret
  adminApiKey: string;        // Admin API Key for Internal Communication
  apiVersion: string;         // API Version
}
```

### 🗄️ Database Configuration (`database.config.ts`)

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
  available: boolean;  // Is Redis available?
  host: string;
  port: number;
  password: string;
  db: number;
}
```

---

## 🛡️ Middlewares System

### 🔒 Security Middlewares

#### 1. CORS Middleware (`cors.middleware.ts`)
- Validation of allowed Origins
- Request statistics (allowed, blocked, noOrigin)
- Preflight Requests support

```typescript
// CORS Configuration
const corsOptions: CorsOptions = {
  origin: originValidator,
  methods: CORS_METHODS.split(','),
  allowedHeaders: CORS_HEADERS.split(','),
  credentials: CORS_CREDENTIALS,
  maxAge: 86400,  // 24 hours
};
```

#### 2. Helmet Middleware (`helmet.middleware.ts`)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (prevent clickjacking)
- XSS Filter
- No Sniff
- Hide X-Powered-By

#### 3. Rate Limiter Middleware (`rateLimiter.middleware.ts`)
- Protection against Brute Force attacks
- Uses Redis for caching
- Custom settings for each request type

```typescript
// Rate Limiter Types
authRateLimiter:    5 requests / 15 minutes    // Login
generalRateLimiter: 100 requests / 15 minutes  // General requests
strictRateLimiter:  10 requests / 5 minutes    // Sensitive requests
```

#### 4. Session Middleware (`session.middleware.ts`)
- Session storage in Redis (or Memory Store as Fallback)
- Secure Cookies support in production
- HttpOnly Cookies for XSS protection

#### 5. XSS Clean Middleware (`xssClean.middleware.ts`)
- Sanitize inputs from XSS code

### 📝 Logging Middlewares

#### 1. Request Logger (`requestLogger.middleware.ts`)
- Log all requests using Morgan
- Works only in development environment

#### 2. Response Time (`responseTime.middleware.ts`)
- Measure response time for each request

### ⚠️ Error Handling Middlewares

#### 1. Error Handler (`errorHandler.middleware.ts`)
- Centralized error handling
- Hide error details in production
- Error logging

#### 2. Not Found (`notFound.middleware.ts`)
- Handle requests for non-existent routes

### ✅ Validation Middleware (`validation.middleware.ts`)
- Data validation using Joi
- Support for params, query, body, headers
- Detailed error messages

---

## 🔐 Authentication System

### 📋 Overview

The system supports:
- ✅ Login via email and password
- ✅ Login via Google OAuth2
- ✅ Token system (Access Token + Refresh Token)
- ✅ Role system (Owner, Admin, User, Guest)

### 👥 User Types

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | System owner | All permissions |
| **Admin** | Administrator | Specific permissions based on permissions list |
| **User** | Regular user | Basic permissions |
| **Guest** | Visitor | Read only |

### 🔑 Token Management

```typescript
// Generate token
function generateToken(data: { userID: string }, isRefresh: boolean): string;

// Validate token
function validateToken(token: string): TokenPayload | null;
```

### 🛡️ Role Middleware (`role.middleware.ts`)

```typescript
// Check role
checkRole(['owner', 'admin'], ['view_users']);

// Hierarchy: Owner > Admin > User > Guest
```

### 💳 Subscription Middleware (`subscription.middleware.ts`)

```typescript
// Check subscription
checkSubscription(['user'], ['Pro', 'Enterprise']);

// Options:
// - verifyFromStripe: Verify directly from Stripe
// - customMessage: Custom error message
```

### 📍 Authentication Routes

| Route | Description |
|-------|-------------|
| `POST /api/v1/auth/register` | Register new user |
| `POST /api/v1/auth/login/email` | Login (email + password) |
| `POST /api/v1/auth/google` | Login via Google |
| `POST /api/v1/auth/refresh` | Refresh token |
| `POST /api/v1/auth/logout` | Logout |
| `GET /api/v1/auth/validate` | Validate token |

---

## 🗄️ Database System

### 📊 PostgreSQL (Sequelize ORM)

#### 🔌 Connection Setup (`db.config.ts`)

```typescript
const sequelizeOptions: Options = {
  dialect: 'postgres',
  pool: { max: 200, min: 5 },
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }  // For Supabase
  }
};
```

### 📋 Models

#### 1. User Model (`User.model.ts`)

```typescript
interface UserAttributes {
  id: string;              // UUID
  email: string;           // Unique
  password_hash?: string;  // For local registration only
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

// Subscription statuses (compatible with Stripe)
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
  car_make: string;     // Manufacturer (BMW, Toyota)
  car_model: string;    // Model (325, Camry)
  car_model_year: number;  // Year of manufacture
  car_vin: string;      // VIN (17 characters, unique)
  created_at: Date;
  updated_at: Date;
}
```

#### 4. ProjectAdmin Model (`ProjectAdmin.model.ts`)

```typescript
interface ProjectAdminAttributes {
  id: string;
  user_id: string;
  permissions: string[];  // List of permissions
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

## 💳 Stripe System

### 📋 Overview

The system communicates with an **external Stripe server** on port 4242 instead of using the Stripe SDK directly.

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

### 📦 Stripe Services

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

## 🚀 Caching System (Redis Cache)

### 📋 Overview

The system uses Redis for caching with **Batch Processing** support for performance optimization.

### 🔧 Redis Queue Batch Manager

```typescript
// Manager Settings
interface RedisQueueBatchManagerOptions {
  batchInterval?: number;      // Processing interval for SET/DEL (500ms)
  getBatchInterval?: number;   // Processing interval for GET (25ms)
  maxBatchSize?: number;       // Max SET/DEL batch size (100,000)
  getMaxBatchSize?: number;    // Max GET batch size (20,000)
  enableMetrics?: boolean;     // Enable metrics
}
```

### 📊 Available Functions

```typescript
// Store value
cacheSet<T>(key: string, value: T, ttl: number = 3600): void;
cacheSetAsync<T>(key: string, value: T, ttl: number = 3600): Promise<string>;

// Retrieve value
cacheGet(key: string): Promise<unknown>;

// Delete value
cacheDelete(key: string): void;
cacheDeleteAsync(key: string): Promise<number>;
```

### 🔄 Fallback

If Redis is unavailable, the system uses **In-Memory Cache** as an alternative with periodic cleanup of expired keys.

---

## 🌐 API Interface (RESTful Routes)

### 📍 Base Routes

| Base Path | Description |
|-----------|-------------|
| `/api/v1/auth` | Authentication |
| `/api/v1/users` | User Management |
| `/api/v1/project-admins` | Project Admin Management |
| `/api/v1/subscriptions` | Subscription Management |
| `/api/v1/plans` | Plans and Pricing |
| `/api/v1/customers` | Stripe Customers |
| `/api/v1/cars` | Vehicle Management |

### 👤 User Routes (`/api/v1/users`)

| Method | Route | Description | Permissions |
|--------|-------|-------------|-------------|
| `GET` | `/` | All users | owner, admin (view_users) |
| `GET` | `/:id` | User by ID | owner, admin (view_users) |
| `GET` | `/email/:email` | User by email | owner, admin (view_users) |
| `PUT` | `/:id` | Update user | owner |
| `DELETE` | `/:id` | Delete user | owner |

### 💳 Subscription Routes (`/api/v1/subscriptions`)

| Method | Route | Description | Permissions |
|--------|-------|-------------|-------------|
| `GET` | `/` | All subscriptions | owner, admin |
| `GET` | `/me` | My subscription | owner, admin, user |
| `POST` | `/me/cancel` | Cancel my subscription | owner, admin, user |
| `GET` | `/user/:userId` | User subscriptions | owner, admin |
| `GET` | `/user/:userId/active` | Active subscription | owner, admin |
| `GET` | `/statistics` | Statistics | owner |
| `GET` | `/expiring` | Expiring subscriptions | owner, admin |

### 📋 Plan Routes (`/api/v1/plans`)

| Method | Route | Description | Permissions |
|--------|-------|-------------|-------------|
| `GET` | `/config` | Stripe Publishable Key | Public |
| `GET` | `/prices` | All prices | Public |
| `GET` | `/subscription-prices` | Subscription prices | Public |
| `GET` | `/products` | Products with prices | Public |
| `GET` | `/prices/:priceId` | Specific price | Public |
| `GET` | `/products/:productId` | Specific product | Public |
| `POST` | `/subscriptions` | Create subscription | Authenticated |
| `GET` | `/subscriptions/:id` | Specific subscription | Authenticated |
| `POST` | `/subscriptions/:id/cancel` | Cancel subscription | Authenticated |

### 🚗 Car Routes (`/api/v1/cars`)

| Method | Route | Description | Permissions |
|--------|-------|-------------|-------------|
| `GET` | `/` | All cars | owner, admin, user (+ subscription) |
| `GET` | `/:id` | Car by ID | owner, admin, user (+ subscription) |
| `GET` | `/vin/:vin` | Car by VIN | owner, admin, user (+ subscription) |
| `GET` | `/statistics` | Car statistics | owner, admin (view_cars) |
| `POST` | `/` | Create car | owner, admin (create_cars) |
| `PUT` | `/:id` | Update car | owner, admin (update_cars) |
| `DELETE` | `/:id` | Delete car | owner, admin (delete_cars) |

### 👨‍💼 Project Admin Routes (`/api/v1/project-admins`)

| Method | Route | Description | Permissions |
|--------|-------|-------------|-------------|
| `GET` | `/` | All admins | owner |
| `GET` | `/:id` | Admin by ID | owner |
| `GET` | `/user/:userId` | Admin by user ID | owner |
| `GET` | `/permission/:permission` | Admins by permission | owner |
| `POST` | `/` | Create admin | owner |
| `PUT` | `/:id` | Update admin | owner |
| `DELETE` | `/:id` | Delete admin | owner |

---

## 🔧 Utilities

### 📤 Response Handler (`responseHandler.util.ts`)

```typescript
// Send unified response
successResponse(res: Response, data: ResponseData, message?: string, status?: number): Response;
```

### 🔒 Hash Utility (`hash.util.ts`)

```typescript
// Hash password
hashPassword(password: string, saltNumber?: number): Promise<string>;

// Compare passwords
comparePassword(password: string, hash: string): Promise<boolean>;
```

### 📝 Logger (`logger.util.ts`)

```typescript
// Winston Logger
logger.info(message);
logger.error(message);
logger.warn(message);

// Files:
// - logs/error.log (errors only)
// - logs/combined.log (all logs)
```

---

## 🚀 Running the Project

### 📋 Requirements

- Node.js >= 18
- PostgreSQL
- Redis (optional)
- Stripe account (for payments)

### 💻 Run Commands

```bash
# Install dependencies
npm install

# Run development environment
npm run dev

# Build project
npm run build

# Run production
npm run start

# TypeScript check
npm run typecheck

# Linting check
npm run lint
```

### 🌐 Access Points

| Endpoint | Description |
|----------|-------------|
| `http://localhost:3003` | Home Page |
| `http://localhost:3003/health` | Server Health Check |
| `http://localhost:3003/api/v1/*` | API Interface |
| `http://localhost:3003/cors-stats` | CORS Statistics (dev only) |

---

## 🔒 Security

### ✅ Implemented Security Features

1. **Helmet** - HTTP Headers protection
2. **CORS** - Origin control
3. **Rate Limiting** - DDoS protection
4. **XSS Protection** - Prevent XSS attacks
5. **JWT Authentication** - Secure authentication
6. **Password Hashing** - bcrypt encryption
7. **Secure Sessions** - Redis sessions
8. **Input Validation** - Joi schemas

### 🔑 Best Practices

- Use HTTPS in production
- Change JWT_SECRET regularly
- Enable secure cookies in production
- Monitor Rate Limit logs
- Update dependencies regularly

---

## 📊 Monitoring and Logs

### 📝 Log Files

```
logs/
├── error.log      # Errors only
└── combined.log   # All logs
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

## ✅ Core Requirements Implementation

This section explains how each core project requirement has been implemented.

---

### 1️⃣ Authentication & Roles

#### ✅ User Registration and Login

**Related Files:**
- [src/modules/auth/routes/auth.route.ts](../src/modules/auth/routes/auth.route.ts)
- [src/modules/auth/services/auth.service.ts](../src/modules/auth/services/auth.service.ts)
- [src/modules/database/postgreSQL/services/users.service.ts](../src/modules/database/postgreSQL/services/users.service.ts)

**Implementation:**

```typescript
// Register new user
POST /api/v1/auth/register
Body: { email, password, first_name?, last_name?, display_name? }

// Login with email and password
POST /api/v1/auth/login/email
Body: { email, password }

// Login via Google OAuth2
POST /api/v1/auth/google
Body: { credential } // Google ID Token
```

**Features:**
- ✅ Local registration (email + password encrypted with bcrypt)
- ✅ Registration via Google OAuth2 (using `google-auth-library`)
- ✅ Data validation before registration
- ✅ Prevent duplicate emails
- ✅ Auto registration or login support for Google accounts

---

#### ✅ JWT-based Authentication

**Related Files:**
- [src/modules/auth/services/auth.service.ts](../src/modules/auth/services/auth.service.ts)
- [src/modules/auth/index.ts](../src/modules/auth/index.ts)
- [src/config/security.config.ts](../src/config/security.config.ts)

**Implementation:**

```typescript
// Generate tokens
function generateToken(data: { userID: string }, isRefresh: boolean): string {
  const expiresIn = isRefresh ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
  return jwt.sign(data, JWT_SECRET, { expiresIn });
}

// Validate token
function validateToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
```

**Features:**
- ✅ Access Token (short validity - default 1 hour)
- ✅ Refresh Token (long validity - default 7 days)
- ✅ Store tokens in database for validation and revocation
- ✅ Token refresh via `/api/v1/auth/refresh-token`
- ✅ Token validation via `/api/v1/auth/validate`

**Token Routes:**
| Route | Description |
|-------|-------------|
| `POST /api/v1/auth/refresh-token` | Refresh Access Token using Refresh Token |
| `GET /api/v1/auth/validate?token=xxx` | Validate token and fetch user data |
| `GET /api/v1/auth/me` | Get current user data |

---

#### ✅ Role-based Access Control

**Related Files:**
- [src/modules/auth/middlewares/role.middleware.ts](../src/modules/auth/middlewares/role.middleware.ts)
- [src/modules/auth/index.ts](../src/modules/auth/index.ts)

**Supported Roles:**

| Role | Level | Description |
|------|-------|-------------|
| `owner` | 1 (highest) | System owner - all permissions automatically |
| `admin` | 2 | Administrator - specific permissions based on `permissions` |
| `user` | 3 | Regular user - basic permissions |
| `guest` | 4 (lowest) | Unauthenticated visitor - read only |

**Implementation:**

```typescript
// Role check middleware
export const checkRole = (
  roles: UserRole[] = [], 
  adminPermissions: string[] = []
): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || 'guest';

    // Hierarchy: Owner > Admin > User > Guest
    const isAuthorized = roles.includes(userRole) || 
      (userRole === 'owner' && (roles.includes('admin') || roles.includes('user'))) ||
      (userRole === 'admin' && roles.includes('user'));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Owner is exempt from permission checks
    if (userRole === 'owner') {
      next();
      return;
    }

    // Check Admin permissions
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

**Usage Examples:**

```typescript
// Allow only Owner
router.get('/stats', checkRole(['owner']), controller);

// Allow Owner and Admin (with view_users permission)
router.get('/users', checkRole(['owner', 'admin'], ['view_users']), controller);

// Allow all authenticated users
router.get('/profile', checkRole(['owner', 'admin', 'user']), controller);
```

**Available Admin Permissions:**
- `view_users` - View users
- `view_cars` - View cars
- `create_cars` - Create cars
- `update_cars` - Update cars
- `delete_cars` - Delete cars

---

### 2️⃣ Subscription Logic - Stripe Test Mode

#### ✅ Paid Subscription Plans

**Related Files:**
- [src/modules/stripe/services/plans.service.ts](../src/modules/stripe/services/plans.service.ts)
- [src/modules/api/v1/restful/controllers/plans.controller.ts](../src/modules/api/v1/restful/controllers/plans.controller.ts)
- [src/modules/api/v1/restful/routes/plans.routes.ts](../src/modules/api/v1/restful/routes/plans.routes.ts)

**Implementation:**

```typescript
// Get all active prices
GET /api/v1/plans/prices

// Get subscription prices only (recurring)
GET /api/v1/plans/subscription-prices

// Get products with their prices
GET /api/v1/plans/products

// Get Stripe Publishable Key for Frontend
GET /api/v1/plans/config
```

**Formatted Price Model:**
```typescript
interface FormattedPrice {
  id: string;                    // price_xxx
  productId: string;             // prod_xxx
  productName: string;           // "Pro Plan"
  active: boolean;
  currency: string;              // "USD"
  unitAmount: number;            // 1999 (in cents)
  unitAmountFormatted: string;   // "$19.99"
  type: 'one_time' | 'recurring';
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;         // 1
  trialPeriodDays: number | null;
  features: string[];            // from metadata
}
```

---

#### ✅ Stripe Checkout Integration

**Related Files:**
- [src/modules/stripe/services/checkout.service.ts](../src/modules/stripe/services/checkout.service.ts)
- [src/modules/stripe/services/stripe-subscriptions.service.ts](../src/modules/stripe/services/stripe-subscriptions.service.ts)

**Implementation:**

```typescript
// Create Checkout session for subscription
POST /api/v1/plans/subscriptions
Body: {
  customerId?: string,      // Stripe customer ID (optional)
  priceId: string,          // Price ID (required)
  quantity?: number,        // Quantity (default: 1)
  trialPeriodDays?: number, // Free trial days
  paymentBehavior?: string, // Payment behavior
  couponId?: string,        // Discount coupon
  metadata?: object         // Additional data
}
```

**Subscription Creation Flow:**
1. Verify authenticated user (`req.user`)
2. Find/create Stripe customer by email
3. Create subscription in Stripe with `metadata: { user_id }`
4. Save subscription in local database
5. Return `clientSecret` for payment (if incomplete)

```typescript
// Subscription creation service
async createSubscription(data: CreateStripeSubscriptionData) {
  // Check for existing active subscription
  const [existingActive] = await SubscriptionsService.getActiveByUserId(data.userId);
  if (existingActive) {
    return [null, new Error('User already has an active subscription')];
  }

  // Create subscription in Stripe Server (port 4242)
  const [response, error] = await stripeApi.post('/subscriptions', {
    priceId: data.priceId,
    quantity: data.quantity || 1,
    metadata: { user_id: data.userId, ...data.metadata }
  }, idempotencyKey, data.customerId);

  // Sync with local database
  await this.syncToDatabase(data.userId, formattedSubscription);

  return [formattedSubscription, null];
}
```

---

#### ✅ Webhook Handling

**Supported Events:**

| Event | Description | Action |
|-------|-------------|--------|
| `customer.subscription.created` | New subscription created | Sync with local DB |
| `customer.subscription.updated` | Subscription updated | Update status in local DB |
| `customer.subscription.deleted` | Subscription deleted/canceled | Update status to `canceled` |
| `invoice.payment_succeeded` | Payment succeeded | Log transaction |
| `invoice.payment_failed` | Payment failed | Log and notify |

**Implementation:**

```typescript
// Webhook handling in stripe-subscriptions.service.ts
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
        // Update status to canceled
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

#### ✅ User Access Control Based on Subscription

**Related Files:**
- [src/modules/auth/middlewares/subscription.middleware.ts](../src/modules/auth/middlewares/subscription.middleware.ts)

**Implementation:**

```typescript
// Subscription check middleware
export const checkSubscription = (
  applyToRoles: UserRole[] = ['user'], 
  plans: string[],
  options: { verifyFromStripe?: boolean } = { verifyFromStripe: true }
): RequestHandler => {
  return async (req, res, next) => {
    const user = req.user;

    // Owner is always exempt
    if (user?.role === 'owner') {
      next();
      return;
    }

    // Check if role requires subscription
    if (!applyToRoles.includes(user.role)) {
      next();
      return;
    }

    // Verify subscription
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

**Subscription Status and Access:**

| Subscription Status | Access Allowed? |
|---------------------|-----------------|
| `active` | ✅ Yes |
| `trialing` | ✅ Yes |
| `past_due` | ⚠️ Limited (configurable) |
| `canceled` | ❌ No |
| `unpaid` | ❌ No |
| `paused` | ❌ No |
| `incomplete` | ❌ No |

**Usage Example:**

```typescript
// Car route - requires "test subscription" for regular users
router.get(
  '/',
  checkRole(['owner', 'admin', 'user']),
  checkSubscription(['user'], ['test subscription']),
  carsController.getAllCars
);
```

**Dual Verification (Stripe + Local DB):**

```typescript
// Check local database for manual cancellation
async function verifySubscriptionFromStripe(user, allowedPlans) {
  // 1. Fetch subscriptions from Stripe
  const [stripeSubscriptions] = await stripeSubscriptionsService.getCustomerSubscriptions(customerId);

  for (const sub of stripeSubscriptions) {
    // 2. Check local status (may be different)
    const [localSub] = await SubscriptionsService.getByStripeSubscriptionId(sub.id);
    
    if (localSub?.status === 'canceled' || localSub?.status === 'paused') {
      // Subscription canceled locally, ignore it
      continue;
    }

    // 3. Check plan
    if (allowedPlans.includes(sub.planName)) {
      return true;
    }
  }
  return false;
}
```

---

#### ✅ Stripe Webhook Signature Verification

**Implementation:**

Webhook signature verification is done at the **Stripe Server** level (port 4242) using:

```typescript
// In stripe_server (separate server)
const sig = req.headers['stripe-signature'];
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

try {
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  // Process event
} catch (err) {
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

**Configuration in `stripe.config.ts`:**

```typescript
export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // ...
};
```

---

### 3️⃣ User Dashboard

#### ✅ Protected Route

**Related Files:**
- [src/modules/api/v1/restful/routes/cars.routes.ts](../src/modules/api/v1/restful/routes/cars.routes.ts)
- [src/modules/api/v1/restful/controllers/cars.controller.ts](../src/modules/api/v1/restful/controllers/cars.controller.ts)

**Implementation:**

```typescript
// Protected route requiring authentication + active subscription
router.get(
  '/',
  checkRole(['owner', 'admin', 'user']),           // Check authentication and role
  checkSubscription(['user'], ['test subscription']), // Check subscription
  carsController.getAllCars
);
```

---

#### ✅ Display Sample Records with Search, Pagination & Filtering

**Implementation in `cars.controller.ts`:**

```typescript
export const getAllCars = async (req, res, next) => {
  const { limit, offset, order, search, make, year } = req.query;

  const options: QueryOptions = {
    limit: Math.min(parseInt(limit) || 50, 200),  // Max 200
    offset: parseInt(offset) || 0,
    order: order ? JSON.parse(order) : undefined
  };

  let cars, error;

  // 🔍 Search
  if (search) {
    [cars, error] = await CarsService.search(search, options);
  } 
  // 🏭 Filter by manufacturer
  else if (make) {
    [cars, error] = await CarsService.getByMake(make, options);
  } 
  // 📅 Filter by year
  else if (year) {
    [cars, error] = await CarsService.getByYear(parseInt(year), options);
  } 
  else {
    [cars, error] = await CarsService.getAll(options);
  }

  // 📊 Get total count for Pagination
  const [totalCount] = await CarsService.count();

  // 📄 Calculate Pagination data
  const count = totalCount || 0;
  const nextOffset = offset ? parseInt(offset) + currentLimit : currentLimit;
  const left = Math.max(0, count - nextOffset);

  send(res, { 
    success: true, 
    data: result, 
    count,        // Total count
    nextOffset,   // Next offset
    left          // Remaining
  }, 'Success', 200);
};
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | number | Number of results (max: 200) | `?limit=10` |
| `offset` | number | Starting point | `?offset=20` |
| `search` | string | Search in make, model, VIN | `?search=BMW` |
| `make` | string | Filter by manufacturer | `?make=Toyota` |
| `year` | number | Filter by year | `?year=2023` |
| `order` | JSON | Sort results | `?order=[["car_make","ASC"]]` |

**Response Example:**

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
  "count": 150,       // Total records
  "nextOffset": 10,   // For next page
  "left": 140,        // Remaining
  "message": "Success"
}
```

---

#### ✅ Server-side Pagination

**Implementation in `cars.service.ts`:**

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

### 4️⃣ Admin Panel

#### ✅ Admin-only Access

**Related Files:**
- [src/modules/api/v1/restful/routes/users.routes.ts](../src/modules/api/v1/restful/routes/users.routes.ts)
- [src/modules/api/v1/restful/routes/subscriptions.routes.ts](../src/modules/api/v1/restful/routes/subscriptions.routes.ts)
- [src/modules/api/v1/restful/routes/projectAdmins.routes.ts](../src/modules/api/v1/restful/routes/projectAdmins.routes.ts)

**Implementation:**

```typescript
// Admin-only routes (with view_users permission)
router.get('/', checkRole(['owner', 'admin'], ['view_users']), usersController.getAllUsers);

// Owner-only routes
router.get('/statistics', checkRole(['owner']), subscriptionsController.getSubscriptionStatistics);
```

---

#### ✅ View All Users

**Route:** `GET /api/v1/users`

```typescript
export const getAllUsers = async (req, res, next) => {
  const { limit, offset, order, search, auth_provider } = req.query;

  const [users, error] = await UsersService.getAll(options);
  const [totalCount] = await UsersService.count();

  // Filter by search
  if (search) {
    filteredUsers = users.filter(user => 
      user.email?.toLowerCase().includes(search) ||
      user.display_name?.toLowerCase().includes(search)
    );
  }

  // Filter by auth type (local/google)
  if (auth_provider && auth_provider !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.auth_provider === auth_provider);
  }

  send(res, { success: true, data: filteredUsers, count, nextOffset, left });
};
```

---

#### ✅ View User Subscription Status

**Routes:**

```typescript
// Subscriptions for a specific user
GET /api/v1/subscriptions/user/:userId
Access: owner, admin

// Active subscription for a specific user
GET /api/v1/subscriptions/user/:userId/active
Access: owner, admin

// All subscriptions
GET /api/v1/subscriptions
Access: owner, admin
Query: ?status=active&plan_name=Pro

// Subscription statistics
GET /api/v1/subscriptions/statistics
Access: owner only
```

**Implementation:**

```typescript
export const getSubscriptionsByUserId = async (req, res, next) => {
  const userId = req.params.userId;

  // Fetch from Stripe with auto-sync
  const [user] = await UsersService.getById(userId);
  const [stripeCustomers] = await stripeCustomerService.findAllByEmail(user.email);
  
  for (const customer of stripeCustomers) {
    const [subs] = await stripeSubscriptionsService.getCustomerSubscriptions(customer.id);
    // Sync each subscription with local DB
    for (const sub of subs) {
      await SubscriptionsService.upsertFromStripe(sub.stripeSubscriptionId, {...});
    }
  }

  send(res, { success: true, data: allSubscriptions });
};
```

---

#### ✅ Enable/Disable User Access Manually

**Routes:**

```typescript
// Cancel subscription manually
POST /api/v1/subscriptions/:id/cancel
Access: owner only

// Pause subscription temporarily
POST /api/v1/subscriptions/:id/pause
Access: owner only

// Resume paused subscription
POST /api/v1/subscriptions/:id/resume
Access: owner only

// Activate subscription
POST /api/v1/subscriptions/:id/activate
Access: owner only
```

**Implementation:**

```typescript
// Cancel subscription (Admin Override)
export const cancelSubscription = async (req, res, next) => {
  const id = req.params.id;
  
  // Update status in local DB directly
  const [result, error] = await SubscriptionsService.cancel(id);
  
  // Note: This cancels the subscription locally even if active in Stripe
  // Useful for Admin Override
  
  send(res, { success: true, data: result }, 'Subscription canceled successfully');
};

// In subscription.middleware.ts - Dual verification
const [localSubscription] = await SubscriptionsService.getByStripeSubscriptionId(sub.id);
if (localSubscription?.status === 'canceled' || localSubscription?.status === 'paused') {
  // Subscription disabled locally by Admin
  continue; // Deny access even if active in Stripe
}
```

**Admin Permission Management:**

```typescript
// Create new admin
POST /api/v1/project-admins
Body: { user_id: "uuid", permissions: ["view_users", "view_cars"] }

// Add permission
POST /api/v1/project-admins/:id/permissions
Body: { permission: "create_cars" }

// Remove permission
DELETE /api/v1/project-admins/:id/permissions
Body: { permission: "delete_cars" }
```

---

### 5️⃣ Security & Best Practices

#### ✅ Environment Variables for Secrets

**Files:**
- `src/config/environments/*.env`

| File | Content |
|------|---------|
| `Security.env` | JWT_SECRET, API_KEY, CORS settings |
| `Database.env` | DB credentials (PostgreSQL, MongoDB, Redis) |
| `Stripe.env` | Stripe keys and secrets |
| `IntegratedAuthentication.env` | OAuth credentials |

**Example `Security.env`:**

```env
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
API_KEY=your-api-key
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

**Secure Reading:**

```typescript
// security.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: './src/config/environments/Security.env' });

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET is required');
})();
```

---

#### ✅ Secure Password Hashing

**File:** [src/utils/hash.util.ts](../src/utils/hash.util.ts)

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Hash password
export async function hashPassword(password: string, saltRounds = SALT_ROUNDS): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

// Compare passwords
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Usage:**

```typescript
// During registration
const password_hash = await hashPassword(password);
await UsersService.registerLocal({ email, password_hash });

// During login
const isValid = await comparePassword(password, user.password_hash);
```

---

#### ✅ Input Validation

**Files:**
- [src/modules/api/v1/restful/validators/*.validator.ts](../src/modules/api/v1/restful/validators/)
- [src/middlewares/validation/validation.middleware.ts](../src/middlewares/validation/validation.middleware.ts)

**Implementation using Joi:**

```typescript
// cars.validator.ts
export const createCarSchema = {
  body: Joi.object({
    car_make: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'Manufacturer is required' }),
    
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

    req[property] = value; // Use sanitized values
    next();
  };
}
```

**Usage in Routes:**

```typescript
router.post(
  '/',
  checkRole(['owner', 'admin'], ['create_cars']),
  validationMiddlewareFactory(carsValidator.createCarSchema.body!, 'body'),
  carsController.createCar
);
```

---

#### ✅ Clean Error Handling

**Files:**
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
  // Log error
  logger.error(err.message, { stack: err.stack, path: req.path });

  // Hide details in production
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

**Result Tuple Pattern:**

```typescript
// All Services return [result, error]
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

#### ✅ Logical and Readable Project Structure

```
backend/
├── src/
│   ├── app.ts                     # Express configuration
│   ├── server.ts                  # Entry point
│   │
│   ├── config/                    # 🔧 Configuration
│   │   ├── environments/          # .env files
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
│   ├── modules/                   # 📦 Modules
│   │   ├── api/v1/restful/        # RESTful API
│   │   │   ├── controllers/       # Endpoint logic
│   │   │   ├── routes/            # Route definitions
│   │   │   └── validators/        # Validation schemas
│   │   │
│   │   ├── auth/                  # 🔐 Authentication
│   │   │   ├── middlewares/       # role, subscription
│   │   │   ├── routes/
│   │   │   └── services/
│   │   │
│   │   ├── database/              # 🗄️ Databases
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
│   └── utils/                     # 🔧 Utilities
│       ├── errors/
│       ├── hash.util.ts
│       ├── jwt.util.ts
│       ├── logger.util.ts
│       └── responseHandler.util.ts
│
├── docs/                          # 📚 Documentation
├── logs/                          # 📝 Logs
└── package.json
```

**Organization Principles:**
- **Separation of Concerns** - Separate responsibilities
- **Modular Architecture** - Modular structure
- **Clear Naming** - Clear naming conventions
- **Consistent Patterns** - Consistent patterns

---

## 📊 Implementation Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| User Registration | ✅ Complete | Local + Google OAuth2 |
| JWT Authentication | ✅ Complete | Access + Refresh Tokens |
| Role-based Access | ✅ Complete | Owner > Admin > User > Guest |
| Subscription Plans | ✅ Complete | Stripe Integration |
| Stripe Checkout | ✅ Complete | Via Stripe Server |
| Webhook Handling | ✅ Complete | All required events |
| Access Control by Subscription | ✅ Complete | Middleware + DB Check |
| Webhook Signature Verification | ✅ Complete | In Stripe Server |
| Protected Dashboard | ✅ Complete | Auth + Subscription |
| Search | ✅ Complete | Full-text search |
| Pagination | ✅ Complete | Server-side |
| Filtering | ✅ Complete | Multiple filters |
| Admin View Users | ✅ Complete | With permissions |
| Admin View Subscriptions | ✅ Complete | Per user + stats |
| Admin Override | ✅ Complete | Cancel/Pause locally |
| Environment Variables | ✅ Complete | Separated .env files |
| Password Hashing | ✅ Complete | bcrypt |
| Input Validation | ✅ Complete | Joi schemas |
| Error Handling | ✅ Complete | Centralized handler |
| Project Structure | ✅ Complete | Modular & clean |

---

## 🛠️ Graceful Shutdown

The server supports graceful shutdown on:
- `SIGTERM` - Termination signal
- `SIGINT` - Ctrl+C
- `uncaughtException` - Unhandled exception
- `unhandledRejection` - Promise rejection

### Graceful Shutdown Steps:
1. Close database connection
2. Stop accepting new connections
3. Close active connections
4. Terminate process

---

## 📞 Support and Contact

- **Author:** El-khodary
- **Version:** 1.0.0
- **License:** ISC

---

*Last Updated: January 2026*
