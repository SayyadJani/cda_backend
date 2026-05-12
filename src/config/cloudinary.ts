import "dotenv/config";
import { v2 as cloudinary } from 'cloudinary';

// Verify required environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('[CloudinaryConfig] CRITICAL: Missing Cloudinary environment variables!');
} else {
  console.log(`[CloudinaryConfig] Initializing for cloud: ${cloudName}`);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
