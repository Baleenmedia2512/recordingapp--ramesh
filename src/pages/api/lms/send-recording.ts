import type { NextApiRequest, NextApiResponse } from 'next';
import { updateLMSRecording } from '@/services/lmsApi';

/**
 * Send recording URL to LMS
 * POST /api/lms/send-recording
 * 
 * Body:
 * {
 *   "callLogId": "ABC123",
 *   "recordingUrl": "https://drive.google.com/...",
 *   "duration": 120,
 *   "recordingId": "optional-file-id"
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
    const { callLogId, recordingUrl, duration, recordingId } = req.body;

    // Validate required fields
    if (!callLogId || !recordingUrl || duration === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: callLogId, recordingUrl, duration',
      });
    }

    // Send to LMS
    const success = await updateLMSRecording(
      callLogId,
      recordingUrl,
      duration,
      recordingId
    );

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Recording URL sent to LMS successfully',
        callLogId,
        recordingUrl,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to update LMS with recording URL',
      });
    }
  } catch (error: any) {
    console.error('LMS send recording error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send recording to LMS',
    });
  }
}
