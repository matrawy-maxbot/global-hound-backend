import express, { Express, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import timeout from 'connect-timeout';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

import './config/index.js';
import { NODE_ENV } from './config/server.config.js';
// import { connectDB } from './modules/database/mongoDB';

// import './modules/database/mongoDB/models'; // استيراد النماذج لتعريفها في Mongoose

// استيراد middlewares الأمان
import corsMiddleware from './middlewares/security/cors.middleware.js';
import { getCorsStats, resetCorsStats } from './middlewares/security/cors.middleware.js';

import helmetMiddleware from './middlewares/security/helmet.middleware.js';
import xssProtectionMiddleware from './middlewares/security/xssClean.middleware.js';
import sessionMiddleware from './middlewares/security/session.middleware.js';
// import { generalRateLimiter } from './middlewares/security/rateLimiter.middleware';

// استيراد middlewares التسجيل
import requestLogger from './middlewares/logging/requestLogger.middleware.js';
import responseTimeMiddleware from './middlewares/logging/responseTime.middleware.js';

// استيراد middlewares معالجة الأخطاء
import errorHandlerMiddleware from './middlewares/errors/errorHandler.middleware.js';
import notFoundMiddleware from './middlewares/errors/notFound.middleware.js';

import passport from './modules/auth/index.js';
import { authenticateJwt } from './modules/auth/middlewares/auth.middleware.js';

// استيراد routes
import authRoutes from './modules/auth/routes/auth.route.js';
import { routes } from './modules/api/v1/restful/routes/index.js';
// import uploadRoutes from './modules/files/routes/upload.routes.js';

// import { UPLOAD_DIR } from './config/fileStorage.config.js';

import initializeCronJobs from './modules/cron_jobs/index.js';

// تعريف نوع Request مخصص لإضافة الخصائص الإضافية
interface CustomRequest extends Request {
    id?: string;
}

// إنشاء تطبيق Express
const app: Express = express();

// ===== DATABASE CONNECTION =====
// await connectDB();

// ===== SECURITY MIDDLEWARES =====
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(xssProtectionMiddleware);
// app.use(generalRateLimiter);

// ===== REQUEST ENHANCEMENT =====
// إضافة Request ID لكل طلب
app.use((req: CustomRequest, res: Response, next: NextFunction): void => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Timeout للطلبات
// app.use(timeout('30s'));
// app.use((req: CustomRequest, res: Response, next: NextFunction): void => {
//     if (!req.timedout) next();
// });

// ===== LOGGING MIDDLEWARES =====
if (NODE_ENV === 'development') {
    app.use(requestLogger);
}

app.use(responseTimeMiddleware);

// ===== BODY PARSING & COMPRESSION =====
app.use(compression());
app.use(cookieParser());

// تطبيق body parsers على كل الـ routes ماعدا upload routes
app.use((req: Request, res: Response, next: NextFunction): void => {
    // استثناء upload routes من JSON parsing
    if (req.path.startsWith('/api/v1/upload') && !req.path.includes('delete')) {
        return next();
    }
    
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, (err?: Error | null) => {
        if (err) return next(err);
        express.json({ limit: '10mb' })(req, res, next);
    });
});

// ===== PASSPORT INITIALIZATION =====
app.use(passport.initialize());

// ===== SESSION MIDDLEWARE =====
app.use(sessionMiddleware);

// ===== STATIC FILES =====
// app.use('/public', express.static('public'));

// ===== ROOT ENDPOINT =====
app.get('/', (req: Request, res: Response): void => {
    res.status(200).json({
        message: 'Welcome to the API',
        version: 'v1',
        documentation: '/api/v1/docs',
        health: '/health'
    });
});

// ===== HEALTH CHECK ENDPOINT =====
app.get('/health', async (req: Request, res: Response): Promise<void> => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        database: dbStatus,
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
    });
});

// ===== API ROUTES =====
const API_VERSION = '/api/v1';

// ===== AUTHENTICATION ROUTES =====
app.use(`${API_VERSION}/auth`, authRoutes);

// ===== UPLOAD ROUTES =====
// app.use(`${API_VERSION}/upload`, authenticateJwt, uploadRoutes);

// إضافة باقي المسارات مع JWT middleware
routes.forEach(({ path, middleware, router }) => {
    app.use(
        `${API_VERSION}${path}`,
        authenticateJwt,
        middleware ? middleware : (req: Request, res: Response, next: NextFunction) => next(),
        router
    );
});

if (NODE_ENV === 'development') {
    app.get('/cors-stats', (req: Request, res: Response): void => {
        res.json({
            success: true,
            data: getCorsStats()
        });
    });

    app.post('/cors-stats/reset', (req: Request, res: Response): void => {
        resetCorsStats();
        res.json({
            success: true,
            message: 'CORS statistics reset successfully'
        });
    });
}

// ===== INITIALIZE CRON JOBS =====
initializeCronJobs();

// ===== ERROR HANDLING MIDDLEWARES =====
app.use(notFoundMiddleware);

// بعد cors middleware في app.ts
app.use((err: Error & { message?: string }, req: Request, res: Response, next: NextFunction): void => {
    if (err && err.message && err.message.includes('CORS')) {
        console.error('🚫 CORS Error:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(403).json({
            success: false,
            message: 'CORS policy violation',
            error: NODE_ENV === 'development' 
                ? err.message 
                : 'This origin is not allowed to access this resource'
        });
        return;
    }
    next(err);
});

app.use(errorHandlerMiddleware);

export default app;
