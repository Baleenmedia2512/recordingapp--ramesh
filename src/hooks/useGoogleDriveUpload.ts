import { useEffect, useState } from 'react';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { uploadAndSyncToLMS, filePathToBlob } from '@/services/supabaseUpload';

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
  sentToLMS?: boolean;
}

export const useGoogleDriveUpload = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
    sentToLMS: false,
  });

  /**
   * Upload a recording to Supabase Storage and optionally send to LMS
   */
  const uploadRecording = async (filePath: string, fileName: string, duration?: number) => {
    setUploadStatus({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedUrl: null,
      sentToLMS: false,
    });

    try {
      // Convert file path to blob
      const blob = await filePathToBlob(filePath);
      
      if (!blob) {
        throw new Error('Failed to read file');
      }

      // Upload to Supabase and sync to LMS, passing original file path for native optimization
      const result = await uploadAndSyncToLMS(blob, fileName, duration || 0, filePath);

      if (result.success && result.url) {
        setUploadStatus({
          isUploading: false,
          progress: 100,
          error: null,
          uploadedUrl: result.url,
          sentToLMS: result.sentToLMS,
        });
        return { url: result.url, sentToLMS: result.sentToLMS };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        error: error.message || 'Upload failed',
        uploadedUrl: null,
        sentToLMS: false,
      });
      throw error;
    }
  };

  /**
   * Upload a file from web using FormData
   */
  const uploadRecordingWeb = async (file: File, fileName?: string) => {
    setUploadStatus({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedUrl: null,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName || file.name);

      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (result.success && result.fileUrl) {
        setUploadStatus({
          isUploading: false,
          progress: 100,
          error: null,
          uploadedUrl: result.fileUrl,
        });
        return result.fileUrl;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        error: error.message || 'Upload failed',
        uploadedUrl: null,
      });
      throw error;
    }
  };

  /**
   * Reset upload status
   */
  const resetUploadStatus = () => {
    setUploadStatus({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
    });
  };

  return {
    uploadStatus,
    uploadRecording,
    uploadRecordingWeb,
    resetUploadStatus,
  };
};
