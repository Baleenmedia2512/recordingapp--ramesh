import type { NextApiRequest, NextApiResponse } from 'next';
import { createGoogleDriveService, getGoogleDriveConfigFromEnv } from '@/lib/google-drive';

interface AuthResponse {
  success: boolean;
  authUrl?: string;
  tokens?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>
) {
  const { method } = req;

  try {
    const config = getGoogleDriveConfigFromEnv();
    
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ 
        success: false, 
        error: 'Google Drive not configured' 
      });
    }

    const driveService = createGoogleDriveService(config);

    if (method === 'GET') {
      // Handle OAuth callback
      const { code } = req.query;

      if (code && typeof code === 'string') {
        // Exchange code for tokens
        const tokens = await driveService.getTokenFromCode(code);
        
        return res.status(200).json({
          success: true,
          tokens: tokens,
        });
      } else {
        // Get authorization URL
        const authUrl = driveService.getAuthUrl();
        
        return res.status(200).json({
          success: true,
          authUrl: authUrl,
        });
      }
    } else if (method === 'POST') {
      // Set credentials
      const { credentials } = req.body;
      
      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: 'Credentials required',
        });
      }

      driveService.setCredentials(credentials);
      
      return res.status(200).json({
        success: true,
      });
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in Google auth:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
