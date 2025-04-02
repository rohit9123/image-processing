import { Worker } from 'bullmq';
import axios from 'axios';
import ProcessingRequest from '../models/ProcessingRequest.js';
import { processImage } from '../services/imageService.js';
import { redisConnection } from '../config/queue.js';
import connectDB from '../config/db.js';
import express from 'express';

await connectDB();

// worker.js (top of file)
console.log("🔄 Initializing worker...");

// After worker creation
console.log(`🚀 Worker started for queue "image-processing"`);
const app = express();
const PORT = process.env.PORT || 8081;


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'WORKER_OK' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚙️ Worker health server running on port ${PORT}`);
});


const worker = new Worker('image-processing', async job => {
  const { requestId } = job.data;

  try {
    const request = await ProcessingRequest.findById(requestId);
    if (!request) throw new Error(`Request ${requestId} not found`);

    // Update status to PROCESSING
    request.status = 'PROCESSING';
    await request.save();

    let processedCount = 0;

    // Process each product's images
    for (const product of request.products) {
      try {
        product.outputUrls = [];

        for (const [index, url] of product.inputUrls.entries()) {
          try {
            const outputUrl = await processImage(url, requestId);
            product.outputUrls[index] = outputUrl;
          } catch (imgError) {
            console.error(`❌ Error processing image ${url} for product ${product.serialNumber}:`, imgError);
          }
        }

        product.status = product.outputUrls.length > 0 ? 'PROCESSED' : 'FAILED';
        if (product.status === 'PROCESSED') processedCount++;

      } catch (productError) {
        product.status = 'FAILED';
        console.error(`❌ Product ${product.serialNumber} processing failed:`, productError);
      }
    }

    // Finalize request
    request.status = processedCount > 0 ? 'COMPLETED' : 'FAILED';
    await request.save();

    // Trigger webhook if configured
    if (request.webhookUrl) {
      try {
        await axios.post(request.webhookUrl, {
          requestId,
          status: request.status,
          completedAt: new Date().toISOString(),
          processedCount
        });
      } catch (webhookError) {
        console.error(`❌ Webhook failed for request ${requestId}:`, webhookError);
      }
    }

    return { success: true };

  } catch (error) {
    console.error(`❌ Processing failed for request ${requestId}:`, error);
    await ProcessingRequest.updateOne(
      { _id: requestId },
      { status: 'FAILED', error: error.message }
    );
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 5, duration: 1000 }
});

// Worker event listeners
worker.on('completed', job => {
  console.log(`✅ Job ${job.id} completed for request ${job.data.requestId}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('⚠️ Shutting down worker...');
  await worker.close();
  await redisConnection.quit();
});
