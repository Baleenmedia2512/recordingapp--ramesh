/**
 * Google Drive Upload Service for Mobile
 * Handles uploading recordings to Google Drive from mobile devices
 * and sending URLs to LMS
 */

import { checkLMSCall, updateLMSRecording } from './lmsApi';

export interface LMSCallStorage {
  callLogId: string;
  leadId: string;
  leadName: string;
  phoneNumber: string;
  startTime: string;
  timestamp: number;
}

/**
 * Store LMS call information in localStorage for later use
 */
export function storeLMSCallInfo(data: LMSCallStorage): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_lms_call', JSON.stringify(data));
      console.log('✅ LMS call info saved locally');
    }
  } catch (error) {
    console.error('❌ Error storing LMS call info:', error);
  }
}

/**
 * Retrieve stored LMS call information
 */
export function getLMSCallInfo(): LMSCallStorage | null {
  try {
    if (typeof window !== 'undefined') {
      const dataStr = localStorage.getItem('current_lms_call');
      if (dataStr) {
        return JSON.parse(dataStr);
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error retrieving LMS call info:', error);
    return null;
  }
}

/**
 * Clear stored LMS call information
 */
export function clearLMSCallInfo(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_lms_call');
      console.log('✅ LMS call info cleared');
    }
  } catch (error) {
    console.error('❌ Error clearing LMS call info:', error);
  }
}

/**
 * Check if a call is from LMS and store the information
 * Call this when an outgoing call is detected
 */
export async function handleOutgoingCall(
  phoneNumber: string,
  callStartTime: Date
): Promise<void> {
  try {
    console.log('📞 Outgoing call detected:', phoneNumber);
    
    // Normalize phone number (remove spaces, dashes, +, parentheses)
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    
    // Check if this call is from LMS
    const lmsCallData = await checkLMSCall(normalizedPhone, callStartTime);
    
    if (lmsCallData && lmsCallData.isLMSCall) {
      console.log('✅ LMS call detected!');
      console.log('   Lead:', lmsCallData.leadName);
      console.log('   Phone:', lmsCallData.leadPhone);
      
      // Store LMS call info for later use when recording is uploaded
      storeLMSCallInfo({
        callLogId: lmsCallData.callLogId!,
        leadId: lmsCallData.leadId!,
        leadName: lmsCallData.leadName!,
        phoneNumber: normalizedPhone,
        startTime: callStartTime.toISOString(),
        timestamp: Date.now(),
      });
    } else {
      console.log('ℹ️ Regular call (not from LMS)');
      // Clean up any old LMS call data
      clearLMSCallInfo();
    }
  } catch (error) {
    console.error('❌ Error handling outgoing call:', error);
  }
}

/**
 * Send recording URL to LMS after upload completes
 * Call this after successfully uploading a recording to Google Drive
 */
export async function sendRecordingToLMS(
  recordingUrl: string,
  duration: number,
  recordingId?: string
): Promise<boolean> {
  try {
    const lmsCallData = getLMSCallInfo();
    
    if (lmsCallData) {
      console.log('📨 Sending recording to LMS...');
      console.log('   CallLog ID:', lmsCallData.callLogId);
      console.log('   Lead:', lmsCallData.leadName);
      console.log('   Recording URL:', recordingUrl);
      
      // Send recording URL to LMS
      const success = await updateLMSRecording(
        lmsCallData.callLogId,
        recordingUrl,
        duration,
        recordingId
      );
      
      if (success) {
        console.log('✅ LMS updated with recording URL!');
        console.log('   Sales team can now listen to this call');
        
        // Clean up after successful update
        clearLMSCallInfo();
        return true;
      } else {
        console.error('❌ Failed to update LMS - will retry later');
        // Keep the data in storage for potential retry
        return false;
      }
    } else {
      console.log('ℹ️ Not an LMS call - recording saved to Drive only');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending recording to LMS:', error);
    return false;
  }
}

/**
 * Get direct play/download link for Google Drive file
 * Converts file ID to a direct access URL
 */
export function getDirectPlayLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Complete recording flow: Upload to Drive and send to LMS
 * Use this as a single function to handle the entire post-recording flow
 */
export async function completeRecordingUpload(
  uploadResult: { fileId: string; webViewLink: string },
  duration: number,
  localFilePath?: string
): Promise<{ success: boolean; sentToLMS: boolean }> {
  try {
    // Get direct play link
    const recordingUrl = getDirectPlayLink(uploadResult.fileId);
    console.log('🔗 Recording URL:', recordingUrl);
    
    // Send to LMS if this was an LMS call
    const sentToLMS = await sendRecordingToLMS(
      recordingUrl,
      duration,
      uploadResult.fileId
    );
    
    return {
      success: true,
      sentToLMS,
    };
  } catch (error) {
    console.error('❌ Error completing recording upload:', error);
    return {
      success: false,
      sentToLMS: false,
    };
  }
}
