import { Router } from 'express';
import { 
  createPaymentRequest,
  verifyPaymentOTP,
  uploadPaymentProof,
  getMyPaymentRequests,
  getAllPaymentRequests,
  getAllPaymentLogs,
  approvePaymentRequest,
  updatePaymentRequestStatus,
  createOrder,
  verifyPayment,
  razorpayWebhook
} from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = Router();

// --- USER ROUTES (Manual) ---
router.post('/request', protect, createPaymentRequest);
router.post('/verify-otp', protect, verifyPaymentOTP);
router.post('/upload-proof', protect, uploadPaymentProof);
router.get('/my-requests', protect, getMyPaymentRequests);

// --- USER ROUTES (Razorpay) ---
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);

// --- WEBHOOKS ---
router.post('/webhook', razorpayWebhook);

// --- ADMIN ROUTES ---
router.get('/requests', protect, admin, getAllPaymentRequests);
router.get('/logs', protect, admin, getAllPaymentLogs);
router.patch('/requests/:requestId/status', protect, admin, updatePaymentRequestStatus);
router.patch('/requests/:requestId/approve', protect, admin, approvePaymentRequest);

export default router;
