# Lead Management After Call Implementation

## ✅ Implementation Complete!

This implementation adds automatic lead management after call ends, checking phone numbers across Android Contacts, Local Leads Database, and External LMS.

## 🎯 Workflow

```
1. Call Starts → Dialer Opens
         ↓
2. Call Monitor Detects → Starts Monitoring
         ↓
3. Call Ends → Recording Detected
         ↓
4. Upload to DB/LMS ✅ (existing)
         ↓
5. **NEW: Check Phone Number**
   - Check Android Contacts
   - Check LMS Database (via API)
   - Check leads_metadata Table
         ↓
6. **Show Appropriate Notification:**
   - NOT FOUND anywhere → "Add as Lead and Contact?"
   - Found in leads, NOT in contacts → "Add to Contacts?"
   - Found in contacts, NOT in LMS → "Add to LMS?"
   - Found in both contacts and LMS → "Already available ✓"
         ↓
7. **User Clicks Notification** → Opens AddLeadForm
         ↓
8. **User Fills Form:**
   - Name (required)
   - Company
   - Email
   - Designation
   - Notes
   - Checkboxes for: Add to Contacts / Save to Leads / Sync to LMS
         ↓
9. **Save:**
   - ✅ Add to Android Contacts (if checked)
   - ✅ Save to leads_metadata table (if checked)
   - ✅ Sync to External LMS (if checked)
```

## 📁 Files Created

### Database
- **`supabase/migrations/create_leads_metadata_table.sql`**
  - New table for storing local leads
  - Fields: phone, name, company, email, designation, notes, sync status

### Services
- **`src/services/phoneNumberLookup.ts`**
  - Comprehensive lookup across all 3 sources
  - Handles phone normalization
  - Returns unified lookup result

- **`src/services/leadsMetadataService.ts`**
  - CRUD operations for leads_metadata table
  - Mark leads as synced/in contacts

- **`src/services/androidContacts.ts`**
  - Check if phone exists in Android contacts
  - Add contacts to Android contact book

- **`src/services/leadNotificationService.ts`**
  - Show notifications based on lookup results
  - Handle notification actions

- **`src/services/leadActionService.ts`**
  - Save leads to all destinations
  - Handle errors gracefully

### Components & Hooks
- **`src/components/AddLeadForm.tsx`**
  - Beautiful form for adding lead information
  - Pre-fills data from lookup results
  - Validates inputs

- **`src/hooks/useLeadManagement.ts`**
  - Complete lead management workflow
  - State management for form display
  - Integration with all services

### Types
- **`src/types/index.ts`** (updated)
  - `LeadMetadata` interface
  - `PhoneNumberLookupResult` interface
  - `AddLeadFormData` interface

### Integrations
- **`src/hooks/useCallLogs.ts`** (updated)
  - Triggers phone lookup after upload
  - Shows notifications

- **`src/components/Dashboard.tsx`** (updated)
  - Renders AddLeadForm modal
  - Integrates useLeadManagement hook

## 🗄️ Database Table

### `leads_metadata` Table Structure

```sql
id                UUID PRIMARY KEY
user_id           UUID (references auth.users)
phone_number      TEXT NOT NULL
contact_name      TEXT NOT NULL
company           TEXT
email             TEXT
designation       TEXT
notes             TEXT
is_synced_to_lms  BOOLEAN (default: false)
lms_lead_id       TEXT (external LMS ID)
is_in_contacts    BOOLEAN (default: false)
created_at        TIMESTAMP
updated_at        TIMESTAMP

UNIQUE(user_id, phone_number)
```

## 🚀 How to Deploy

### 1. Run Database Migration

```bash
# In Supabase Dashboard → SQL Editor, run:
supabase/migrations/create_leads_metadata_table.sql
```

Or if using Supabase CLI:

```bash
supabase db push
```

### 2. Install Required Packages

The implementation uses these Capacitor plugins:

```bash
npm install @capacitor-community/contacts
npm install @capacitor/local-notifications
npm install @capacitor/toast
```

### 3. Update AndroidManifest.xml

Add permissions:

