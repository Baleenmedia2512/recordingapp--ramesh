/**
 * Supabase Storage Upload Service
 * REFACTORED: Uses 100% native Android upload via CallMonitorPlugin
 * No WebView fetch, no blob conversion, no XMLHttpRequest - fully native!
 * 
 * Features:
 * - Direct file read from native storage
 * - OkHttp with DNS-over-HTTPS
 * - Automatic retry with exponential backoff
 * - Bypasses all WebView networking issues
 * - Upload queue for automatic retry on failure
 */

import { createClient } from '@supabase/supabase-js';
import { sendRecordingToLMS, getLMSCallInfo, clearLMSCallInfo } from './googleDriveService';
import { updateLMSRecording } from './lmsApi';
import { checkLMSContext, clearLMSContext } from './lmsHttpServer';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';
import { Capacitor } from '@capacitor/core';
import { isOnline, canReach } from '@/lib/network';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { addToQueue } from './uploadQueue';

// Debug: Log environment variables
console.log('🔍 [supabaseUpload.ts] Supabase URL:', SUPABASE_URL || 'MISSING');
console.log('🔍 [supabaseUpload.ts] Supabase Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');
console.log('🔍 [supabaseUpload.ts] Platform:', Capacitor.getPlatform());
console.log('🔍 [supabaseUpload.ts] Native Platform:', Capacitor.isNativePlatform());

// Initialize Supabase client (only for web platform and metadata operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'call-monitor-android',
    },
  },
});

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
  publicUrl?: string;
}

/**
 * Upload recording file to Supabase Storage
 * NATIVE ANDROID: Calls native plugin directly - no WebView involvement!
 * WEB: Falls back to Supabase JS SDK
 * 
 * @param file - File object or blob (ONLY used on web platform)
 * @param fileName - Name for the file
 * @param bucketName - Storage bucket name (default: 'recordings')
 * @param originalFilePath - REQUIRED for native: Original file path on device storage
 * @returns Upload result with public URL
 */
