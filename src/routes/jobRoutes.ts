import express from 'express';
import { 
  getJobs,
  getJobById,
  updateJobStatus,
  getJobStats,
  getHeatmapData,
  createJob,
  deleteJob,
  bulkCreateJobs
} from '../controllers/jobController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateData } from '../middleware/validationMiddleware.js';
import { jobSchema, bulkJobSchema } from '../utils/validations.js';

const router = express.Router();

router.get('/', protect, getJobs);
router.get('/stats', protect, getJobStats);
router.get('/heatmap', protect, getHeatmapData);
router.get('/:id', protect, getJobById);
router.patch('/:id/status', protect, updateJobStatus);

// Admin routes
router.post('/admin', validateData(jobSchema), createJob);
router.post('/admin/bulk', validateData(bulkJobSchema), bulkCreateJobs);
router.delete('/admin/:id', deleteJob);

export default router;
