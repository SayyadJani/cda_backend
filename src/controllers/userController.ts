import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { sendOTP } from '../utils/emailService.js';
import crypto from 'crypto';

/**
 * @desc    Get current user profile
 * @route   GET /api/user/me
 * @access  Private
 */
export const getMyProfile = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true,
        notificationPrefs: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't return password
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update user profile (Onboarding/General)
 * @route   PATCH /api/user/profile
 * @access  Private
 */
export const updateProfile = async (req: any, res: Response) => {
  try {
    const { 
      name, bio, phone, countryName, countryCode, dialCode, 
      location, targetRole, domain, experienceLevel, 
      workType, expectedSalary, onboardingStatus,
      openToRelocation, noticePeriod, visaSponsorship, industries,
      linkedinUrl, githubUrl, portfolioUrl
    } = req.body;

    console.log(`[updateProfile] Updating user ${req.user.id}:`, { 
      openToRelocation, noticePeriod, visaSponsorship, industries 
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name, bio, phone, countryName, countryCode, dialCode,
        location, targetRole, domain, experienceLevel,
        workType, expectedSalary, onboardingStatus,
        openToRelocation, noticePeriod, visaSponsorship, 
        industries: Array.isArray(industries) ? industries.filter(i => i.trim() !== "") : [],
        linkedinUrl, githubUrl, portfolioUrl
      },
      include: {
        subscription: true,
        notificationPrefs: true
      }
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error: any) {
    console.error(`[updateProfile] Error updating user ${req.user.id}:`, error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PATCH /api/user/settings/notifications
 * @access  Private
 */
export const updateNotificationPrefs = async (req: any, res: Response) => {
  try {
    const { emailAlerts, pushNotifications, weeklyReports, interviewReminders } = req.body;

    const updatedPrefs = await prisma.notificationPrefs.update({
      where: { userId: req.user.id },
      data: { emailAlerts, pushNotifications, weeklyReports, interviewReminders }
    });

    res.status(200).json(updatedPrefs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Change user password
 * @route   PATCH /api/user/settings/security/password
 * @access  Private
 */
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only verify current password if one exists (social login users might not have one)
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect current password' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Send OTP for password reset (authenticated)
 * @route   POST /api/user/settings/security/forgot-password/send-otp
 * @access  Private
 */
export const sendPasswordOTP = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.email) {
      return res.status(404).json({ message: 'User or email not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: req.user.id },
      data: { otp, otpExpires }
    });

    const emailSent = await sendOTP(user.email, otp);
    
    if (emailSent) {
      res.status(200).json({ message: 'Verification code sent to your email' });
    } else {
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Reset password using OTP (authenticated)
 * @route   POST /api/user/settings/security/forgot-password/reset
 * @access  Private
 */
export const resetPasswordWithOTP = async (req: any, res: Response) => {
  try {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Invalid OTP or password' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (!user || user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      return res.status(401).json({ message: 'Invalid or expired verification code' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        password: hashedPassword,
        otp: null,
        otpExpires: null
      }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
