import helmet from 'helmet';

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"], // السماح فقط بالمصادر من نفس الخادم
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // استخدم فقط لو محتاجه لبيئة التطوير
        // "https://trustedscripts.example.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // استخدم لو محتاج CSS inline
        // "https://trustedstyles.example.com",
      ],
      imgSrc: ["'self'", "data:"/*, "https://trustedimages.example.com"*/], // الصور
      connectSrc: ["'self'"/*, "https://api.example.com"*/], // API
      fontSrc: ["'self'"/*, "https://fonts.gstatic.com"*/], // الخطوط
      objectSrc: ["'none'"], // منع objects بالكامل
      frameSrc: ["'none'"], // منع iframe بالكامل
      upgradeInsecureRequests: [], // ترقية كل الروابط من HTTP لـ HTTPS
    },
  },
  crossOriginEmbedderPolicy: true, // سياسة المصادر المدمجة عبر الأصل
  crossOriginResourcePolicy: { policy: 'same-origin' }, // سياسة المصادر عبر الأصل
  hsts: {
    maxAge: 31536000, // إجبار HTTPS لمدة سنة (ثواني)
    includeSubDomains: true, // تطبيقه على كل الـ subdomains
    preload: true, // لدعم الـ HSTS preload
  },
  frameguard: {
    action: 'deny', // منع تحميل الصفحة في iframe
  },
  dnsPrefetchControl: {
    allow: false, // منع المتصفح من DNS prefetching
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin', // سياسة المرجع Referrer Policy
  },
  xssFilter: false, // حماية XSS (قديم ولكنه مفيد)
  noSniff: true, // منع Guessing Type للملفات
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none', // منع استخدام crossdomain.xml
  },
  hidePoweredBy: true, // إخفاء هيدر Express
});

export default helmetMiddleware;
