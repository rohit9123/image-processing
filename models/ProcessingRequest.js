import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  serialNumber: { type: Number, required: true },
  productName: { type: String, required: true },
  inputUrls: { type: [String], required: true },
  outputUrls: { type: [String], default: [] },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSED', 'FAILED'], 
    default: 'PENDING' 
  }
});

const processingRequestSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  },
  webhookUrl: { type: String },
  products: [productSchema]
}, { timestamps: true });

export default mongoose.model('ProcessingRequest', processingRequestSchema);