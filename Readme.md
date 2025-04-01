# Image Processing System

## Overview
The Image Processing System is a scalable backend service that processes image URLs, stores processed images, and triggers webhooks upon completion. It leverages **Node.js, Express, MongoDB, BullMQ, and Redis** to manage image processing and webhook retry mechanisms.

## Features
- Accepts image processing requests via API.
- Stores input and processed image URLs.
- Uses **BullMQ** for queue-based processing.
- Implements webhook retry with exponential backoff.
- Provides real-time status updates and CSV reports.
- Integrates with **Google Cloud Storage (GCP Bucket)** for secure image storage.

---

## 1. System Architecture
- **API Layer:** Handles client requests and responses.
- **Queue System:** Uses BullMQ for asynchronous image processing.
- **Database:** MongoDB stores requests, image URLs, and webhook retries.
- **Webhook Service:** Notifies external systems on request completion.
- **Retry Mechanism:** Retries failed webhooks with an exponential backoff strategy.
- **Cloud Storage:** Uses GCP Bucket for storing images securely.

### **Workflow**
1. User submits a request via `POST /api/upload`.
2. The request is stored in MongoDB with status `PENDING`.
3. The queue system processes each image asynchronously.
4. Processed images are uploaded to **GCP Bucket**, and status updates to `COMPLETED`.
5. A webhook notification is triggered if provided.
6. If the webhook fails, it is retried via `webhookRetryQueue`.
7. Users can check the request status (`GET /status/:requestId`).
8. Users can download a CSV report (`GET /download/:requestId`).

---

## 2. API Endpoints

### **Upload Image Processing Request**
- **Endpoint:** `POST /api/upload`
- **Description:** Accepts an image processing request.
- **Request Body:**
  ```json
  {
    "products": [
      {
        "serialNumber": 1,
        "productName": "Example Product",
        "inputUrls": ["https://example.com/image1.jpg"]
      }
    ],
    "webhookUrl": "https://webhook.site/example"
  }
  ```
- **Response:**
  ```json
  {
    "requestId": "123456",
    "status": "PENDING"
  }
  ```

### **Get Processing Status**
- **Endpoint:** `GET /status/:requestId`
- **Response:**
  ```json
  {
    "status": "PROCESSING",
    "processedProducts": 2,
    "totalProducts": 6,
    "createdAt": "2025-03-31T12:00:00Z",
    "updatedAt": "2025-03-31T12:10:00Z"
  }
  ```

### **Download CSV Report**
- **Endpoint:** `GET /download/:requestId`
- **Response:** CSV file with columns:
  - Serial Number
  - Product Name
  - Input Image URLs
  - Output Image URLs

---

## 3. Installation & Setup

### **Prerequisites**
- Node.js 18+
- MongoDB
- Redis
- Google Cloud Storage (GCP Bucket)

### **Setup Instructions**
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/image-processing-system.git
   cd image-processing-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` file:
   ```ini
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/image-processing
   REDIS_HOST=localhost
   REDIS_PORT=6379
   GCP_PROJECT_ID=your-gcp-project-id
   GCP_BUCKET_NAME=your-bucket-name
   GCP_KEY_BASE64=your-base64-encoded-key
   WEBHOOK_RETRY_ATTEMPTS=5
   WEBHOOK_RETRY_DELAY=1000
   ```
4. Set up GCP credentials securely:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=config/gcp-key.json
   ```
5. Start the application:
   ```bash
   npm start
   ```

---

## 4. Webhook Retry Mechanism
- **Queue System:** Failed webhooks are added to BullMQ.
- **Retry Logic:** Exponential backoff (1s, 2s, 4s, etc.) up to 5 attempts.
- **Worker Process:** Continuously processes the retry queue.
- **Failure Handling:** If all attempts fail, the webhook is marked `FAILED`.

---

## 5. Deployment with Docker

### **Run with Docker Compose**
```bash
docker-compose up --build
```

### **Ensure GCP Credentials Are Set Correctly**
If you encounter an error related to missing `gcp-key.json`, make sure the file is correctly mounted in the container:

```bash
volumes:
  - ./config/gcp-key.json:/app/config/gcp-key.json
```

---

## 6. Folder Structure
```
image-processing-system/
├── config/
│   ├── db.js
│   ├── gcp-key.json (auto-generated)
├── routes/
│   ├── api.js
├── workers/
│   ├── imageProcessor.js
├── models/
│   ├── ImageRequest.js
├── services/
│   ├── storageService.js
│   ├── webhookService.js
├── middleware/
│   ├── rateLimiter.js
├── public/
│   ├── uploads/
├── .env
├── .env.example
├── docker-compose.yml
├── package.json
├── server.js
├── README.md
```

---

## 7. Security & Error Handling
- **Rate Limiting:** Implemented using Redis.
- **Authentication:** API keys (Future enhancement).
- **Logging:** Errors are logged with timestamps.

---

## 8. Future Enhancements
- OAuth-based authentication.
- Image transformation features (resize, compress).
- Real-time WebSocket notifications.
- Auto-scaling with Kubernetes.

---

## 9. Contributors
- **Rohit Kumar** - Backend Engineer

For questions, reach out at [rohit.kumpan01@gmail.com](mailto:rohit.kumpan01@gmail.com).