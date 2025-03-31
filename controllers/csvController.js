import ProcessingRequest from '../models/ProcessingRequest.js';
import { Parser } from 'json2csv';

export const downloadCSV = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ProcessingRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Processing is still in progress' });
    }

    // Transform data for CSV
    const products = request.products.map(product => ({
      SerialNumber: product.serialNumber,
      ProductName: product.productName,
      InputImageUrls: product.inputUrls.join(', '),
      OutputImageUrls: product.outputUrls.join(', '),
      Status: product.status
    }));

    // Convert JSON to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(products);

    // Send CSV as a downloadable file
    res.header('Content-Type', 'text/csv');
    res.attachment(`request_${requestId}.csv`);
    return res.send(csv);

  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
