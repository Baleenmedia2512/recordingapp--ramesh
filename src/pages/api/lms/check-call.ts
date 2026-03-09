import type { NextApiRequest, NextApiResponse } from 'next';
import { checkLMSCall } from '@/services/lmsApi';

/**
 * Check if a call matches an LMS call
 * POST /api/lms/check-call
 * 
 * Body:
 * {
 *   "phoneNumber": "9876543210",
 *   "timestamp": "2024-01-15T14:30:00.000Z"
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, timestamp } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Use current time if no timestamp provided
    const callTime = timestamp ? new Date(timestamp) : new Date();

    // Check with LMS
    const lmsData = await checkLMSCall(phoneNumber, callTime);

    if (lmsData && lmsData.isLMSCall) {
      return res.status(200).json({
        success: true,
        isLMSCall: true,
        data: lmsData,
        message: `Matched to lead: ${lmsData.leadName}`,
      });
    } else {
      return res.status(200).json({
        success: true,
        isLMSCall: false,
        message: 'No LMS call match found',
      });
    }
  } catch (error: any) {
    console.error('LMS check call error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check LMS call',
    });
  }
}
