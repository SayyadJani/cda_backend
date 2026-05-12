import { Router } from 'express';
import { adminLogin, getAdminStats, updateAdminSettings, getAllClients, getClientById } from '../controllers/adminController.js';
import { getAllATSRequests, generateATSReport } from '../controllers/atsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = Router();

// Public
router.post('/login', adminLogin);

// Protected (Role check removed as requested)
router.get('/stats', protect, getAdminStats);
router.patch('/settings', protect, updateAdminSettings);
router.get('/clients', protect, getAllClients);
router.get('/clients/:id', protect, getClientById);

// ATS Requests
router.get('/ats/requests', protect, getAllATSRequests);
router.post('/ats/requests/:id/generate', protect, generateATSReport);

export default router;
