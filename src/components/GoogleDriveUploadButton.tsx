import React from 'react';
import { useGoogleDriveUpload } from '@/hooks/useGoogleDriveUpload';
import { CallLog } from '@/types';

interface GoogleDriveUploadButtonProps {
  recording: {
    filePath: string;
    fileName: string;
  };
  onUploadComplete?: (url: string) => void;
}

export const GoogleDriveUploadButton: React.FC<GoogleDriveUploadButtonProps> = ({
  recording,
  onUploadComplete,
}) => {
  const { uploadStatus, uploadRecording, resetUploadStatus } = useGoogleDriveUpload();

  const handleUpload = async () => {
    try {
      const result = await uploadRecording(recording.filePath, recording.fileName);
      if (result && result.url && onUploadComplete) {
        onUploadComplete(result.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleUpload}
        disabled={uploadStatus.isUploading}
        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors ${
          uploadStatus.isUploading
            ? 'bg-gray-300 cursor-not-allowed'
            : uploadStatus.uploadedUrl
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {uploadStatus.isUploading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Uploading...</span>
          </>
        ) : uploadStatus.uploadedUrl ? (
          <>
            <span>✓</span>
            <span>Uploaded to Drive</span>
          </>
        ) : (
          <>
            <span>☁️</span>
            <span>Upload to Google Drive</span>
          </>
        )}
      </button>

      {uploadStatus.error && (
        <div className="text-red-500 text-sm flex items-center gap-1">
          <span>❌</span>
          <span>{uploadStatus.error}</span>
        </div>
      )}

      {uploadStatus.uploadedUrl && (
        <a
          href={uploadStatus.uploadedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 text-sm hover:underline flex items-center gap-1"
        >
          <span>🔗</span>
          <span>View in Google Drive</span>
        </a>
      )}
    </div>
  );
};
