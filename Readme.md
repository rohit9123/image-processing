# Image Processing System - README

## Overview
The Image Processing System is a scalable service that processes image URLs, generates optimized output images, and triggers webhooks upon completion. It supports retry mechanisms for failed webhooks and allows users to check request statuses and download results in CSV format.

## Features
- **Upload Image Processing Requests** via API
- **Queue-Based Processing** using BullMQ
- **Webhook Support** for notifications
- **Retry Mechanism** for failed webhooks
- **Status Tracking** for processing requests
- **CSV Report Generation**

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Queue System:** BullMQ (Redis)
- **Cloud Storage:** AWS S3 / GCP Cloud Storage
- **Worker Processing:** BullMQ Workers
- **Logging & Monitoring:** Winston / Bunyan

## API Endpoints
### 1. Upload Image Processing Request
- **Endpoint:** `POST /api/upload`
- **Payload:**
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
  }
  ```

### 2. Get Processing Status
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

### 3. Download CSV Report
- **Endpoint:** `GET /download/:requestId`
- **Response:** CSV file containing:
  - Serial Number
  - Product Name
  - Input Image URLs
  - Output Image URLs

## System Workflow
1. **Request Submission:** Users submit a processing request.
2. **Queue Management:** The request is enqueued for processing.
3. **Worker Execution:** Workers fetch the request and process images.
4. **Storage & Completion:** Processed images are stored, and the request status is updated.
5. **Webhook Triggering:** If provided, a webhook is triggered with the final status.
6. **Retry Mechanism:** If the webhook fails, it is retried using exponential backoff.
7. **Status Check & CSV Download:** Users can check the request status and download results.

## Webhook Retry Mechanism
- Failed webhooks are added to a **retry queue**.
- Retries use **exponential backoff** (1s, 2s, 4s, etc.).
- Max **5 retry attempts** before marking as permanently failed.

## Installation & Setup
### Prerequisites
- Node.js (v16+)
- Redis Server
- MongoDB
- Docker

### Steps to Run Locally
1. **Clone the Repository:**
   ```sh
   git clone https://github.com/your-repo/image-processing.git
   cd image-processing
   ```
2. **Install Dependencies:**
   ```sh
   npm install
   ```
3. **Setup Environment Variables:**
   Create a `.env` file and configure the following:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   MONGO_URI=mongodb://localhost:27017/image_processing
   # GCP Configuration
  GCP_PROJECT_ID=Your project id
  GCP_BUCKET_NAME=bucket name
  GOOGLE_APPLICATION_CREDENTIALS=application credentials

   ```
1. **Run the Server:**
   ```sh
   npm start
   ```

## Deployment
### Docker-Based Deployment
1. **Build the Docker Image:**
   ```sh
   docker build -t image-processing .
   ```
2. **Run the Docker Container:**
   ```sh
   docker-compose up -d
   ```

## Contributing
- Fork the repository
- Create a feature branch
- Commit your changes
- Create a pull request

## License
This project is licensed under the MIT License.

