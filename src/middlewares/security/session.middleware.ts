import session from 'express-session';
import { RequestHandler } from 'express';
import { RedisStore } from 'connect-redis'; // استخدام Redis لتخزين الجلسات
import { redisClient, isRedisAvailable } from '../../modules/cache/redis/index.js'; // اتصال Redis من ملف config
import { SESSION_SECRET } from '../../config/sessionCookies.config.js'; // اتصال Redis من ملف config
import { NODE_ENV } from '../../config/server.config.js'; // اتصال Redis من ملف config

// استخدام RedisStore فقط إذا كان Redis متاحاً، وإلا استخدام MemoryStore الافتراضي
const sessionStore = isRedisAvailable && redisClient 
  ? new RedisStore({ client: redisClient })
  : undefined; // express-session سيستخدم MemoryStore تلقائياً

if (!isRedisAvailable) {
  console.log('⚠️ Session: Using in-memory store (not recommended for production)');
}

const sessionMiddleware: RequestHandler = session({
  store: sessionStore,
  secret: SESSION_SECRET || 'supersecretkey', // المفتاح السري للجلسات
  resave: false, // منع إعادة حفظ الجلسة لو مفيش تغييرات
  saveUninitialized: false, // منع إنشاء جلسات جديدة غير ضرورية
  cookie: {
    secure: NODE_ENV === 'production', // الجلسات تكون آمنة فقط في الإنتاج
    httpOnly: true, // حماية الكوكيز من الـ JavaScript
    maxAge: 1000 * 60 * 60 * 24, // مدة الجلسة: يوم كامل
  },
});

export default sessionMiddleware;