```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 4. Rebuild the App

```bash
npm run build
npx cap sync
```

### 5. Build APK

```bash
cd android
./gradlew assembleDebug
```

## 📊 How It Works

### After Each Call:

1. **Recording uploads** → `useCallLogs` detects completion
2. **Phone lookup** → Checks all 3 sources in parallel
3. **Notification** → Shows based on where phone was found
4. **User action** → Opens AddLeadForm with pre-filled data
5. **Save** → Saves to selected destinations

### Lookup Logic:

| Found In | Notification Action |
|----------|---------------------|
| Nowhere | "Add as Lead and Contact?" |
| Only Leads | "Add to Contacts?" |
| Only Contacts | "Add to LMS?" |
| Only LMS | "Add to Contacts?" |
| Leads + Contacts | "Sync to LMS?" |
| Contacts + LMS | "Already available ✓" |

## 🎨 User Experience

1. Call ends → Recording uploads
2. Notification appears: "Add as Lead?"
3. User taps notification
4. Form opens with phone pre-filled
5. User enters name, company, etc.
6. Checkboxes show what's missing:
   - ☑️ Add to Contacts (if not in contacts)
   - ☑️ Save to Leads (if not in leads)
   - ☑️ Sync to LMS (if not in LMS)
7. User clicks "Save Lead"
8. Toast messages show progress:
   - "Adding to contacts..."
   - "Saving to database..."
   - "Syncing to LMS..."
   - "✅ Saved to contacts, leads, LMS"

## 🔍 Testing

### Test Scenario 1: New Phone Number
1. Make a call to unknown number
2. Call ends → Recording uploads
3. Notification: "Add as Lead and Contact?"
4. Fill form → Save
5. Verify: Added to contacts, leads, and LMS

### Test Scenario 2: Existing Contact
1. Call existing contact
2. Call ends → Recording uploads
3. Notification: "Add to LMS?"
4. Fill form → Save
5. Verify: Added to LMS only

### Test Scenario 3: Already Everywhere
1. Call number that exists in all places
2. Call ends → Recording uploads
3. Toast: "Already in contacts and LMS"
4. No notification

## 🔧 Configuration

### Enable/Disable Features

In `src/services/leadNotificationService.ts`:
- Set notification preferences
- Customize messages

In `src/services/leadActionService.ts`:
- Configure LMS API endpoint
- Add custom sync logic

### LMS Integration

The `syncLeadToLMS()` function in `leadActionService.ts` is a placeholder.
Update it with your actual LMS API:

```typescript
async function syncLeadToLMS(leadData) {
  const response = await fetch(`${LMS_BASE_URL}/api/leads/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LMS_API_KEY}`,
    },
    body: JSON.stringify(leadData),
  });
  
  const data = await response.json();
  return { success: true, leadId: data.leadId };
}
```

## 📱 Permissions

The app will request these permissions at runtime:
- **READ_CONTACTS** - To check if phone is in contacts
- **WRITE_CONTACTS** - To add new contacts
- **POST_NOTIFICATIONS** - To show lead notifications

## ⚠️ Important Notes

1. **Phone Number Normalization**: All phone numbers are normalized (removing spaces, dashes, +) for comparison

2. **Duplicate Prevention**: The system checks all sources before adding to prevent duplicates

3. **Offline Support**: Leads are saved locally first, then synced to LMS when online

4. **Error Handling**: If one action fails (e.g., LMS sync), others still complete

5. **User Control**: Users can choose where to save (contacts/leads/LMS) via checkboxes

## 🎉 Success Indicators

✅ Database migration ran successfully  
✅ Phone lookup works across all sources  
✅ Notifications show after calls  
✅ Form opens and pre-fills data  
✅ Leads save to Android contacts  
✅ Leads save to local database  
✅ Leads sync to external LMS  
✅ Toast messages show progress  
✅ No duplicate entries created  

## 🐛 Troubleshooting

### Notification doesn't appear
- Check notification permissions
- Check console logs for errors
- Verify phone lookup completed

### Can't add to contacts
- Check WRITE_CONTACTS permission
- Verify Contacts plugin installed
- Check Android version compatibility

### LMS sync fails
- Update the `syncLeadToLMS()` function
- Check API credentials
- Verify internet connection

### Form doesn't open
- Check useLeadManagement hook initialized
- Verify lookupResult is not null
- Check console for React errors

## 📞 Support

For issues or questions:
1. Check console logs (tagged with `[Lead Management]`)
2. Verify all files were created
3. Ensure database migration ran
4. Test with mock data first

---

**Implementation Date**: February 25, 2026  
**Status**: ✅ Complete and Ready to Test
