import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

export class GoogleDriveService {
  private oauth2Client: any;
  private drive: any;
  private folderId: string | undefined;

  constructor(config: GoogleDriveConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    if (config.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken,
      });
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Set credentials manually
   */
  setCredentials(credentials: any) {
    this.oauth2Client.setCredentials(credentials);
  }

  /**
   * Create or get the Call Recordings folder
   */
  async getOrCreateFolder(folderName: string = 'Call Recordings'): Promise<string> {
    if (this.folderId) {
      return this.folderId;
    }

    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        this.folderId = response.data.files[0].id;
        return this.folderId!;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });

      this.folderId = folder.data.id;
      return this.folderId!;
    } catch (error: any) {
      console.error('Error creating/getting folder:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string = 'audio/mp4'
  ): Promise<UploadResult> {
    try {
      const folderId = await this.getOrCreateFolder();

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      return {
        success: true,
        fileId: response.data.id,
        fileUrl: response.data.webViewLink || response.data.webContentLink,
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload file from buffer (useful for web/mobile)
   */
  async uploadFileFromBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string = 'audio/mp4'
  ): Promise<UploadResult> {
    try {
      const folderId = await this.getOrCreateFolder();

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: buffer,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      return {
        success: true,
        fileId: response.data.id,
        fileUrl: response.data.webViewLink || response.data.webContentLink,
      };
    } catch (error: any) {
      console.error('Error uploading file from buffer:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List files in the Call Recordings folder
   */
  async listFiles(pageSize: number = 100): Promise<any[]> {
    try {
      const folderId = await this.getOrCreateFolder();

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        pageSize: pageSize,
        fields: 'files(id, name, size, createdTime, modifiedTime, webViewLink)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error: any) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, size, createdTime, modifiedTime, webViewLink, webContentLink',
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string, destinationPath: string): Promise<boolean> {
    try {
      const dest = fs.createWriteStream(destinationPath);
      const response = await this.drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => resolve(true))
          .on('error', (err: any) => reject(err))
          .pipe(dest);
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      return false;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<any> {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota',
      });

      return response.data.storageQuota;
    } catch (error: any) {
      console.error('Error getting storage quota:', error);
      return null;
    }
  }
}

// Helper function to create service instance
export function createGoogleDriveService(
  config: GoogleDriveConfig
): GoogleDriveService {
  return new GoogleDriveService(config);
}

// Helper function to get config from environment
export function getGoogleDriveConfigFromEnv(): GoogleDriveConfig {
  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  };
}
