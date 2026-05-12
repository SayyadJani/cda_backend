import { Router } from 'express';
import { 
  getAllPrepResources, 
  getPrepResourceById, 
  toggleTaskProgress,
  getOverallProgress,
  createPrepResource,
  updatePrepResource,
  deletePrepResource
} from '../controllers/prepController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = Router();

// Publicly accessible but optionally picks up user context if token provided
router.get('/', getAllPrepResources);
router.get('/stats', protect, getOverallProgress);
router.get('/:id', getPrepResourceById);

// Protected routes
router.post('/toggle', protect, toggleTaskProgress);

// Admin routes
router.post('/', createPrepResource);
router.put('/:id', updatePrepResource);
router.delete('/:id', deletePrepResource);

export default router;
