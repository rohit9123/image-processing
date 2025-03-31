import { Worker } from 'bullmq';
import connectDB from '../config/db.js';
import ProcessingRequest from '../models/ProcessingRequest.js';
import { redisConnection } from '../config/queue.js';
import { processImage } from '../services/imageService.js';

// Initialize database connection
await connectDB();

const worker = new Worker('image-processing', async (job) => {
  const { requestId } = job.data;
  
  try {
    const request = await ProcessingRequest.findById(requestId)
      .maxTimeMS(30000)
      .lean();

    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    // Process each product
    for (const product of request.products) {
      try {
        product.outputUrls = [];
        let successCount = 0;

        // Process each image
        for (const [index, url] of product.inputUrls.entries()) {
          try {
            const outputUrl = await processImage(url, requestId);
            product.outputUrls[index] = outputUrl;
            successCount++;
          } catch (error) {
            console.error(`Failed to process image ${index} for product ${product.serialNumber}`);
            product.outputUrls[index] = null;
          }
        }

        // Update product status
        product.status = successCount === product.inputUrls.length 
          ? 'PROCESSED'
          : successCount > 0 
            ? 'PARTIALLY_PROCESSED' 
            : 'FAILED';

      } catch (error) {
        product.status = 'FAILED';
      }
    }

    // Save updates
    await ProcessingRequest.updateOne(
      { _id: requestId },
      { 
        status: 'COMPLETED',
        products: request.products,
        completedAt: new Date()
      }
    );

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await ProcessingRequest.updateOne(
      { _id: requestId },
      { 
        status: 'FAILED',
        error: error.message,
        failedAt: new Date()
      }
    );
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3,
  autorun: false
});

// Start worker after DB connection
mongoose.connection.on('connected', () => {
  worker.run();
  console.log('🔵 Worker started');
});