export async function uploadRecordingToSupabase(
  file: File | Blob,
  fileName: string,
  bucketName: string = 'recordings',
  originalFilePath?: string
): Promise<UploadResult> {
  try {
    console.log('📤 Starting Supabase upload...', fileName);
    console.log('📱 Platform:', Capacitor.getPlatform());
    console.log('📁 Original file path:', originalFilePath || 'NOT PROVIDED');

    // Check Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const errorMsg = 'Supabase not configured. Please add credentials to .env.local';
      console.error('❌', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
    
    // Check network connectivity on native platforms
    if (Capacitor.isNativePlatform()) {
      const online = await isOnline();
      if (!online) {
        console.warn('⚠️ No network connectivity detected');
        return {
          success: false,
          error: '📵 No internet connection. Recording saved locally.',
        };
      }
      
      // Quick reachability check (don't wait too long)
      const canReachSupabase = await canReach(SUPABASE_URL, 5000);
      if (!canReachSupabase) {
        console.warn('⚠️ Cannot reach Supabase server');
        return {
          success: false,
          error: '🌐 Cannot connect to cloud storage. Recording saved locally.',
        };
      }
      
      console.log('✅ Network connectivity verified');
    }

    // ============================================================
    // NATIVE ANDROID/iOS: Use 100% native upload (NO WEBVIEW!)
    // ============================================================
    if (Capacitor.isNativePlatform() && originalFilePath) {
      console.log('🚀 Using NATIVE upload (bypassing WebView completely)');
      console.log('📁 Reading file directly from:', originalFilePath);
      
      try {
        const result = await CallMonitor.uploadToSupabase({
          filePath: originalFilePath,
          fileName: fileName,
          bucketName: bucketName,
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_ANON_KEY,
          storagePath: 'call-recordings',
        });
        
        console.log('✅ Native upload result:', result);
        
        if (result.success && result.publicUrl) {
          return {
            success: true,
            fileUrl: result.publicUrl,
            publicUrl: result.publicUrl,
          };
        } else {
          throw new Error('Native upload failed: No public URL returned');
        }
        
      } catch (nativeError: any) {
        console.error('❌ Native upload error:', nativeError);
        
        // Parse native error message for user-friendly display
        let errorMessage = nativeError.message || 'Native upload failed';
        
        if (errorMessage.includes('DNS error') || errorMessage.includes('DNS_RESOLUTION_FAILED')) {
          errorMessage = '🌐 DNS Error: Cannot reach cloud storage.\n\n' +
                        '📱 Fix on device:\n' +
                        '1. Settings → WiFi → Modify Network\n' +
                        '2. Advanced → Static IP\n' +
                        '3. DNS 1: 8.8.8.8\n' +
                        '4. DNS 2: 8.8.4.4\n\n' +
                        'Recording saved locally.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
          errorMessage = '⏱️ Upload timeout. Network too slow or unstable. Recording saved locally.';
        } else if (errorMessage.includes('File not found')) {
          errorMessage = '📁 Recording file not found. May have been deleted.';
        } else if (errorMessage.includes('Permission denied')) {
          errorMessage = '🔒 Permission denied. Check app storage permissions.';
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          errorMessage = '🪣 Storage bucket "recordings" not found. Check Supabase configuration.';
        } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
          errorMessage = '🔒 Permission denied. Check bucket policies in Supabase Dashboard.';
        } else if (errorMessage.includes('Network error') || errorMessage.includes('NETWORK_ERROR')) {
          errorMessage = '📵 Network error. Recording saved locally.';
        }
        
        // Add to upload queue for automatic retry (excluding file not found errors)
        if (!errorMessage.includes('File not found') && originalFilePath) {
          console.log('📋 Adding failed upload to retry queue...');
          try {
            await addToQueue({
              filePath: originalFilePath,
              fileName: fileName,
              duration: 0, // Will be updated if available
              fileSize: file.size || 0,
            });
            console.log('✅ Added to upload queue for automatic retry');
          } catch (queueError) {
            console.error('❌ Failed to add to queue:', queueError);
          }
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }
    }
    
    // ============================================================
    // WEB PLATFORM: Use Supabase JS SDK (only for web)
    // ============================================================
    console.log('🌐 Using WEB upload (Supabase JS SDK)');
    
    // Check if blob/file is valid
    if (!file || file.size === 0) {
      console.error('❌ Invalid file/blob for upload');
      return {
        success: false,
        error: 'Invalid file data',
      };
    }
    
    console.log('📦 File size:', file.size, 'bytes');
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const filePath = `call-recordings/${uniqueFileName}`;

    console.log('📁 Uploading to path:', filePath);

    // Determine MIME type
    const mimeType = fileName.endsWith('.m4a') ? 'audio/mp4' :
                     fileName.endsWith('.mp3') ? 'audio/mpeg' :
                     fileName.endsWith('.wav') ? 'audio/wav' :
                     fileName.endsWith('.3gp') ? 'audio/3gpp' :
                     fileName.endsWith('.amr') ? 'audio/amr' :
                     'audio/mp4';

    // Upload using Supabase SDK
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ File uploaded to Supabase:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', publicUrl);

    return {
      success: true,
      fileUrl: publicUrl,
      publicUrl: publicUrl,
    };
    
  } catch (error: any) {
    console.error('❌ Supabase upload failed:', error);
    
    // Provide user-friendly error message
    let errorMessage = error.message || 'Upload failed';
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      errorMessage = '📵 Network error or timeout. Recording saved locally.';
    } else if (errorMessage.includes('bucket')) {
      errorMessage = '🪣 Storage not configured properly.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Ensure storage bucket exists (for web platform only)
 * Native platforms skip this check - upload will fail with clear error if bucket missing
 */
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if bucket exists:', bucketName);
    
    const result = await supabase.storage.listBuckets();
    const data = result.data;
    const error = result.error;

    if (error) {
      console.warn('⚠️ Error checking buckets (non-fatal):', error);
      return true; // Skip check, attempt upload anyway
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ No bucket data returned');
      return true; // Skip check, attempt upload anyway
    }

    const bucketExists = data.some((b: any) => 
      b.name === bucketName || b.id === bucketName
    );

    if (!bucketExists) {
      console.warn('⚠️ Bucket does not exist:', bucketName);
      throw new Error(`Storage bucket "${bucketName}" not found. Please create it in Supabase Dashboard.`);
    }
    
    console.log('✅ Bucket exists');
    return true;
    
  } catch (error: any) {
    console.error('❌ Error checking bucket:', error);
    // If network error, allow upload attempt anyway
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return true;
    }
    throw error;
  }
}

