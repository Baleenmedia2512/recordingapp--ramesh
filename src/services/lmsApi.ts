import LMS_CONFIG from '../config/lms.config';

export interface LMSCallData {
  isLMSCall: boolean;
  callLogId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
}

/**
 * Check if an outgoing call was initiated from LMS
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

  try {
    console.log('[LMS] Checking if call is from LMS:', phoneNumber);
    
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
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      console.error('[LMS] Match call API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.isLMSCall) {
      console.log('[LMS] ✅ Match found! Lead:', data.leadName);
      return data;
    } else {
      console.log('[LMS] ℹ️ No match - regular call');
      return null;
    }
  } catch (error) {
    console.error('[LMS] Error checking LMS call:', error);
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
  recordingAppCallId?: string
): Promise<boolean> {
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return false;
  }

  try {
    console.log('[LMS] Updating recording for CallLog:', callLogId);
    
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
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      console.error('[LMS] Update recording API error:', response.status);
      return false;
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('[LMS] ✅ Recording updated successfully!');
      return true;
    } else {
      console.error('[LMS] ❌ Failed to update recording');
      return false;
    }
  } catch (error) {
    console.error('[LMS] Error updating LMS recording:', error);
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
