# 📚 Global Hound Project Summary - Comprehensive Guide

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Technologies Used](#️-technologies-used)
3. [Project Structure](#-project-structure)
4. [Authentication System](#-authentication-system)
5. [Roles and Permissions System](#-roles-and-permissions-system)
6. [Subscriptions and Payments System](#-subscriptions-and-payments-system)
7. [API Interfaces](#-api-interfaces)
8. [Databases](#️-databases)
9. [Security and Protection](#-security-and-protection)
10. [Pages and Components](#-pages-and-components)
11. [Running the Project](#-running-the-project)
12. [Implementation Summary](#-implementation-summary)

---

## 🎯 Project Overview

**Global Hound** is an integrated project consisting of three main parts:

| Part | Description | Port |
|------|-------------|------|
| **Backend** | Node.js/Express server for the main API | `3003` |
| **Stripe Server** | Separate server for handling Stripe | `4242` |
| **Frontend** | Next.js application for the frontend | `3000` |

### 🔍 Why Separate the Stripe Server?

The Stripe server was separated from the main Backend for several important reasons:

| Reason | Details |
|--------|---------|
| **🔒 Security** | Isolating Stripe secret keys in a separate server reduces the attack surface. If the main Backend is compromised, payment keys remain secure |
| **📦 Isolation** | Separating payment logic prevents any Backend issues from affecting payment operations, and vice versa |
| **📈 Scaling** | The Stripe server can be scaled independently based on transaction volume without needing to scale the entire Backend |
| **🔧 Maintenance** | Updating or maintaining the payment system doesn't require restarting the main Backend |
| **🧪 Testing** | Easy to test the payment system separately |

### Main Features
- ✅ Registration and authentication system (Local + Google OAuth)
- ✅ Multi-level role system (Owner, Admin, User, Guest)
- ✅ Paid subscription system via Stripe
- ✅ Dashboard for users and administrators
- ✅ Car management system (as a data example)
- ✅ Caching system using Redis

---

## 🛠️ Technologies Used

### Backend Stack

| Technology | Description |
|------------|-------------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| TypeScript | Programming language |
| PostgreSQL | Database (Sequelize ORM) |
| Redis | Caching and sessions |
| JWT | Token management |
| Passport.js | Authentication |
| Winston | Event logging |
| Joi | Data validation |

### Frontend Stack

| Technology | Version | Description |
|------------|---------|-------------|
| Next.js | 16.1.4 | React framework |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Programming language |
| Tailwind CSS | ^4 | Design framework |
| @react-oauth/google | ^0.13.4 | Google authentication |
| @stripe/stripe-js | ^8.6.4 | Stripe integration |

### Stripe Server Stack

| Technology | Description |
|------------|-------------|
| Node.js + Express | Payment server |
| Stripe SDK | Payment processing |
| Redis | Caching (optional) |

---

## 📁 Project Structure

```
mvp/
├── backend/                      # 🔧 Main Server
│   ├── src/
│   │   ├── app.ts               # Express application
│   │   ├── server.ts            # Entry point
│   │   ├── config/              # Configuration
│   │   ├── middlewares/         # Middlewares
│   │   ├── modules/
│   │   │   ├── api/             # RESTful API
│   │   │   ├── auth/            # Authentication
│   │   │   ├── cache/           # Redis Cache
│   │   │   ├── database/        # Databases
│   │   │   └── stripe/          # Stripe integration
│   │   └── utils/               # Helper utilities
│   └── docs/                    # Documentation
│
├── global-hound/                 # 🌐 Frontend
│   ├── app/                     # Next.js pages
│   │   ├── layout.tsx           # Main layout
│   │   ├── page.tsx             # Home page
│   │   ├── login/               # Login
│   │   ├── register/            # Registration
│   │   ├── account/             # Account
│   │   ├── plans/               # Plans
│   │   ├── payment/             # Payment
│   │   ├── users/               # User management
│   │   ├── admins/              # Admin management
│   │   └── cars/                # Car management
│   ├── components/              # Components
│   ├── lib/                     # Context Providers
│   └── docs/                    # Documentation
│
└── docs/                        # 📚 General Summary
```

---

## 🔐 Authentication System

### Login Methods

| Method | Description | API Endpoint |
|--------|-------------|--------------|
| Local | Email + Password | `POST /api/v1/auth/login/email` |
| Google OAuth | Login via Google | `POST /api/v1/auth/google` |
| Registration | Create new account | `POST /api/v1/auth/register` |

### Token System (JWT)

```typescript
// Token generation
Access Token  → Validity: 1 hour (configurable)
Refresh Token → Validity: 7 days (configurable)

// Validation and renewal
GET  /api/v1/auth/validate      → Validate token
POST /api/v1/auth/refresh-token → Refresh Access Token
GET  /api/v1/auth/me            → Current user data
POST /api/v1/auth/logout        → Logout
```

### Storage Mechanism (Frontend)

```typescript
// Storage in localStorage
localStorage.setItem('token', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// On expiration (401) → Automatic refresh attempt
```

---

## 👥 Roles and Permissions System

### Role Hierarchy

| Role | Level | Description | Permissions |
|------|-------|-------------|-------------|
| `owner` | 1 (Highest) | System owner | All permissions automatically |
| `admin` | 2 | Administrator | Specific customizable permissions |
| `user` | 3 | Regular user | Basic permissions |
| `guest` | 4 (Lowest) | Unauthenticated visitor | Limited read access |

### Available Admin Permissions

| Permission | Description |
|------------|-------------|
| `view_users` | View user list |
| `view_cars` | View car list |
| `create_cars` | Create new cars |
| `update_cars` | Edit car data |
| `delete_cars` | Delete cars |

### Using Role Middleware

```typescript
// Backend - Role verification
checkRole(['owner', 'admin'], ['view_users'])

// Frontend - Verification in React
const { isOwner, isAdmin, hasPermission } = useAuth();
if (hasPermission('view_users')) { /* Display content */ }
```

---

## 💳 Subscriptions and Payments System

### System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │──▶│   Backend   │───▶│ Stripe API  │
│  (Next.js)  │    │ (Port 3003) │    │ (Port 4242) │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                     │
       └─────────────────────────────────────┘
            stripe.confirmCardPayment()
```

### Subscription Flow

1. **Fetch Plans** → `GET /api/v1/plans/subscription-prices`
2. **Create/Fetch Stripe Customer** → `POST /api/v1/customers/get-or-create`
3. **Create Subscription** → `POST /api/v1/plans/subscriptions`
4. **Confirm Payment** → `stripe.confirmCardPayment(clientSecret)`
5. **Save to DB** → `POST /api/v1/subscriptions`

### Subscription Statuses

| Status | Description | Access Allowed? |
|--------|-------------|-----------------|
| `active` | Active subscription | ✅ Yes |
| `trialing` | Trial period | ✅ Yes |
| `past_due` | Payment overdue | ⚠️ Limited |
| `canceled` | Canceled | ❌ No |
| `unpaid` | Unpaid | ❌ No |
| `paused` | Temporarily paused | ❌ No |
| `incomplete` | Incomplete | ❌ No |

### Supported Stripe Webhooks

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Sync with local DB |
| `customer.subscription.updated` | Update status |
| `customer.subscription.deleted` | Update to canceled |
| `invoice.payment_succeeded` | Record payment success |
| `invoice.payment_failed` | Record and notify |

### Test Cards

| Card Number | Description |
|-------------|-------------|
| `4242424242424242` | Successful card |
| `4000002500003155` | Requires 3D Secure |
| `4000000000000002` | Declined card |

### 🛡️ Subscription Check Mechanism

Subscription verification is enforced via a custom **Middleware**:

```typescript
// subscription.middleware.ts
export const checkSubscription = (
  applyToRoles: UserRole[] = ['user'],  // Roles that need subscription
  allowedPlans: string[],                // Allowed plans
  options: { verifyFromStripe?: boolean } = { verifyFromStripe: true }
): RequestHandler => { ... }
```

#### How Does It Work?

```
┌─────────────────────────────────────────────────────────────────┐
│                     Request to protected route                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  checkRole()    │  ← Verify role first
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     checkSubscription()      │
              │  ┌────────────────────────┐  │
              │  │ 1. Owner? → Bypass ✅   │  │
              │  │ 2. Role needs sub?     │  │
              │  │ 3. Verify from Stripe  │  │
              │  │ 4. Verify from local DB│  │
              │  └────────────────────────┘  │
              └──────────────┬───────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────┐              ┌─────────────────┐
     │   Success   │              │  403 Forbidden  │
     │    next()   │              │ SUBSCRIPTION_   │
     └─────────────┘              │ REQUIRED        │
                                  └─────────────────┘
```

#### Dual Verification

```typescript
// Verifies from Stripe first, then from local DB
// Why? Because Admin may manually cancel a subscription (Admin Override)

const [stripeSubscription] = await stripeService.getSubscription(subId);
const [localSubscription] = await SubscriptionsService.getByStripeId(subId);

// If canceled locally → Reject even if active in Stripe
if (localSubscription?.status === 'canceled' || localSubscription?.status === 'paused') {
  return false;  // Admin Override
}
```

#### Usage Example in Routes

```typescript
// Route that requires "Pro" or "Enterprise" subscription
router.get(
  '/cars',
  checkRole(['owner', 'admin', 'user']),           // 1. Check role
  checkSubscription(['user'], ['Pro', 'Enterprise']), // 2. Check subscription
  carsController.getAllCars
);
```

### 📨 Raw Body for Webhook (Very Important!)

⚠️ **Critical Warning:** You must use **Raw Body** (unprocessed) for the Webhook endpoint because Stripe signs the raw request body.

#### The Problem

```typescript
// ❌ Wrong - express.json() transforms the body
app.use(express.json());  // This breaks the signature!

// Stripe calculates the signature from:
// signature = HMAC-SHA256(raw_body, webhook_secret)
// But express.json() converts the body to an object then back to a different string
```

#### The Solution

```typescript
// ✅ Correct - Use express.raw() for webhook only

// 1. Define webhook route before express.json()
app.post(
  '/api/webhooks',
  express.raw({ type: 'application/json' }),  // ← Raw body
  webhookHandler
);

// 2. Then apply express.json() for the rest
app.use(express.json());
```

#### Signature Verification

```typescript
// In webhook handler
const sig = req.headers['stripe-signature'] as string;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

try {
  // req.body here is Buffer (raw)
  const event = stripe.webhooks.constructEvent(
    req.body,      // ← Must be raw Buffer, not parsed JSON
    sig,
    endpointSecret
  );
  
  // Process the event...
} catch (err) {
  console.error('❌ Webhook signature verification failed');
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

#### Why Is This Important?

| Without Raw Body | With Raw Body |
|------------------|---------------|
| ❌ Signature doesn't match | ✅ Signature is correct |
| ❌ 400 Webhook Error | ✅ 200 Success |
| ❌ Events not processed | ✅ Sync works |
| ❌ Potential security vulnerability | ✅ Protection from forgery |

---

## 🌐 API Interfaces

### Backend API (Port 3003)

#### Authentication (`/api/v1/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login/email` | Login |
| POST | `/google` | Login via Google |
| POST | `/refresh-token` | Refresh token |
| GET | `/validate` | Validate token |
| GET | `/me` | User data |

#### Users (`/api/v1/users`)

| Method | Path | Permissions |
|--------|------|-------------|
| GET | `/` | owner, admin (view_users) |
| GET | `/:id` | owner, admin (view_users) |
| PUT | `/:id` | owner |
| DELETE | `/:id` | owner |

#### Subscriptions (`/api/v1/subscriptions`)

| Method | Path | Permissions |
|--------|------|-------------|
| GET | `/` | owner, admin |
| GET | `/me` | authenticated |
| POST | `/me/cancel` | authenticated |
| GET | `/user/:userId` | owner, admin |
| GET | `/statistics` | owner |

#### Plans (`/api/v1/plans`)

| Method | Path | Permissions |
|--------|------|-------------|
| GET | `/config` | public |
| GET | `/prices` | public |
| GET | `/subscription-prices` | public |
| POST | `/subscriptions` | authenticated |

#### Cars (`/api/v1/cars`)

| Method | Path | Permissions |
|--------|------|-------------|
| GET | `/` | authenticated + subscription |
| GET | `/:id` | authenticated + subscription |
| POST | `/` | owner, admin (create_cars) |
| PUT | `/:id` | owner, admin (update_cars) |
| DELETE | `/:id` | owner, admin (delete_cars) |

#### Project Admins (`/api/v1/project-admins`)

| Method | Path | Permissions |
|--------|------|-------------|
| GET | `/` | owner |
| POST | `/` | owner |
| PUT | `/:id` | owner |
| DELETE | `/:id` | owner |

---

### Stripe Server API (Port 4242)

#### Customers (`/api/customers`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create customer |
| GET | `/:id` | Get customer |
| PUT | `/:id` | Update customer |
| DELETE | `/:id` | Delete customer |
| GET | `/:id/payment-methods` | Payment methods |

#### Payments (`/api/payments`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/intents` | Create Payment Intent |
| GET | `/intents/:id` | Get Payment Intent |
| POST | `/intents/:id/confirm` | Confirm payment |
| POST | `/intents/:id/cancel` | Cancel payment |

#### Subscriptions (`/api/subscriptions`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create subscription |
| GET | `/` | List subscriptions |
| GET | `/:id` | Subscription details |
| DELETE | `/:id` | Cancel subscription |
| POST | `/:id/pause` | Pause subscription |
| POST | `/:id/resume` | Resume subscription |

#### Refunds (`/api/refunds`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create refund |
| POST | `/full` | Full refund |
| POST | `/partial` | Partial refund |

---

## 🗄️ Databases

### PostgreSQL Models

#### User Model

```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique
  password_hash?: string;  // For local registration
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

#### Subscription Model

```typescript
interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  plan_name: string;
  status: SubscriptionStatus;
  billing_interval: 'day' | 'week' | 'month' | 'year';
  amount: number;
  currency: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
}
```

#### Car Model

```typescript
interface Car {
  id: string;           // UUID
  car_make: string;     // BMW, Toyota
  car_model: string;    // 325, Camry
  car_model_year: number;
  car_vin: string;      // 17 characters, unique
  created_at: Date;
  updated_at: Date;
}
```

#### ProjectAdmin Model

```typescript
interface ProjectAdmin {
  id: string;
  user_id: string;
  permissions: string[];  // List of permissions
  created_at: Date;
  updated_at: Date;
}
```

---

## 🔒 Security and Protection

### Implemented Security Features

| Feature | Description |
|---------|-------------|
| **Helmet** | HTTP Headers protection |
| **CORS** | Control of allowed Origins |
| **Rate Limiting** | Protection from DDoS and Brute Force |
| **XSS Protection** | Input sanitization from XSS code |
| **JWT Authentication** | Secure token-based authentication |
| **Password Hashing** | bcrypt encryption |
| **Secure Sessions** | Redis sessions with HttpOnly Cookies |
| **Input Validation** | Validation using Joi |
| **Webhook Signature** | Stripe signature verification |

### Rate Limiters

| Type | Limit | Usage |
|------|-------|-------|
| `authRateLimiter` | 5 requests / 15 minutes | Login |
| `generalRateLimiter` | 100 requests / 15 minutes | General requests |
| `strictRateLimiter` | 10 requests / 5 minutes | Sensitive requests |

### Environment Variables

| File | Content |
|------|---------|
| `Security.env` | JWT_SECRET, API_KEY, CORS |
| `Database.env` | PostgreSQL, Redis |
| `Stripe.env` | Stripe Keys & Secrets |
| `IntegratedAuthentication.env` | OAuth Credentials |

---

## 📄 Pages and Components

### Frontend Pages

| Page | Path | Description | Access |
|------|------|-------------|--------|
| Home | `/` | Landing page | public |
| Login | `/login` | Login form | unauthenticated |
| Register | `/register` | Registration form | unauthenticated |
| Account | `/account` | Dashboard | authenticated |
| Plans | `/plans` | Display plans | public |
| Payment | `/payment` | Payment form | authenticated |
| Payment Success | `/payment/success` | Success confirmation | authenticated |
| Users | `/users` | User management | owner, admin |
| Admins | `/admins` | Admin management | owner |
| Cars | `/cars` | Car management | authenticated + subscription |

### Context Providers

```typescript
// AuthProvider - Authentication context
interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email, password) => Promise<Result>;
  register: (data) => Promise<Result>;
  loginWithGoogle: (credential) => Promise<Result>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// GoogleAuthProvider - Google authentication
// Wraps the application with GoogleOAuthProvider
```

---

## 🚀 Running the Project

### Requirements

- Node.js >= 18
- PostgreSQL
- Redis (optional)
- Stripe account (Test Mode)
- Google Cloud account (OAuth)

### Running Backend

```bash
cd backend
npm install
npm run dev    # Development
npm run build  # Build
npm start      # Production
```

### Running Frontend

```bash
cd global-hound
npm install
npm run dev    # Development on localhost:3000
npm run build  # Production build
npm start      # Run production
```

### Access Points

| Service | URL |
|---------|-----|
| Backend API | `http://localhost:3003/api/v1` |
| Backend Health | `http://localhost:3003/health` |
| Stripe Server | `http://localhost:4242/api` |
| Frontend | `http://localhost:3000` |

---

## ✅ Implementation Summary

### Completed Requirements

| Requirement | Status |
|-------------|--------|
| User registration (Local + Google) | ✅ |
| JWT authentication (Access + Refresh) | ✅ |
| Role system (Owner > Admin > User > Guest) | ✅ |
| Paid subscription plans | ✅ |
| Stripe Checkout integration | ✅ |
| Webhooks processing | ✅ |
| Access control based on subscription | ✅ |
| Webhook signature verification | ✅ |
| Protected dashboard | ✅ |
| Search and filtering | ✅ |
| Pagination | ✅ |
| Admin dashboard | ✅ |
| Subscription status display | ✅ |
| Manual cancel/pause (Admin Override) | ✅ |
| Environment variables for secrets | ✅ |
| Password encryption | ✅ |
| Input validation | ✅ |
| Error handling | ✅ |
| Organized project structure | ✅ |

---

## 📊 Communication Diagram Between Components

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                     │
│                         localhost:3000                         │
└─────────────────────────────┬──────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Auth APIs     │  │  Data APIs      │  │  Stripe APIs    │
│  /api/v1/auth   │  │  /api/v1/users  │  │  stripe.js      │
│                 │  │  /api/v1/cars   │  │  (Direct)       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express.js)                       │
│                      localhost:3003                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Auth    │  │  Users   │  │  Stripe  │  │  Cache   │         │
│  │ Module   │  │ Service  │  │ Service  │  │  Redis   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────────────┬───────────────────┼───────────────┘
        │                     │                   │
        ▼                     ▼                   ▼
┌─────────────┐        ┌─────────────┐       ┌─────────────┐
│ PostgreSQL  │        │Stripe Server│       │   Redis     │
│  (Supabase) │        │ Port 4242   │       │   Cache     │
└─────────────┘        └──────┬──────┘       └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Stripe.com │
                       │   (API)     │
                       └─────────────┘
```

---

## 📞 Support and Contact

- **Author:** El-khodary
- **Version:** 1.0.0
- **License:** ISC

---

*Last updated: January 2026*
