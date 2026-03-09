/**
 * LMS Server Status API
 * GET /api/lms/status
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { lmsHttpServer } from '@/services/lmsHttpServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only GET method allowed'
    });
  }

  try {
    const status = lmsHttpServer.getStatus();
    
    return res.status(200).json({
      success: true,
      message: 'Server status retrieved',
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        platform: 'web'
      }
    });

  } catch (error: any) {
    console.error('🏢 [LMS API] Error getting status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}