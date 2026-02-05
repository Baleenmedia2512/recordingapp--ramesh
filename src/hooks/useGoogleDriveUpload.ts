import { useEffect, useState } from 'react';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
}

export const useGoogleDriveUpload = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
  });

  /**
   * Upload a recording to Google Drive
   */
  const uploadRecording = async (filePath: string, fileName: string) => {
    setUploadStatus({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedUrl: null,
    });

    try {
      // Use the native plugin method
      const result = await CallMonitor.uploadRecordingToDrive({
        filePath,
        fileName,
      });

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
