import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

import { sendWelcomeEmail } from '../utils/emailService.js';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // Input Validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        notificationPrefs: {
          create: {} // Create default notification prefs
        },
        subscription: {
          create: {} // Create default starter subscription
        }
      },
      include: {
        subscription: true,
        notificationPrefs: true
      }
    });
    
    // Send welcome email asynchronously
    sendWelcomeEmail(user.email, user.name || 'User').catch(err => console.error("Failed to send welcome email", err));

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        subscription: true,
        notificationPrefs: true
      }
    });

    if (user && (await bcrypt.compare(password, user.password || ''))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingStatus: user.onboardingStatus,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Auth/Register user via social login (OAuth)
 * @route   POST /api/auth/social-login
 * @access  Public
 */
export const socialLogin = async (req: Request, res: Response) => {
  const { email, name, image } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for social login' });
  }

  try {
    let user: any = await prisma.user.findUnique({ 
      where: { email },
      include: {
        subscription: true,
        notificationPrefs: true
      }
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Create new user if they don't exist
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          image: image,
          onboardingStatus: 'pending',
          notificationPrefs: { create: {} },
          subscription: { create: {} }
        },
        include: {
          subscription: true,
          notificationPrefs: true
        }
      });
      
      // Send welcome email asynchronously for social login registration
      sendWelcomeEmail(user.email, user.name || 'User').catch(err => console.error("Failed to send welcome email via social login", err));
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
      token: generateToken(user.id),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
