import csv from 'csv-parser';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ProcessingRequest from '../models/ProcessingRequest.js';
import { imageQueue } from '../config/queue.js';

// Helper: Validate CSV row
const validateRow = (row) => {
  if (!row['S. No.'] || !row['Product Name'] || !row['Input Image Urls']) {
    throw new Error('Missing required fields in CSV row');
  }
};

// Upload CSV Controller
export const uploadCSV = async (req, res) => {
  try {
    if (!req.files?.csv) {
      return res.status(400).json({ error: "CSV file required" });
    }

    const csvFile = req.files.csv;

    // Validate temporary file path
    if (!csvFile.tempFilePath) {
      return res.status(500).json({ error: "Temporary file not created" });
    }

    // Verify file exists
    if (!fs.existsSync(csvFile.tempFilePath)) {
      return res.status(500).json({ error: "File upload failed" });
    }

    // Process CSV
    const results = [];
    fs.createReadStream(csvFile.tempFilePath)
      .pipe(csv())
      .on("data", (row) => {
        try {
          validateRow(row);
          results.push({
            serialNumber: row["S. No."],
            productName: row["Product Name"],
            inputUrls: row["Input Image Urls"].split(",").map((url) => url.trim()),
          });
        } catch (error) {
          throw error; // Propagate validation errors
        }
      })
      .on("end", async () => {
        try {
          const newRequest = await ProcessingRequest.create({
            // webhookUrl: req.body.webhookUrl  if want to use
            products: results,
          });

          await imageQueue.add("process-images", {
            requestId: newRequest._id.toString(),
          });

          res.json({ requestId: newRequest._id });
        } catch (error) {
          console.error("Database error:", error);
          res.status(500).json({ error: "Failed to create request" });
        }
      })
      .on("error", (error) => {
        console.error("CSV stream error:", error);
        res.status(500).json({ error: "CSV processing failed" });
      });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};