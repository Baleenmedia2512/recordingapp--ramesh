/**
 * Google Drive Upload Service for Mobile
 * Handles uploading recordings to Google Drive from mobile devices
 * and sending URLs to LMS
 */

import { checkLMSCall, updateLMSRecording } from './lmsApi';
import LMS_CONFIG from '@/config/lms.config';

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
    console.log('💾 [STORAGE] Storing LMS call info to localStorage');
    console.log('   Key: current_lms_call');
    console.log('   Data:', JSON.stringify(data, null, 2));
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_lms_call', JSON.stringify(data));
      console.log('   ✅ Successfully stored in localStorage');
      
      // Verify it was stored
      const stored = localStorage.getItem('current_lms_call');
      if (stored) {
        console.log('   ✅ Verified: Data persisted in localStorage');
      } else {
        console.warn('   ⚠️ Warning: Data not found after storage attempt');
      }
    } else {
      console.warn('   ⚠️ Window not available - cannot store');
    }
  } catch (error: any) {
    console.error('❌ [STORAGE ERROR] Failed to store LMS call info');
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  }
}

/**
 * Retrieve stored LMS call information
 */
export function getLMSCallInfo(): LMSCallStorage | null {
  try {
    console.log('🔍 [STORAGE] Retrieving LMS call info from localStorage');
    
    if (typeof window !== 'undefined') {
      const dataStr = localStorage.getItem('current_lms_call');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        console.log('   ✅ Found LMS call data:');
        console.log('   📋 CallLog ID:', data.callLogId);
        console.log('   👤 Lead:', data.leadName);
        console.log('   📞 Phone:', data.phoneNumber);
        console.log('   ⏰ Stored:', new Date(data.timestamp).toISOString());
        return data;
      } else {
        console.log('   ℹ️ No LMS call data found in localStorage');
        return null;
      }
    } else {
      console.warn('   ⚠️ Window not available - cannot retrieve');
      return null;
    }
  } catch (error: any) {
    console.error('❌ [STORAGE ERROR] Failed to retrieve LMS call info');
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Clear stored LMS call information
 */
export function clearLMSCallInfo(): void {
  try {
    console.log('🧹 [STORAGE] Clearing LMS call info from localStorage');
    
    if (typeof window !== 'undefined') {
      const hadData = localStorage.getItem('current_lms_call') !== null;
      localStorage.removeItem('current_lms_call');
      
      if (hadData) {
        console.log('   ✅ LMS call info cleared successfully');
      } else {
        console.log('   ℹ️ No data to clear');
      }
    } else {
      console.warn('   ⚠️ Window not available - cannot clear');
    }
  } catch (error: any) {
    console.error('❌ [STORAGE ERROR] Failed to clear LMS call info');
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
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
    console.log('� ========================================');
    console.log('📡 [CALL DETECTED] Outgoing call');
    console.log('   📞 Phone:', phoneNumber);
    console.log('   📅 Start Time:', callStartTime.toISOString());
    console.log('📡 ========================================');
        // Skip direct LMS API calls if using Edge Function (server-side approach)
    if (LMS_CONFIG.useEdgeFunction) {
      console.log('ℹ️ [EDGE FUNCTION MODE] Skipping direct LMS API call');
      console.log('   🚀 Supabase Edge Function will handle LMS integration');
      console.log('   📤 LMS will be notified automatically when recording uploads');
      return;
    }
        // Normalize phone number (remove spaces, dashes, +, parentheses)
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    console.log('   🔄 Normalized Phone:', normalizedPhone);
    
    // Check if this call is from LMS
    console.log('   🔍 Checking if call originated from LMS...');
    const lmsCallData = await checkLMSCall(normalizedPhone, callStartTime);
    
    if (lmsCallData && lmsCallData.isLMSCall) {
      console.log('🎉 ========================================');
      console.log('🎉 [LMS CALL MATCHED]');
      console.log('   👤 Lead Name:', lmsCallData.leadName);
      console.log('   📞 Lead Phone:', lmsCallData.leadPhone);
      console.log('   📋 CallLog ID:', lmsCallData.callLogId);
      console.log('   🆔 Lead ID:', lmsCallData.leadId);
      console.log('🎉 ========================================');
      
      // Store LMS call info for later use when recording is uploaded
      const storageData = {
        callLogId: lmsCallData.callLogId!,
        leadId: lmsCallData.leadId!,
        leadName: lmsCallData.leadName!,
        phoneNumber: normalizedPhone,
        startTime: callStartTime.toISOString(),
        timestamp: Date.now(),
      };
      
      console.log('   💾 Storing LMS call info in localStorage...');
      console.log('   💾 Storage Data:', JSON.stringify(storageData, null, 2));
      storeLMSCallInfo(storageData);
      console.log('   ✅ LMS call info stored successfully');
    } else {
      console.log('ℹ️ ========================================');
      console.log('ℹ️ [REGULAR CALL] Not from LMS');
      console.log('   Recording will be uploaded but NOT sent to LMS');
      console.log('ℹ️ ========================================');
      // Clean up any old LMS call data
      clearLMSCallInfo();
    }
  } catch (error: any) {
    console.error('❌ ========================================');
    console.error('❌ [ERROR] Failed to handle outgoing call');
    console.error('   Error:', error.message);
    console.error('   Type:', error.name);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.error('❌ ========================================');
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
    console.log('📤 ========================================');
    console.log('📤 [SENDING TO LMS] Attempting to send recording');
    console.log('   🎵 Recording URL:', recordingUrl);
    console.log('   ⏱️ Duration:', duration, 'seconds');
    console.log('   🆔 Recording ID:', recordingId || 'N/A');
    console.log('📤 ========================================');
        // Skip direct LMS API calls if using Edge Function (server-side approach)
    if (LMS_CONFIG.useEdgeFunction) {
      console.log('ℹ️ [EDGE FUNCTION MODE] Skipping direct LMS API call');
      console.log('   🚀 Supabase Edge Function will handle LMS notification');
      console.log('   📤 Edge Function triggered automatically via database webhook');
      console.log('   ✅ Server-to-server communication bypasses mobile network restrictions');
      clearLMSCallInfo(); // Clean up any stored data
      return true; // Return success since Edge Function will handle it
    }
        const lmsCallData = getLMSCallInfo();
    
    if (lmsCallData) {
      console.log('📊 [LMS CONTEXT] Found stored LMS call data');
      console.log('   📋 CallLog ID:', lmsCallData.callLogId);
      console.log('   👤 Lead Name:', lmsCallData.leadName);
      console.log('   🆔 Lead ID:', lmsCallData.leadId);
      console.log('   📞 Phone:', lmsCallData.phoneNumber);
      console.log('   🕒 Call Start:', lmsCallData.startTime);
      console.log('   ⏰ Stored At:', new Date(lmsCallData.timestamp).toISOString());
      
      console.log('   🚀 Calling Update LMS Recording API...');
      // Send recording URL to LMS
      const success = await updateLMSRecording(
        lmsCallData.callLogId,
        recordingUrl,
        duration,
        recordingId
      );
      
      if (success) {
        console.log('✅ ========================================');
        console.log('✅ [SUCCESS] LMS updated with recording!');
        console.log('   ✅ Recording URL saved to LMS database');
        console.log('   ✅ Sales team can now listen to this call');
        console.log('   ✅ Recording visible in lead details page');
        console.log('✅ ========================================');
        
        // Clean up after successful update
        console.log('   🧹 Cleaning up stored LMS call data...');
        clearLMSCallInfo();
        return true;
      } else {
        console.error('❌ ========================================');
        console.error('❌ [FAILED] Could not update LMS');
        console.error('   ⚠️ LMS call data will be kept for retry');
        console.error('❌ ========================================');
        // Keep the data in storage for potential retry
        return false;
      }
    } else {
      console.log('ℹ️ ========================================');
      console.log('ℹ️ [NOT LMS CALL] No LMS call data found');
      console.log('   💾 Recording saved to storage only');
      console.log('   ❌ Will NOT be sent to LMS');
      console.log('ℹ️ ========================================');
      return false;
    }
  } catch (error: any) {
    console.error('❌ ========================================');
    console.error('❌ [ERROR] Exception sending recording to LMS');
    console.error('   Error:', error.message);
    console.error('   Type:', error.name);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.error('❌ ========================================');
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
