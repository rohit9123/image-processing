import ProcessingRequest from '../models/ProcessingRequest.js';

export const getStatus = async (req, res) => {
  try {
    const request = await ProcessingRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const processedCount = request.products.filter(
      p => p.status === 'PROCESSED'
    ).length;

    res.json({
      status: request.status,
      processedProducts: processedCount,
      totalProducts: request.products.length,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};