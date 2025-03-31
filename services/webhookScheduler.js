import WebhookRetry from '../models/WebHookRetry.js';
import { webhookRetryQueue } from '../queues/webhookRetryQueue.js';

export async function checkPendingWebhooks() {
  const pendingWebhooks = await WebhookRetry.find({
    status: 'pending',
    nextRetryAt: { $lte: new Date() }
  });

  for (const webhook of pendingWebhooks) {
    await webhookRetryQueue.add('webhook-retry', {
      webhookRetryId: webhook._id
    }, {
      delay: 0,
      jobId: webhook._id.toString()
    });
  }
}

// Run every 5 minutes
setInterval(checkPendingWebhooks, 5 * 60 * 1000);