import express from 'express';
import { uploadCSV, getStatus } from '../controllers/uploadController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';


const router = express.Router();

// POST /api/upload - Handle CSV file upload
router.post('/upload',rateLimiter, uploadCSV);

// GET /api/status/:requestId - Check processing status
router.get('/status/:requestId', getStatus);

export default router;