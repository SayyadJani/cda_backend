import express from 'express';
import { requestATS, getMyATSRequests } from '../controllers/atsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request', protect, requestATS);
router.get('/my-requests', protect, getMyATSRequests);

export default router;
