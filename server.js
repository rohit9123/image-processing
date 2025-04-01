import 'dotenv/config';
import express from 'express';
import fileUpload from 'express-fileupload';
import connectDB from './config/db.js';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRoutes from './routes/api.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';


// Initialize core services
connectDB();

const app = express();
const swaggerDoc = YAML.load('./swagger.yaml');


// Modify your GCP setup function
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupGCPCredentials() {
  try {
    const configDir = path.join(__dirname, 'config');
    const keyPath = path.join(configDir, 'gcp-key.json');

    if (!process.env.GCP_KEY_BASE64) {
      throw new Error('GCP_KEY_BASE64 environment variable is missing');
    }

    // Create the directory if it doesn't exist
    await fs.mkdir(configDir, { recursive: true, mode: 0o755 });

    const keyContent = Buffer.from(process.env.GCP_KEY_BASE64, 'base64').toString();

    // Log the key content (first 100 characters) to ensure it's decoded correctly
    // console.log('Decoded GCP credentials:', keyContent.slice(0, 100));

    // Try writing the file to the specified path
    await fs.writeFile(keyPath, keyContent, { mode: 0o600 });

    // Verify if the file is created
    const stats = await fs.stat(keyPath);
    if (!stats.isFile()) {
      throw new Error('Failed to create credentials file');
    }

    console.log('GCP credentials verified at:', keyPath);

  } catch (error) {
    console.error('Credential setup failed:', error.message);
    process.exit(1);
  }
}


await setupGCPCredentials();


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
app.listen(PORT, '0.0.0.0' , () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
// Security headers middleware
