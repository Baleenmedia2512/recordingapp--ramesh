/**
 * Supabase Storage Upload Service
 * Handles uploading call recordings to Supabase Storage
 * and automatically sends URLs to LMS
 */

import { createClient } from '@supabase/supabase-js';
import { sendRecordingToLMS, getLMSCallInfo, clearLMSCallInfo } from './googleDriveService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

// Debug: Log environment variables
console.log('🔍 [supabaseUpload.ts] Supabase URL:', SUPABASE_URL || 'MISSING');
console.log('🔍 [supabaseUpload.ts] Supabase Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
  publicUrl?: string;
}

/**
 * Upload recording file to Supabase Storage
 * @param file - File object or blob to upload
 * @param fileName - Name for the file
 * @param bucketName - Storage bucket name (default: 'recordings')
 * @returns Upload result with public URL
 */
export async function uploadRecordingToSupabase(
  file: File | Blob,
  fileName: string,
  bucketName: string = 'recordings'
): Promise<UploadResult> {
  try {
    console.log('📤 Starting Supabase upload...', fileName);

    // Ensure bucket exists (create if not)
    await ensureBucketExists(bucketName);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const filePath = `call-recordings/${uniqueFileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: 'audio/mpeg', // Adjust based on your recording format
        cacheControl: '3600',
        upsert: false, // Create new file, don't overwrite
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ File uploaded to Supabase:', data.path);

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
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Ensure storage bucket exists, create if not
 */
async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    // Try to get bucket
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error checking buckets:', error);
      return;
    }

    // Check if bucket exists
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      console.log('📁 Creating bucket:', bucketName);

      // Create bucket with public access
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['audio/mpeg', 'audio/m4a', 'audio/mp3', 'audio/wav', 'audio/aac'],
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
      } else {
        console.log('✅ Bucket created successfully');
      }
    } else {
      console.log('✅ Bucket already exists');
    }
  } catch (error) {
    console.error('❌ Error in ensureBucketExists:', error);
  }
}

/**
 * Upload recording and send to LMS automatically
 * This is the main function to call after recording completes
 * @param file - Recording file
 * @param fileName - Recording filename  
 * @param duration - Call duration in seconds
 * @returns Result with LMS sync status
 */
export async function uploadAndSyncToLMS(
  file: File | Blob,
  fileName: string,
  duration: number
): Promise<{ success: boolean; sentToLMS: boolean; url?: string }> {
  try {
    // 1. Upload to Supabase
    const uploadResult = await uploadRecordingToSupabase(file, fileName);

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
