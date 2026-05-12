import express from 'express';
import { 
  getMyProfile, updateProfile, updateNotificationPrefs, 
  changePassword, sendPasswordOTP, resetPasswordWithOTP 
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.patch('/profile', protect, updateProfile);
router.patch('/settings/notifications', protect, updateNotificationPrefs);
router.patch('/settings/security/password', protect, changePassword);
router.post('/settings/security/forgot-password/send-otp', protect, sendPasswordOTP);
router.post('/settings/security/forgot-password/reset', protect, resetPasswordWithOTP);

export default router;
