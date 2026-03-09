import type { NextApiRequest, NextApiResponse } from 'next';
import { testLMSConnection } from '@/services/lmsApi';

/**
 * Test LMS connection endpoint
 * GET /api/lms/test
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isConnected = await testLMSConnection();
    
    if (isConnected) {
      return res.status(200).json({
        success: true,
        message: 'LMS connection successful',
        connected: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'LMS not reachable',
        connected: false,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('LMS connection test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test LMS connection',
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }
}
