import sharp from 'sharp';
import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// Initialize GCP Storage with validation
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure GCP Storage with validation
const configureGCP = () => {
  try {
    // Verify credentials path
    const keyPath = path.resolve(__dirname, "../config/gcp-key.json");


    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename:  keyPath
    });

    const bucketName = process.env.GCP_BUCKET_NAME;
    if (!bucketName) throw new Error('GCP_BUCKET_NAME environment variable not set');

    const bucket = storage.bucket(bucketName);

    // Add connection test
    const verifyConnection = async () => {
      try {
        const [exists] = await bucket.exists();
        if (!exists) throw new Error(`Bucket ${bucketName} not found`);
        console.log(`✅ Connected to GCS bucket: ${bucketName}`);
        return true;
      } catch (error) {
        console.error('❌ GCP Connection Error:', error.message);
        console.log('Troubleshooting Steps:');
        console.log('1. Verify GCP_PROJECT_ID matches credentials');
        console.log('2. Check bucket exists: gsutil ls -b gs://' + bucketName);
        console.log('3. Validate credentials file permissions');
        process.exit(1);
      }
    };

    return { storage, bucket, verifyConnection };

  } catch (error) {
    console.error('❌ GCP Configuration Error:', error.message);
    process.exit(1);
  }
};

const { bucket, verifyConnection } = configureGCP();
await verifyConnection();

export const processImage = async (url, requestId) => {

  try {
    console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log("GCP_BUCKET_NAME:", process.env.GCP_BUCKET_NAME);

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

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  } catch (error) {
    console.error(`Image processing failed for ${url}:`, error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};
