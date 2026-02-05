# 📦 Google Drive Package Update

## New Dependencies Added

The following packages have been installed for Google Drive integration:

### Production Dependencies
- `googleapis` (^134.0.0) - Official Google APIs Node.js client
- `@google-cloud/local-auth` (^3.0.1) - Google OAuth2 local authentication
- `formidable` (^3.5.1) - File upload parsing for multipart/form-data

### Development Dependencies
- `@types/formidable` (^3.4.5) - TypeScript types for formidable

---

## Package Details

### googleapis
Official Node.js client library for accessing Google APIs including Google Drive API.

**Features:**
- Google Drive API v3 support
- OAuth2 authentication
- File upload/download
- Folder management
- Storage quota management

### @google-cloud/local-auth
Simplified OAuth2 authentication for Google Cloud APIs.

**Features:**
- Easy OAuth2 flow setup
- Token management
- Refresh token handling

### formidable
A Node.js module for parsing form data, especially file uploads.

**Features:**
- Multipart/form-data parsing
- File upload handling
- Configurable file size limits
- Stream support

---

## Installation

These packages have already been installed. To reinstall them:

```bash
npm install googleapis @google-cloud/local-auth formidable
npm install --save-dev @types/formidable
```

---

## Security Notes

⚠️ **Important**: Never commit Google API credentials to version control!

The following should remain in `.env.local` (already gitignored):
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`

---

## Usage

See [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) for complete setup instructions.

---

## Package.json Changes

The following have been added to `package.json`:

```json
{
  "dependencies": {
    "@google-cloud/local-auth": "^3.0.1",
    "googleapis": "^134.0.0",
    "formidable": "^3.5.1"
  },
  "devDependencies": {
    "@types/formidable": "^3.4.5"
  }
}
```

---

## File Structure

New files created for Google Drive integration:

```
src/
├── lib/
│   └── google-drive.ts              # Google Drive service
├── hooks/
│   └── useGoogleDriveUpload.ts      # React hook for uploads
├── components/
│   └── GoogleDriveUploadButton.tsx  # Upload button component
└── pages/
    └── api/
        └── recordings/
            ├── upload.ts             # Upload API endpoint
            └── google-auth.ts        # OAuth authentication

docs/
├── GOOGLE_DRIVE_SETUP.md            # Setup guide
├── GOOGLE_DRIVE_USAGE.md            # Usage guide
└── GOOGLE_DRIVE_PACKAGES.md         # This file
```

---

## API Endpoints Created

### POST /api/recordings/upload
Uploads a recording file to Google Drive.

**Request:** Multipart form data with file
**Response:** File URL and ID

### GET /api/recordings/google-auth
OAuth2 authentication flow for Google Drive.

**Query params:** `code` (optional, for callback)
**Response:** Auth URL or tokens

---

## Capacitor Plugin Method Added

New method added to `CallMonitorPlugin`:

```typescript
uploadRecordingToDrive(options: {
  filePath: string;
  fileName: string;
}): Promise<{ 
  success: boolean; 
  fileUrl?: string; 
  error?: string;
}>;
```

---

## Version Compatibility

- Node.js: ≥ 16.x
- Next.js: 14.1.0
- React: 18.2.0

All packages are compatible with the current project setup.

---

## Troubleshooting

### Installation Issues

If you encounter issues during installation:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

If TypeScript shows errors:

```bash
# Regenerate type definitions
npm run type-check
```

### Build Errors

If build fails:

```bash
# Clean build and rebuild
rm -rf .next
npm run build
```

---

## Support

For package-specific issues:
- googleapis: https://github.com/googleapis/google-api-nodejs-client
- formidable: https://github.com/node-formidable/formidable

For integration issues, see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)
