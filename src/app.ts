import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRouter from './routes/userRoutes.js';
import authRouter from './routes/authRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import jobRouter from './routes/jobRoutes.js';
import resumeRouter from './routes/resumeRoutes.js';
import planRouter from './routes/planRoutes.js';
import prepRouter from './routes/prepRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import atsRouter from './routes/atsRoutes.js';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/loggerMiddleware.js';
import { logger } from './utils/logger.js';
import cookieParser from 'cookie-parser';
import { authLimiter } from './middleware/rateLimiter.js';

const app: Application = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cookieParser());
const allowedOrigins: string[] = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'https://cda-frontend9.vercel.app',
      'https://cda-admin-dashboard.vercel.app', // Anticipating admin URL
    ].filter((origin): origin is string => !!origin)
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Nexvelt-Request']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);
app.use('/public', express.static('public'));

// Rate Limiting
app.use('/api', apiLimiter);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Nexvelt CDA Backend API',
    status: 'Server is running 🚀',
    docs: '/api/docs (if implemented)'
  });
});


// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// Favicon handler to prevent 404 logs
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', userRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/plans', planRouter);
app.use('/api/subscriptions', planRouter);
app.use('/api/prep', prepRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/utils/upload', uploadRouter);
app.use('/api/ats', atsRouter);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error({ err, url: req.originalUrl, method: req.method }, `Unhandled Exception: ${err.message}`);
  } else {
    logger.warn({ url: req.originalUrl, method: req.method, statusCode }, `API Error: ${err.message}`);
  }

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

export default app;
