# Image Processing Pipeline

## Overview
This project provides an image processing pipeline where users can upload a CSV file containing product details and image URLs. The images are processed using Sharp and stored in Google Cloud Storage. Webhooks notify users about the processing status, with automatic retry mechanisms for failures.

## Features
- Upload CSV files with product details and image URLs.
- Process images using Sharp (resize, optimize, and convert to JPEG).
- Store processed images in Google Cloud Storage.
- Use Redis-based rate limiting for API protection.
- Implement webhook notifications with a retry mechanism.
- Queue-based processing with BullMQ.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Queue System:** BullMQ (Redis)
- **Cloud Storage:** Google Cloud Storage
- **Image Processing:** Sharp
- **Rate Limiting:** Redis
- **Webhooks:** Axios

## Installation

### Prerequisites
- Node.js & npm
- Redis
- MongoDB
- Google Cloud Storage Bucket

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/image-processing.git
   cd image-processing
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the root directory and set the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/image-processing
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   GCP_PROJECT_ID=your-gcp-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path-to-gcp-key.json
   GCP_BUCKET_NAME=your-gcp-bucket-name
   ```
4. Start Redis and MongoDB services.
5. Run the server:
   ```bash
   npm start
   ```

## API Endpoints

### 1. Upload CSV
```http
POST /api/upload
```
- **Description:** Uploads a CSV file and starts image processing.
- **Request:**
  - `multipart/form-data` with `csv` file.
  - `webhookUrl` (optional) for status updates.
- **Response:**
  ```json
  { "requestId": "<unique-id>" }
  ```

### 2. Check Processing Status
```http
GET /api/status/:requestId
```
- **Response:**
  ```json
  {
    "status": "IN_PROGRESS",
    "processedProducts": 5,
    "totalProducts": 10,
    "createdAt": "2025-03-31T12:00:00Z",
    "updatedAt": "2025-03-31T12:30:00Z"
  }
  ```

## Webhook Structure
The webhook sends a POST request with the following payload:
```json
{
  "requestId": "<id>",
  "status": "COMPLETED",
  "successCount": 10,
  "failedCount": 2,
  "timestamp": "2025-03-31T12:30:00Z"
}
```

## Retry Mechanism
- Webhook failures are logged and retried.
- Retries follow an exponential backoff strategy.

## Rate Limiting
- The API is protected using Redis-based rate limiting.
- Each IP can make up to **5 requests per minute**.

## Contribution
Contributions are welcome! Feel free to fork and create a PR.

## License
This project is licensed under the MIT License.

