import 'dotenv/config';
import express from 'express';
import fileUpload from 'express-fileupload';
import connectDB from './config/db.js';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRoutes from './routes/api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize core services
connectDB();

const app = express();
const swaggerDoc = YAML.load('./swagger.yaml');

// Secure GCP credentials handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupGCPCredentials = () => {
  try {
    if (!process.env.GCP_KEY_BASE64) {
      throw new Error('GCP_KEY_BASE64 environment variable is missing');
    }

    const gcpKey = Buffer.from(process.env.GCP_KEY_BASE64, 'base64').toString('utf-8');
    const keyPath = path.resolve('/app/config/gcp-key.json');  // Ensure absolute path inside container

    // Ensure `config` directory exists
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });

    // Write GCP credentials to file
    fs.writeFileSync(keyPath, gcpKey, { encoding: 'utf-8' });

    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    
    console.log('✅ GCP credentials initialized at:', keyPath);
    console.log('📂 File Exists:', fs.existsSync(keyPath));  // Debugging
  } catch (error) {
    console.error('❌ GCP credential setup failed:', error.message);
    process.exit(1);
  }
};

setupGCPCredentials();


// setupGCPCredentials();

// Enhanced file upload security
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/uploads',
  safeFileNames: true,
  preserveExtension: 4,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  abortOnLimit: true
}));

// Security headers middleware
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'"
  });
  next();
});

// API routes
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redis.status === 'ready' ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
