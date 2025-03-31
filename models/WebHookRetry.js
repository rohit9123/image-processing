import mongoose from 'mongoose';

const webhookRetrySchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessingRequest',
    required: true
  },
  webhookUrl: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  attemptCount: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 10
  },
  nextRetryAt: {
    type: Date
  },
  lastError: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'failed', 'completed'],
    default: 'pending'
  }
}, { timestamps: true });

webhookRetrySchema.index({ nextRetryAt: 1, status: 1 });

export default mongoose.model('WebhookRetry', webhookRetrySchema);