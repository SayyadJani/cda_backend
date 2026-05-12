import pino from 'pino';

/**
 * ENTERPRISE LOGGER
 * Uses Pino for high-performance structured JSON logging in production,
 * and pino-pretty for readable console output during development.
 */
const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
