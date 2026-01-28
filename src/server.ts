import './config/index.js'; // تحميل ملفات البيئة أولاً
import app from './app.js';
import { SERVER_HOST, SERVER_PORT, NODE_ENV } from './config/server.config.js';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { Socket } from 'net';

// إنشاء HTTP server
const server: Server<typeof IncomingMessage, typeof ServerResponse> = createServer(app);

// متغيرات للتحكم في إيقاف الخادم بشكل آمن
let isShuttingDown = false;
const connections: Set<Socket> = new Set();

// تتبع الاتصالات النشطة
server.on('connection', (connection: Socket): void => {
    connections.add(connection);
    
    connection.on('close', (): void => {
        connections.delete(connection);
    });
});

// دالة لإيقاف الخادم بشكل آمن
const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
    
    if (isShuttingDown) {
        console.log('⚠️  Shutdown already in progress...');
        return;
    }
    
    isShuttingDown = true;
    
    // إغلاق قاعدة البيانات أولاً
    try {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database:', error);
    }
    
    // إيقاف قبول اتصالات جديدة
    server.close((err?: Error): void => {
        if (err) {
            console.error('❌ Error during server shutdown:', err);
            // eslint-disable-next-line no-process-exit
            process.exit(1);
        }
        
        console.log('✅ HTTP server closed successfully');
        
        // إغلاق جميع الاتصالات النشطة
        for (const connection of connections) {
            connection.destroy();
        }
        
        console.log('✅ All connections closed');
        console.log('👋 Graceful shutdown completed');
        // eslint-disable-next-line no-process-exit
        process.exit(0);
    });
    
    // إجبار الإغلاق بعد 30 ثانية
    setTimeout((): void => {
        console.error('⚠️  Forced shutdown after 30 seconds');
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }, 30000);
};

// معالجة إشارات النظام للإيقاف الآمن
process.on('SIGTERM', (): void => {
    gracefulShutdown('SIGTERM');
});

process.on('SIGINT', (): void => {
    gracefulShutdown('SIGINT');
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error: Error): void => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>): void => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// تعريف نوع لأخطاء الخادم
interface ServerError extends Error {
    code?: string;
}

// دالة لبدء تشغيل الخادم
const startServer = async (): Promise<void> => {
    try {
        // بدء تشغيل الخادم
        server.listen(SERVER_PORT, SERVER_HOST, (): void => {
            console.log('🚀 ================================');
            console.log(`🌟 Server is running successfully!`);
            console.log(`📍 Environment: ${NODE_ENV}`);
            console.log(`🌐 Host: ${SERVER_HOST}`);
            console.log(`🔌 Port: ${SERVER_PORT}`);
            console.log(`🔗 URL: http://${SERVER_HOST}:${SERVER_PORT}`);
            console.log(`💚 Health Check: http://${SERVER_HOST}:${SERVER_PORT}/health`);
            console.log('🚀 ================================');
            
            // في بيئة التطوير، عرض معلومات إضافية
            if (NODE_ENV === 'development') {
                console.log('🔧 Development Mode Features:');
                console.log('   📝 Request logging enabled');
                console.log('   🐛 Detailed error messages');
                console.log('   ⚡ Hot reload ready');
                console.log('🚀 ================================');
            }
        });
        
        // معالجة أخطاء الخادم
        server.on('error', (error: ServerError): void => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${SERVER_PORT} is already in use`);
                console.log('💡 Try using a different port or stop the process using this port');
            } else if (error.code === 'EACCES') {
                console.error(`❌ Permission denied to bind to port ${SERVER_PORT}`);
                console.log('💡 Try using a port number greater than 1024 or run with elevated privileges');
            } else {
                console.error('❌ Server error:', error);
            }
            // eslint-disable-next-line no-process-exit
            process.exit(1);
        });
        
    } catch (error) {
        console.error('💥 Failed to start server:', error);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
};

// بدء تشغيل الخادم
startServer();

// تصدير الخادم للاستخدام في الاختبارات
export default server;
