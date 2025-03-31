import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection configuration
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Important for BullMQ
  enableOfflineQueue: false
});

// Initialize image processing queue
export const imageQueue = new Queue('image-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

// Cleanup connection on shutdown
process.on('SIGTERM', async () => {
  await redisConnection.quit();
  await imageQueue.close();
});