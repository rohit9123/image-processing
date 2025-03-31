import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/queue.js';
import WebhookRetry from '../models/WebHookRetry.js';
import axios from 'axios';

export const webhookRetryQueue = new Queue('webhook-retries', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

// Worker to process retries
new Worker('webhook-retries', async job => {
  const { webhookRetryId } = job.data;
  
  const retry = await WebhookRetry.findById(webhookRetryId);
  if (!retry || retry.status === 'completed') return;

  try {
    const response = await axios.post(retry.webhookUrl, retry.payload, {
      timeout: 10000
    });

    await WebhookRetry.updateOne(
      { _id: retry._id },
      { 
        status: 'completed',
        attemptCount: retry.attemptCount + 1
      }
    );
    
    return { success: true, status: response.status };
  } catch (error) {
    const nextAttemptDelay = Math.min(1000 * 60 * 60, 1000 * Math.pow(2, retry.attemptCount + 1));
    
    await WebhookRetry.updateOne(
      { _id: retry._id },
      { 
        attemptCount: retry.attemptCount + 1,
        nextRetryAt: new Date(Date.now() + nextAttemptDelay),
        lastError: error.message,
        status: retry.attemptCount + 1 >= retry.maxAttempts ? 'failed' : 'pending'
      }
    );

    if (retry.attemptCount + 1 >= retry.maxAttempts) {
      console.error(`Webhook ${retry._id} permanently failed after ${retry.maxAttempts} attempts`);
    }

    throw error;
  }
}, { connection: redisConnection });