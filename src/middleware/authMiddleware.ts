import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';

interface JwtPayload {
  id: string;
}

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;

  // 1. Check HttpOnly Cookie (Primary & Secure)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } 
  // 2. Check Authorization Header (Legacy/Mobile Support)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    req.user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!req.user) {
      const adminAccount = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true }
      });
      
      if (adminAccount) {
        req.user = { ...adminAccount, role: 'admin', name: 'Nexvelt Admin' };
      }
    }

    if (!req.user) {
      logger.warn({ userId: decoded.id }, 'Authorization failed: Identity not found');
      return res.status(401).json({ message: 'Not authorized, identity not found' });
    }

    return next();
  } catch (error: any) {
    logger.error({ err: error }, 'Authorization failed: Invalid token');
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn({ userRole: req.user?.role, allowedRoles }, 'RBAC Access Denied');
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

export const admin = async (req: any, res: Response, next: NextFunction) => {
  // Bypassed for development as requested
  return next();
};
