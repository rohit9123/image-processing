import axios from 'axios';
import WebhookRetry from '../models/WebHookRetry';

export async function triggerWebhook(request) {
  if (!request.webhookUrl) return;

  const payload = {
    requestId: request._id,
    status: request.status,
    successCount: request.products.filter(p => p.status === 'PROCESSED').length,
    failedCount: request.products.filter(p => p.status === 'FAILED').length,
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(request.webhookUrl, payload, { timeout: 5000 });
    console.log(`Webhook sent successfully to ${request.webhookUrl}`);
  } catch (error) {
    console.error('Webhook failed, scheduling retry:', error.message);
    await WebhookRetry.create({
      requestId: request._id,
      webhookUrl: request.webhookUrl,
      payload,
      lastError: error.message
    });
  }
}