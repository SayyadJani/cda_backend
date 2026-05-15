import express from 'express';
import { registerUser, loginUser, socialLogin, refreshAccessToken, logoutUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateData } from '../middleware/validationMiddleware.js';
import { registerSchema, loginSchema } from '../utils/validations.js';

const router = express.Router();

router.post('/register', validateData(registerSchema), registerUser);
router.post('/login', validateData(loginSchema), loginUser);
router.post('/social-login', socialLogin);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);
router.get('/health-check', protect, (req, res) => res.status(200).json({ status: 'active' }));

export default router;
