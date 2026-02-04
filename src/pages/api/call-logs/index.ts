import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth-mysql';
import { fetchCallLogs, createCallLog } from '@/lib/api-mysql';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (req.method === 'GET') {
      // Fetch call logs
      const logs = await fetchCallLogs(decoded.userId, req.query as any);
      return res.status(200).json(logs);
    }

    if (req.method === 'POST') {
      // Create call log
      const log = await createCallLog(decoded.userId, req.body.deviceId, req.body);
      return res.status(201).json(log);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API error:', error);
    res.status(error.message.includes('token') ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
