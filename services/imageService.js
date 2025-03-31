import sharp from 'sharp';
import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();



// Initialize GCP Storage with validation
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Verify bucket exists
const bucketName = process.env.GCP_BUCKET_NAME;
if (!bucketName) throw new Error('GCP_BUCKET_NAME environment variable not set');

const bucket = storage.bucket(bucketName);

// Add bucket existence check
const verifyBucket = async () => {
  try {
    const [exists] = await bucket.exists();
    if (!exists) throw new Error(`Bucket ${bucketName} does not exist`);
    console.log(`✅ Using GCS bucket: ${bucketName}`);
  } catch (error) {
    console.error('❌ GCP Bucket verification failed:', error);
    process.exit(1);
  }
};

verifyBucket();

export const processImage = async (url, requestId) => {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // Download image
    const response = await axios.get(url.toString(), {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'ImageProcessor/1.0' },
      timeout: 15000
    });

    // Process image
    const processedBuffer = await sharp(response.data)
      .jpeg({ quality: 50, mozjpeg: true })
      .toBuffer();

    // Generate filename: YYYYMMDD/requestID/uuid.jpg
    const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `${datePrefix}/${requestId}/${uuidv4()}.jpg`;

    // Upload to GCS
    const file = bucket.file(fileName);
    
    await file.save(processedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000'
      }
    });

    await file.makePublic();
    
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;

  } catch (error) {
    console.error(`Image processing failed for ${url}:`, error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};