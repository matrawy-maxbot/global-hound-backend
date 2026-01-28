import cors, { CorsOptions } from 'cors';
import { NODE_ENV } from '../../config/server.config.js';
import { 
    CORS_ORIGIN, 
    CORS_METHODS, 
    CORS_HEADERS,
    CORS_EXPOSED_HEADERS,
    CORS_CREDENTIALS,
    CORS_MAX_AGE,
    CORS_OPTIONS_SUCCESS_STATUS
} from '../../config/security.config.js';

// إحصائيات CORS
interface CorsStats {
    allowed: number;
    blocked: number;
    noOrigin: number;
}

const corsStats: CorsStats = {
    allowed: 0,
    blocked: 0,
    noOrigin: 0
};

type CorsCallback = (err: Error | null, allow?: boolean) => void;

// دالة للتحقق من الـ Origin
const originValidator = (origin: string | undefined, callback: CorsCallback): void => {
    // الطلبات بدون origin (مثل Postman, curl)
    if (!origin) {
        corsStats.noOrigin++;
        
        if (NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // في الإنتاج، يمكنك السماح أو المنع حسب حالتك
        return callback(null, true); // أو false لمنعها
    }

    // التحقق من الـ Origin
    if (process.env.CORS_ORIGIN.includes(origin) || process.env.CORS_ORIGIN.includes('*')) {
        corsStats.allowed++;
        callback(null, true);
    } else {
        corsStats.blocked++;
        
        console.warn('🚫 CORS Policy Violation:', {
            blocked_origin: origin,
            allowed_origins: process.env.CORS_ORIGIN,
            timestamp: new Date().toISOString(),
            environment: NODE_ENV
        });
        
        callback(new Error(`CORS policy: Origin '${origin}' is not allowed`));
    }
};

// إعدادات CORS
const corsOptions: CorsOptions = {
    origin: originValidator,
    methods: CORS_METHODS.split(','),
    allowedHeaders: CORS_HEADERS.split(','),
    exposedHeaders: CORS_EXPOSED_HEADERS.split(','),
    credentials: CORS_CREDENTIALS,
    maxAge: parseInt(CORS_MAX_AGE),
    optionsSuccessStatus: parseInt(CORS_OPTIONS_SUCCESS_STATUS),
    preflightContinue: false,
};

const corsMiddleware = cors(corsOptions);

// تصدير الإحصائيات
export const getCorsStats = (): CorsStats => ({ ...corsStats });

export const resetCorsStats = (): void => {
    corsStats.allowed = 0;
    corsStats.blocked = 0;
    corsStats.noOrigin = 0;
};

export default corsMiddleware;
