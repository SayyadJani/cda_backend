import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
  max: 20, // Increased for development
  message: {
    message: 'Too many authentication attempts, please try again soon',
  },
});
//npm install helmet,npm install express-rate-limit,