/**
 * Upload recording and send to LMS automatically
 * This is the main function to call after recording completes
 * @param file - Recording file
 * @param fileName - Recording filename  
 * @param duration - Call duration in seconds
 * @param originalFilePath - Original file path on device (for native upload optimization)
 * @returns Result with LMS sync status
 */
export async function uploadAndSyncToLMS(
  file: File | Blob,
  fileName: string,
  duration: number,
  originalFilePath?: string,
  phoneNumber?: string
): Promise<{ success: boolean; sentToLMS: boolean; url?: string }> {
  console.log('📋 uploadAndSyncToLMS called with:');
  console.log('   fileName:', fileName);
  console.log('   duration:', duration);
  console.log('   originalFilePath:', originalFilePath);
  console.log('   phoneNumber:', phoneNumber);
  console.log('   blob size:', file.size, 'bytes');
  
  try {
    // 1. Upload to Supabase
    console.log('1️⃣ Calling uploadRecordingToSupabase...');
    const uploadResult = await uploadRecordingToSupabase(file, fileName, 'recordings', originalFilePath);
    console.log('1️⃣ uploadRecordingToSupabase returned:', JSON.stringify(uploadResult));

    if (!uploadResult.success || !uploadResult.publicUrl) {
      console.error('❌ Upload failed or no public URL:', uploadResult);
      return {
        success: false,
        sentToLMS: false,
      };
    }

    console.log('✅ Upload successful! URL:', uploadResult.publicUrl);

    // 2️⃣ NEW: Check for proactive LMS context first
    let lmsCallInfo = null;
    let lmsContext = null;
    
    if (phoneNumber) {
      lmsContext = checkLMSContext(phoneNumber);
      console.log('2️⃣ Checking for LMS call info...');
      console.log('🔍 [STORAGE] Retrieving LMS call info from localStorage');
    }
    
    if (lmsContext) {
      console.log('🏢 Found LMS context from proactive integration!', {
        callId: lmsContext.lmsCallId,
        customer: lmsContext.customerName,
        phone: lmsContext.phoneNumber
      });
      
      // Send directly to LMS using new approach
      const sentToLMS = await updateLMSRecording(
        lmsContext.lmsCallId,
        uploadResult.publicUrl,
        duration,
        fileName, // recordingAppCallId
        phoneNumber // for context cleanup
      );
      
      if (sentToLMS) {
        console.log('✅ LMS updated with recording URL via proactive integration!');
      } else {
        console.error('❌ Failed to update LMS via proactive integration');
      }
      
      return {
        success: true,
        sentToLMS,
        url: uploadResult.publicUrl,
      };
    }
    
    // 3️⃣ FALLBACK: Check legacy LMS call info
    console.log('   ℹ️ No LMS call data found in localStorage');
    lmsCallInfo = getLMSCallInfo();

    if (!lmsCallInfo) {
      console.log('ℹ️ Not an LMS call - recording uploaded to Supabase only');
      return {
        success: true,
        sentToLMS: false,
        url: uploadResult.publicUrl,
      };
    }

    // 4️⃣ Legacy LMS integration (fallback)
    console.log('4️⃣ Sending recording to LMS (legacy)...');
    console.log('   CallLog ID:', lmsCallInfo.callLogId);
    console.log('   Lead:', lmsCallInfo.leadName);
    console.log('   Recording URL:', uploadResult.publicUrl);

    const sentToLMS = await sendRecordingToLMS(
      uploadResult.publicUrl,
      duration,
      fileName
    );

    if (sentToLMS) {
      console.log('✅ LMS updated with recording URL!');
      clearLMSCallInfo();
    } else {
      console.error('❌ Failed to update LMS');
    }

    return {
      success: true,
      sentToLMS,
      url: uploadResult.publicUrl,
    };
  } catch (error: any) {
    console.error('❌ Error in uploadAndSyncToLMS:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      sentToLMS: false,
    };
  }
}

/**
 * Convert local file path to Blob (DEPRECATED - only for web)
 * Native platforms now use direct file path upload via native plugin
 */
export async function filePathToBlob(filePath: string): Promise<Blob | null> {
  console.warn('⚠️ filePathToBlob is deprecated for native platforms');
  console.warn('⚠️ Use CallMonitor.uploadToSupabase with file path directly');
  
  try {
    const response = await fetch(filePath);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('❌ Error converting file to blob:', error);
    return null;
  }
}
