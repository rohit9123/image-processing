import express from 'express';
import { uploadCSV } from '../controllers/uploadController.js';
import  { getStatus } from '../controllers/statusController.js'
import { rateLimiter } from '../middleware/rateLimiter.js';
import { downloadCSV } from '../controllers/csvController.js';


const router = express.Router();

// POST /api/upload - Handle CSV file upload
router.post('/upload',rateLimiter, uploadCSV);

// GET /api/status/:requestId - Check processing status
router.get('/status/:requestId', getStatus);
router.get('/download/:requestId', downloadCSV);

export default router;