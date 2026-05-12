import express from 'express';
import { registerUser, loginUser, socialLogin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateData } from '../middleware/validationMiddleware.js';
import { registerSchema, loginSchema } from '../utils/validations.js';

const router = express.Router();

router.post('/register', validateData(registerSchema), registerUser);
router.post('/login', validateData(loginSchema), loginUser);
router.post('/social-login', socialLogin);

export default router;
