import cors from 'cors';
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

// Initialize core services
connectDB();

const app = express();
const swaggerDoc = YAML.load('./swagger.yaml');

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupGCPCredentials() {
  try {
    const configDir = path.join(__dirname, 'config');
    const keyPath = path.join(configDir, 'gcp-key.json');

    if (!process.env.GCP_KEY_BASE64) {
      throw new Error('GCP_KEY_BASE64 environment variable is missing');
    }

    await fs.mkdir(configDir, { recursive: true, mode: 0o755 });
    const keyContent = Buffer.from(process.env.GCP_KEY_BASE64, 'base64').toString();
    await fs.writeFile(keyPath, keyContent, { mode: 0o600 });

    console.log('GCP credentials verified at:', keyPath);
  } catch (error) {
    console.error('Credential setup failed:', error.message);
    process.exit(1);
  }
}

await setupGCPCredentials();

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
