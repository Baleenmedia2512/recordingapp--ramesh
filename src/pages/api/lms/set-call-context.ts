/**
 * LMS Integration API - Set Call Context
 * POST /api/lms/set-call-context
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { handleLMSCallContext, LMSCallContext } from '@/services/lmsHttpServer';

interface SetCallContextRequest {
  phoneNumber: string;
  lmsCallId: string;
  customerName?: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  campaign?: string;
  apiKey?: string;
}

// Basic API key for security
const LMS_API_KEY = process.env.LMS_API_KEY || 'lms_api_key_2024';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST method allowed'
    });
  }

  // Validate API key
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey;
  if (apiKey !== LMS_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid API key'
    });
  }

  try {
    const requestData: SetCallContextRequest = req.body;
    
    // Validate required fields
    if (!requestData.phoneNumber || !requestData.lmsCallId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'phoneNumber and lmsCallId are required'
      });
    }

    // Create context
    const context: Omit<LMSCallContext, 'timestamp' | 'expiresAt'> = {
      phoneNumber: requestData.phoneNumber,
      lmsCallId: requestData.lmsCallId,
      customerName: requestData.customerName,
      customerId: requestData.customerId,
      leadId: requestData.leadId,
      dealId: requestData.dealId,
      campaign: requestData.campaign
    };

    // Set the context
    handleLMSCallContext(context);

    console.log('🏢 [LMS API] Call context set via API:', {
      phoneNumber: context.phoneNumber,
      lmsCallId: context.lmsCallId,
      customerName: context.customerName
    });

    return res.status(200).json({
      success: true,
      message: 'Call context set successfully',
      data: {
        phoneNumber: context.phoneNumber,
        lmsCallId: context.lmsCallId,
        customerName: context.customerName,
        expiresIn: '2 minutes'
      }
    });

  } catch (error: any) {
    console.error('🏢 [LMS API] Error setting call context:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * Example usage from LMS:
 * 
 * // Before making a call, LMS calls this endpoint
 * const response = await fetch('/api/lms/set-call-context', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-API-Key': 'lms_api_key_2024'
 *   },
 *   body: JSON.stringify({
 *     phoneNumber: '9360515518',
 *     lmsCallId: 'CALL_123',
 *     customerName: 'John Doe',
 *     customerId: 'CUST_456',
 *     leadId: 'LEAD_789',
 *     campaign: 'sales_follow_up'
 *   })
 * });
 * 
 * if (response.ok) {
 *   // Then trigger the phone call
 *   window.location.href = 'tel:9360515518';
 * }
 */