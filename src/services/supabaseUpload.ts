/**
 * Supabase Storage Upload Service
 * Handles uploading call recordings to Supabase Storage
 * and automatically sends URLs to LMS
 */

import { createClient } from '@supabase/supabase-js';
import { sendRecordingToLMS, getLMSCallInfo, clearLMSCallInfo } from './googleDriveService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { isOnline, canReach } from '@/lib/network';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

// Debug: Log environment variables
console.log('🔍 [supabaseUpload.ts] Supabase URL:', SUPABASE_URL || 'MISSING');
console.log('🔍 [supabaseUpload.ts] Supabase Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');
console.log('🔍 [supabaseUpload.ts] Platform:', Capacitor.getPlatform());
console.log('🔍 [supabaseUpload.ts] Native Platform:', Capacitor.isNativePlatform());

// Initialize Supabase client with proper configuration for Capacitor
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'call-monitor-android',
    },
    fetch: (url, options = {}) => {
      console.log('📡 Fetch request to:', url);
      // Add timeout and proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
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
 * Native HTTP upload for Android using OkHttp with DNS over HTTPS
 * This bypasses Android's broken system DNS resolver
 */
async function uploadFileNative(
  bucketName: string,
  filePath: string,
  fileBlob: Blob,
  originalFilePath?: string
): Promise<{ data: any; error: any }> {
  try {
    console.log('📱 Using native OkHttp upload with DNS over HTTPS...');
    
    // If we have the original file path, use the native plugin directly
    // This avoids converting to/from base64 and uses OkHttp with DoH
    if (originalFilePath) {
      console.log('📤 Using native plugin upload with DoH...');
      console.log('📁 Original file path:', originalFilePath);
      
      // Strip file:// prefix if present - native plugin expects raw path
      let nativePath = originalFilePath;
      if (nativePath.startsWith('file://')) {
        nativePath = nativePath.substring(7);
      }
      console.log('📁 Native path (stripped):', nativePath);
      
      // Extract just the filename from the filePath
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const storagePath = pathParts.slice(0, -1).join('/');
      
      try {
        const result = await CallMonitor.uploadToSupabase({
          filePath: nativePath,  // Use stripped path
          fileName: fileName,
          bucketName: bucketName,
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_ANON_KEY,
          storagePath: storagePath,
        });
        
        console.log('✅ Native plugin upload result:', result);
        
        if (result.success) {
          return {
            data: { path: result.path },
            error: null,
          };
        } else {
          return {
            data: null,
            error: { message: 'Native upload returned unsuccessful' },
          };
        }
      } catch (pluginError: any) {
        console.error('❌ Native plugin error:', pluginError);
        // Fall through to CapacitorHttp as fallback
        console.log('⚠️ Falling back to CapacitorHttp...');
      }
    }
    
    // Fallback: use CapacitorHttp (may have DNS issues but try anyway)
    
    // Convert Blob to ArrayBuffer then to base64
    const arrayBuffer = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
    console.log('📡 Native upload to:', url);
    console.log('📦 Upload size:', Math.round(base64Data.length / 1024), 'KB (base64)');
    
    const response = await CapacitorHttp.request({
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert': 'false',
      },
      data: base64Data,
    });
    
    console.log('📱 Native upload response status:', response.status);
    
    if (response.status >= 200 && response.status < 300) {
      return {
        data: { path: filePath },
        error: null,
      };
    } else {
      return {
        data: null,
        error: {
          message: `Upload failed with status ${response.status}: ${JSON.stringify(response.data)}`,
        },
      };
    }
  } catch (error: any) {
    console.error('❌ Native upload error:', error);
    
    // Check for DNS resolution errors
    if (error.message?.includes('Unable to resolve host') || 
        error.message?.includes('UnknownHostException') ||
        error.message?.includes('No address associated with hostname')) {
      console.error('🔴 DNS RESOLUTION FAILED');
      console.error('📱 Device DNS is not configured properly');
      console.error('💡 Solution: Go to WiFi settings and set DNS to 8.8.8.8');
      
      return {
        data: null,
        error: {
          message: 'DNS error: Cannot resolve cloud storage hostname',
          code: 'DNS_RESOLUTION_FAILED',
        },
      };
    }
    
    return {
      data: null,
      error: {
        message: error.message || 'Native upload failed',
      },
    };
  }
}

