import express from 'express';
import { getResumes, saveResume, updateResume, deleteResume, getAtsReport, parseResume, uploadMiddleware } from '../controllers/resumeController.js';
import { protect } from '../middleware/authMiddleware.js';

import { validateData } from '../middleware/validationMiddleware.js';
import { resumeSchema } from '../utils/validations.js';

const router = express.Router();

// CRUD
router.get('/',        protect, getResumes);
router.post('/',       protect, validateData(resumeSchema), saveResume);
router.put('/:id',     protect, validateData(resumeSchema), updateResume);
router.delete('/:id',  protect, deleteResume);
router.get('/:id/ats-report', protect, getAtsReport);
router.post('/parse', protect, uploadMiddleware, parseResume);

export default router;
