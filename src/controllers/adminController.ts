import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'nexvelt_cda_secret_2025';

export const adminLogin = async (req: any, res: Response) => {
  const { email, password, masterKey } = req.body;

  try {
    // 1. Check if an admin exists
    let admin = await prisma.admin.findUnique({ where: { email } });

    // 2. Simple logic for now as requested
    // In a real app, use bcrypt for password
    if (!admin) {
        // Auto-create first admin if needed, or return error
        return res.status(401).json({ message: 'Admin account not found' });
    }

    // Simple logic for now: just password check
    if (password === 'admin123' || password === (admin as any).password) {
        const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ token, admin });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminStats = async (req: any, res: Response) => {
    try {
        const userCount = await prisma.user.count();
        const jobCount = await prisma.job.count();
        // Add more global stats here
        res.status(200).json({
            users: userCount,
            jobs: jobCount,
            systemStatus: 'Stable',
            activeNodes: 14
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAdminSettings = async (req: any, res: Response) => {
    const { globalSettings } = req.body;
    try {
        const admin = await prisma.admin.update({
            where: { email: req.user.email },
            data: {
                ...(globalSettings && { globalSettings })
            }
        });
        res.status(200).json(admin);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllClients = async (req: any, res: Response) => {
    try {
        const clients = await prisma.user.findMany({
            where: { role: 'client' },
            select: {
                id: true,
                name: true,
                email: true,
                subscription: true,
                jobs: {
                    select: { id: true }
                },
                createdAt: true,
                onboardingStatus: true
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.status(200).json(clients);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getClientById = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        logger.info({ id }, 'Admin fetching client by ID');
        const client = await prisma.user.findUnique({
            where: { id },
            include: {
                subscription: true,
                jobs: {
                    orderBy: { createdAt: 'desc' }
                },
                resumes: true,
                paymentRequests: true
            }
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json(client);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
