import { createLogger, format, transports, Logger } from 'winston';

/**
 * واجهة معلومات السجل
 */

const logger: Logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json(),
        format.printf((info) => {
            const { timestamp, level, message } = info;
            // Ensure message is a string
            const msg = typeof message === 'string' ? message : JSON.stringify(message);
            return `[${timestamp}] [${level.toUpperCase()}]: ${msg}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
    ],
});

export default logger;
