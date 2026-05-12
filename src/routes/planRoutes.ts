import express from 'express';
import { getPlans, initiateCheckout } from '../controllers/planController.js';
import { validateData } from '../middleware/validationMiddleware.js';
import { checkoutSchema } from '../utils/validations.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This router handles both /api/plans and /api/subscriptions
router.get('/', getPlans);
router.post('/checkout', protect, validateData(checkoutSchema), initiateCheckout);

export default router;