/**
 * Upload recording file to Supabase Storage
 * @param file - File object or blob to upload
 * @param fileName - Name for the file
 * @param bucketName - Storage bucket name (default: 'recordings')
 * @param originalFilePath - Original file path on device (for native upload optimization)
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
    if (originalFilePath) {
      console.log('📁 Original file path available:', originalFilePath);
    }

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
      
      // Also check if we can reach Supabase specifically
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

    // Skip bucket check on native - just try upload directly
    // The upload will fail with a clear error if bucket doesn't exist
    if (!Capacitor.isNativePlatform()) {
      // Only check bucket on web
      try {
        await ensureBucketExists(bucketName);
      } catch (bucketError: any) {
        // If it's not a network error, fail
        if (!bucketError.message?.includes('fetch') && !bucketError.message?.includes('network')) {
          console.error('❌ Bucket error:', bucketError);
          return {
            success: false,
            error: bucketError.message || 'Storage bucket not configured.',
          };
        }
        // Network error - continue with upload attempt
        console.warn('⚠️ Skipping bucket check due to network issue, attempting upload...');
      }
    } else {
      console.log('📱 Native platform - skipping bucket check, will try upload directly');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const filePath = `call-recordings/${uniqueFileName}`;

    console.log('📁 Uploading to path:', filePath);

    // Upload file to Supabase Storage with retry
    let uploadError: any = null;
    let uploadData: any = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`📤 Upload attempt ${attempt}/3...`);
      
      try {
        let data: any, error: any;
        
        // Use native HTTP on Android to bypass CORS
        if (Capacitor.isNativePlatform()) {
          const result = await uploadFileNative(bucketName, filePath, file, originalFilePath);
          data = result.data;
          error = result.error;
        } else {
          // Use regular Supabase SDK on web
          const fetchController = new AbortController();
          const timeoutId = setTimeout(() => fetchController.abort(), 25000);
          
          const result = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
              upsert: false,
            });
          
          clearTimeout(timeoutId);
          data = result.data;
          error = result.error;
        }

        if (!error) {
          uploadData = data;
          uploadError = null;
          break;
        }
        
        uploadError = error;
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, error.message);
      } catch (abortError: any) {
        if (abortError.name === 'AbortError') {
          uploadError = new Error('Upload timeout - network too slow or unavailable');
          console.warn(`⏱️ Upload attempt ${attempt} timed out`);
        } else {
          uploadError = abortError;
          console.warn(`⚠️ Upload attempt ${attempt} error:`, abortError.message);
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < 3) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (uploadError) {
      console.error('❌ Supabase upload error after 3 attempts:', uploadError);
      
      // Provide helpful error messages
      let errorMessage = uploadError.message;
      
      // Check for DNS resolution errors
      if (errorMessage.includes('Unable to resolve host') || 
          errorMessage.includes('UnknownHostException') ||
          errorMessage.includes('No address associated with hostname')) {
        errorMessage = '🌐 DNS Error: Cannot reach cloud storage.\n\n' +
                      '📱 Fix on device:\n' +
                      '1. Settings → WiFi → Modify Network\n' +
                      '2. Advanced → Static IP\n' +
                      '3. DNS 1: 8.8.8.8\n' +
                      '4. DNS 2: 8.8.4.4\n\n' +
                      'Recording saved locally.';
        console.error('🔴 DNS RESOLUTION FAILED - Device cannot resolve Supabase domain');
        console.error('📱 SOLUTION: Configure device DNS to 8.8.8.8 (Google DNS)');
      } else if (errorMessage.includes('not found')) {
        errorMessage = '🪣 Storage bucket "recordings" not found';
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        errorMessage = '🔒 Permission denied. Check bucket policies.';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = '📵 Network error. Recording saved locally. Will retry on next sync.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log('✅ File uploaded to Supabase:', uploadData.path);

    // Get public URL for the uploaded file
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
 * Ensure storage bucket exists, create if not
 * Returns true if bucket exists or check should be skipped
 */
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    let data: any, error: any;
    
    // Use native HTTP on Android to bypass CORS
    if (Capacitor.isNativePlatform()) {
      const url = `${SUPABASE_URL}/storage/v1/bucket`;
      console.log('📱 Native bucket check:', url);
      
      try {
        const response = await CapacitorHttp.get({
          url,
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        
        if (response.status >= 200 && response.status < 300) {
          data = response.data;
          error = null;
        } else {
          error = { message: `Bucket check failed with status ${response.status}` };
        }
      } catch (nativeError: any) {
        console.warn('⚠️ Native bucket check error, will attempt upload anyway:', nativeError.message);
        return true; // Skip check on native, try upload anyway
      }
    } else {
      // Use regular Supabase SDK on web
      const result = await supabase.storage.listBuckets();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Error checking buckets:', error);
      
      // If it's a network error, skip bucket check and try upload anyway
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        console.warn('⚠️ Network error checking bucket, will attempt upload anyway');
        return true; // Skip check, try upload
      }
      
      throw new Error(`Bucket check failed: ${error.message}`);
    }
    
    if (!data) {
      console.warn('⚠️ No buckets returned, will attempt upload anyway');
      return true; // Skip check, try upload
    }

    // Check if bucket exists
    const buckets = Array.isArray(data) ? data : [];
    console.log('📋 Available buckets:', JSON.stringify(buckets.map((b: any) => b.name || b.id || b)));
    console.log('🔍 Looking for bucket:', bucketName);
    
    // Check by name or id (Supabase sometimes uses different field names)
    const bucketExists = buckets?.some((b: any) => 
      b.name === bucketName || b.id === bucketName || b === bucketName
    );

    if (!bucketExists) {
      console.warn('⚠️ Bucket does not exist:', bucketName, 'Available:', buckets.map((b: any) => b.name || b.id));
      throw new Error(`Storage bucket "${bucketName}" not found. Please create it in Supabase Dashboard.`);
    } else {
      console.log('✅ Bucket already exists');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error in ensureBucketExists:', error);
    
    // If it's a network error, return true to attempt upload anyway
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
  originalFilePath?: string
): Promise<{ success: boolean; sentToLMS: boolean; url?: string }> {
  try {
    // 1. Upload to Supabase
    const uploadResult = await uploadRecordingToSupabase(file, fileName, 'recordings', originalFilePath);

    if (!uploadResult.success || !uploadResult.publicUrl) {
      return {
        success: false,
        sentToLMS: false,
      };
    }

    // 2. Check if this was an LMS call
    const lmsCallInfo = getLMSCallInfo();

    if (!lmsCallInfo) {
      console.log('ℹ️ Not an LMS call - recording uploaded to Supabase only');
      return {
        success: true,
        sentToLMS: false,
        url: uploadResult.publicUrl,
      };
    }

    // 3. Send to LMS
    console.log('📨 Sending recording to LMS...');
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
    return {
      success: false,
      sentToLMS: false,
    };
  }
}

/**
 * Convert local file path to File object for upload
 * For use with Capacitor/native file system
 */
export async function filePathToBlob(filePath: string): Promise<Blob | null> {
  try {
    const response = await fetch(filePath);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('❌ Error converting file to blob:', error);
    return null;
  }
}
