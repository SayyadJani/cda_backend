import express from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Use memory storage for direct Cloudinary upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', protect, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(`[UploadRoute] Starting Cloudinary upload for: ${req.file.originalname}`);

    // Convert buffer to base64
    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload directly to Cloudinary
    const result = await cloudinary.uploader.upload(fileBase64, {
      folder: 'nexvelt_cda',
      resource_type: 'auto',
    });

    console.log('[UploadRoute] Cloudinary upload success:', result.secure_url);

    res.status(200).json({ 
      url: result.secure_url, 
      publicId: result.public_id 
    });
  } catch (error: any) {
    console.error('[UploadRoute] Cloudinary Error:', error);
    res.status(500).json({ 
      message: 'Cloudinary upload failed', 
      error: error.message 
    });
  }
});

export default router;
