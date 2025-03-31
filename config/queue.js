import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection configuration
export const redisConnection = new Redis(process.env.REDIS_URL,{
  maxRetriesPerRequest: null,
})

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