import LMS_CONFIG from '../config/lms.config';
import { checkLMSContext, clearLMSContext, LMSCallContext } from './lmsHttpServer';

export interface LMSCallData {
  isLMSCall: boolean;
  callLogId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  context?: LMSCallContext; // Add context from proactive LMS integration
}

/**
 * Check if an outgoing call was initiated from LMS
 * First checks for proactive context, then falls back to match call API
 * @param phoneNumber - The phone number being called (e.g., "9876543210")
 * @param timestamp - When the call started
 * @returns LMS call data if match found, null otherwise
 */
export async function checkLMSCall(
  phoneNumber: string,
  timestamp: Date
): Promise<LMSCallData | null> {
  // Skip if LMS integration is disabled
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return null;
  }

  // 🚀 NEW: First check for proactive LMS context
  const lmsContext = checkLMSContext(phoneNumber);
  if (lmsContext) {
    console.log('🎯 [LMS CONTEXT] Found proactive LMS context!', {
      phoneNumber,
      lmsCallId: lmsContext.lmsCallId,
      customerName: lmsContext.customerName,
      customerId: lmsContext.customerId,
      leadId: lmsContext.leadId
    });
    
    // Convert context to LMSCallData format
    const lmsData: LMSCallData = {
      isLMSCall: true,
      callLogId: lmsContext.lmsCallId,
      leadId: lmsContext.leadId || lmsContext.customerId,
      leadName: lmsContext.customerName,
      leadPhone: phoneNumber,
      context: lmsContext
    };
    
    // Don't clear context yet - wait until recording is processed
    return lmsData;
  }
  
  console.log('🔍 [LMS] No proactive context found, trying match call API...');

  // Skip direct LMS API call if using edge functions (default for mobile)
  // The native UploadWorker handles LMS sync via edge function to avoid CORS
  if (LMS_CONFIG.useEdgeFunction) {
    console.log('ℹ️ [LMS] Edge function mode enabled - skipping JavaScript LMS check');
    console.log('   Native upload worker will handle LMS sync via edge function');
    console.log('   This avoids CORS issues from mobile WebView');
    return null;
  }

  try {
    const requestPayload = {
      phone: phoneNumber,
      timestamp: timestamp.toISOString(),
      apiKey: LMS_CONFIG.apiKey?.substring(0, 10) + '...', // Hide full key in logs
    };
    
    console.log('🔔 [LMS TRIGGER] Match Call API Called (Direct Mode)');
    console.log('   📞 Phone:', phoneNumber);
    console.log('   ⏰ Timestamp:', timestamp.toISOString());
    console.log('   🌐 Endpoint:', `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.matchCall}`);
    console.log('   📦 Payload:', JSON.stringify(requestPayload, null, 2));
    console.warn('   ⚠️ Direct mode may face CORS issues on mobile - consider enabling useEdgeFunction');
    
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.matchCall}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          timestamp: timestamp.toISOString(),
          apiKey: LMS_CONFIG.apiKey,
        }),
        signal: AbortSignal.timeout(15000), // 15 second timeout for mobile networks
      }
    );

    if (!response.ok) {
      console.error('❌ [LMS RESPONSE] Match Call Failed');
      console.error('   Status:', response.status, response.statusText);
      console.error('   URL:', response.url);
      try {
        const errorBody = await response.text();
        console.error('   Error Body:', errorBody);
      } catch (e) {
        console.error('   Could not read error body');
      }
      return null;
    }

    const data = await response.json();
    console.log('✅ [LMS RESPONSE] Match Call Response:', JSON.stringify(data, null, 2));
    
    if (data.isLMSCall) {
      console.log('🎯 [LMS MATCH] Call matched to LMS!');
      console.log('   👤 Lead:', data.leadName);
      console.log('   📋 CallLog ID:', data.callLogId);
      console.log('   🆔 Lead ID:', data.leadId);
      return data;
    } else {
      console.log('ℹ️ [LMS] No match - regular call (not from LMS)');
      return null;
    }
  } catch (error: any) {
    console.error('❌ [LMS ERROR] Match Call Exception');
    console.error('   Error:', error.message);
    console.error('   Type:', error.name);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Send recording URL back to LMS after upload
 * @param callLogId - The LMS CallLog ID from checkLMSCall
 * @param recordingUrl - Public URL of the uploaded recording
 * @param duration - Call duration in seconds
 * @param recordingAppCallId - Optional: Your app's recording ID
 * @returns true if successful, false otherwise
 */
export async function updateLMSRecording(
  callLogId: string,
  recordingUrl: string,
  duration: number,
  recordingAppCallId?: string,
  phoneNumber?: string // Add phone number to clear context
): Promise<boolean> {
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return false;
  }

  try {
    const requestPayload = {
      callLogId,
      recordingUrl,
      duration,
      recordingAppCallId,
      apiKey: LMS_CONFIG.apiKey?.substring(0, 10) + '...', // Hide full key in logs
    };
    
    console.log('🔔 [LMS TRIGGER] Update Recording API Called');
    console.log('   📋 CallLog ID:', callLogId);
    console.log('   🎵 Recording URL:', recordingUrl);
    console.log('   ⏱️ Duration:', duration, 'seconds');
    console.log('   🆔 Recording App Call ID:', recordingAppCallId || 'N/A');
    console.log('   🌐 Endpoint:', `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.updateRecording}`);
    console.log('   📦 Payload:', JSON.stringify(requestPayload, null, 2));
    console.log('   ⏰ Timestamp:', new Date().toISOString());
    
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.updateRecording}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callLogId,
          recordingUrl,
          duration,
          recordingAppCallId,
          apiKey: LMS_CONFIG.apiKey,
        }),
        signal: AbortSignal.timeout(20000), // 20 second timeout for mobile networks
      }
    );

    if (!response.ok) {
      console.error('❌ [LMS RESPONSE] Update Recording Failed');
      console.error('   Status:', response.status, response.statusText);
      console.error('   URL:', response.url);
      try {
        const errorBody = await response.text();
        console.error('   Error Body:', errorBody);
      } catch (e) {
        console.error('   Could not read error body');
      }
      return false;
    }

    const data = await response.json();
    console.log('✅ [LMS RESPONSE] Update Recording Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('🎉 [LMS SUCCESS] Recording URL sent to LMS successfully!');
      console.log('   ✅ LMS can now play the recording');
      console.log('   ✅ Sales team will see recording in lead details');
      
      // Clear the LMS context since recording was successfully processed
      if (phoneNumber) {
        clearLMSContext(phoneNumber);
        console.log('🧹 [LMS] Cleared call context for:', phoneNumber);
      }
      
      return true;
    } else {
      console.error('❌ [LMS FAILED] LMS rejected the recording update');
      console.error('   Response data:', data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ [LMS ERROR] Update Recording Exception');
    console.error('   Error:', error.message);
    console.error('   Type:', error.name);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return false;
  }
}

/**
 * Test LMS connection
 * Call this on app startup to verify LMS is reachable
 */
export async function testLMSConnection(): Promise<boolean> {
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return false;
  }

  try {
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.health}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      }
    );
    
    if (response.ok) {
      console.log('[LMS] ✅ Connection successful');
      return true;
    } else {
      console.log('[LMS] ⚠️ Connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('[LMS] ⚠️ Cannot reach LMS:', error);
    return false;
  }
}
