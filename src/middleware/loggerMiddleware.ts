import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url } = req;

  // Intercept response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Log complete request lifecycle
    if (statusCode >= 400) {
      logger.warn({ method, url, statusCode, durationMs: duration }, 'API Request Failed');
    } else {
      logger.info({ method, url, statusCode, durationMs: duration }, 'API Request Completed');
    }
  });

  next();
};
