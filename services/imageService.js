import sharp from 'sharp';
import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

// Validate URL format
const isValidHttpUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

export const processImage = async (url, requestId) => {
  try {
    // Validate URL structure
    if (!isValidHttpUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Download image with proper headers
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProcessor/1.0)',
        'Accept': 'image/*'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    // Verify content type
    const contentType = response.headers['content-type'];
    if (!contentType?.startsWith('image/')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Process image
    const processedImage = await sharp(response.data)
      .jpeg({
        quality: 50,
        mozjpeg: true
      })
      .toBuffer();

    // Upload to GCP
    const fileName = `processed/${requestId}/${uuidv4()}.jpg`;
    const file = bucket.file(fileName);
    
    await file.save(processedImage, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000'
      }
    });

    await file.makePublic();
    return file.publicUrl();

  } catch (error) {
    console.error(`Image processing failed for ${url}:`, error.message);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};