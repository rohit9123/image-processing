// server.js
import 'dotenv/config'
import express from 'express';
import fileUpload from 'express-fileupload';
import connectDB from './config/db.js';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRoutes from './routes/api.js'

const app = express();
const swaggerDoc = YAML.load('./swagger.yaml');
connectDB();

app.use(fileUpload({
  useTempFiles: true,          // Required for temp files
  tempFileDir: '/tmp/uploads', // Explicit temp directory
  safeFileNames: true,         // Prevent path traversal
  preserveExtension: true,     // Keep .csv extension
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}));

// Middleware
app.use(express.json());
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));

// Routes
app.get('/',(req,res) => res.send("hello"));
app.use('/api', apiRoutes);


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  
  console.log(`Server running on port ${PORT}`);
});