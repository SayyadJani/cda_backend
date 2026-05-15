import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

// ── Token Configuration ──
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Generate Access Token (Short-lived)
 */
const generateAccessToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * Generate Refresh Token (Long-lived & Stored in DB)
 */
const generateRefreshToken = async (userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret_key', {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  // Store in DB
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

/**
 * Cookie Configuration for Production
 */
const isProduction = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: '/',
};

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 15 * 60 * 1000, // 15 mins
  path: '/',
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        notificationPrefs: { create: {} },
        subscription: { create: {} }
      },
    });
    
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set Tokens as HttpOnly Cookies
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    sendWelcomeEmail(user.email, user.name || 'User').catch(err => console.error("Email error:", err));

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // REMOVED accessToken from body
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 */
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password || ''))) {
      const accessToken = generateAccessToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);

      // Set Tokens as HttpOnly Cookies
      res.cookie('accessToken', accessToken, accessCookieOptions);
      res.cookie('refreshToken', refreshToken, refreshCookieOptions);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingStatus: user.onboardingStatus,
        // REMOVED accessToken from body
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    // 1. Verify Token
    const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret_key');
    
    // 2. Check DB (Ensure not revoked)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return res.status(403).json({ message: 'Refresh token invalid or expired' });
    }

    // 3. Optional: Token Rotation (Invalidate old, issue new)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const newRefreshToken = await generateRefreshToken(storedToken.userId);
    const newAccessToken = generateAccessToken(storedToken.userId);

    res.cookie('accessToken', newAccessToken, accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    res.status(403).json({ message: 'Authentication failed' });
  }
};

/**
 * @desc    Logout & Invalidate Session
 * @route   POST /api/auth/logout
 */
export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    // Invalidate in DB
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    }).catch(() => {});
  }

  res.clearCookie('accessToken', { ...accessCookieOptions, maxAge: 0 });
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: 0 });
  res.status(200).json({ message: 'Logged out successfully' });
};

/**
 * @desc    Auth/Register user via social login
 * @route   POST /api/auth/social-login
 */
export const socialLogin = async (req: Request, res: Response) => {
  const { email, name, image } = req.body;

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          image: image,
          onboardingStatus: 'pending',
          notificationPrefs: { create: {} },
          subscription: { create: {} }
        },
      });
      sendWelcomeEmail(user.email, user.name || 'User').catch(() => {});
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
