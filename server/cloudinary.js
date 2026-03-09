// server/cloudinary.js
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load .env here so process.env is ready before we read it
dotenv.config();

// Read from either our prefixed names OR Cloudinary's default names
const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUD_NAME;

const apiKey =
  process.env.CLOUDINARY_API_KEY ||
  process.env.API_KEY;

const apiSecret =
  process.env.CLOUDINARY_API_SECRET ||
  process.env.API_SECRET;

console.log('Cloudinary env check:', {
  cloudName,
  apiKeyPresent: !!apiKey,
  apiSecretPresent: !!apiSecret,
});

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;