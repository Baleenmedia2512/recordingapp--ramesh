import type { NextApiRequest, NextApiResponse } from 'next';
import { createGoogleDriveService, getGoogleDriveConfigFromEnv } from '@/lib/google-drive';
import formidable from 'formidable';
import fs from 'fs';

// Disable body parser for file upload
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResponse {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB max file size
      keepExtensions: true,
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      }
    );

    // Get the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Get file name from fields or use original name
    const fileName = Array.isArray(fields.fileName) 
      ? fields.fileName[0] 
      : fields.fileName || uploadedFile.originalFilename || 'recording.m4a';

    // Get mime type
    const mimeType = uploadedFile.mimetype || 'audio/mp4';

    // Initialize Google Drive service
    const config = getGoogleDriveConfigFromEnv();
    
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ 
        success: false, 
        error: 'Google Drive not configured. Please set up Google Drive credentials.' 
      });
    }

    const driveService = createGoogleDriveService(config);

    // Upload file to Google Drive
    const result = await driveService.uploadFile(
      uploadedFile.filepath,
      fileName,
      mimeType
    );

    // Clean up temporary file
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Upload failed',
      });
    }
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
