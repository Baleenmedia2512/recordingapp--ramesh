# Lead Management Setup Guide

## Quick Setup Steps

Follow these steps to set up the lead management system:

### 1. Install Required NPM Packages

```bash
npm install @capacitor-community/contacts @capacitor/local-notifications @capacitor/toast
```

### 2. Run Database Migration

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Copy and paste the contents of:
supabase/migrations/create_leads_metadata_table.sql
```

Or using Supabase CLI:

```bash
supabase db push
```

### 3. Update Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Existing permissions -->
    
    <!-- Add these new permissions -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- ... -->
    </application>
</manifest>
```

### 4. Sync Capacitor

```bash
npm run build
npx cap sync
```

### 5. Test in Development

```bash
npm run dev
```

### 6. Build APK

```bash
cd android
./gradlew assembleDebug
```

The APK will be in:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Verification Checklist

After setup, verify:

- [ ] Database migration ran successfully
- [ ] `leads_metadata` table exists in Supabase
- [ ] NPM packages installed without errors
- [ ] Android permissions added to manifest
- [ ] App builds without TypeScript errors
- [ ] Can make a test call
- [ ] Notification appears after call ends
- [ ] AddLeadForm opens when notification clicked
- [ ] Lead saves to database

## Testing the Flow

### Test 1: Unknown Number
1. Call an unknown number (not in contacts/LMS)
2. End call
3. Wait for recording to upload
4. Notification appears: "Add as Lead and Contact?"
5. Click notification
6. Form opens
7. Fill in name, company, etc.
8. Click "Save Lead"
9. Verify entries in:
   - Android Contacts app
   - Supabase leads_metadata table
   - External LMS (if configured)

### Test 2: Existing Contact
1. Call an existing contact
2. End call
3. Notification: "Add to LMS?"
4. Form opens with name pre-filled
5. Save
6. Verify only added to LMS

### Test 3: Already Everywhere
1. Call a number that exists in all places
2. End call
3. Toast message: "Already available ✓"
4. No form opens

## Troubleshooting

### "Cannot find module" errors

Run:
```bash
npm install @capacitor-community/contacts @capacitor/local-notifications @capacitor/toast
npx cap sync
```

### Notification doesn't appear

1. Check Android notification permissions
2. Check console logs (filter by `[Lead Check]`)
3. Verify upload completed successfully

### Can't add to contacts

1. Grant WRITE_CONTACTS permission
2. Check if Contacts plugin is properly installed:
   ```bash
   npm list @capacitor-community/contacts
   ```

### Database errors

1. Verify migration ran:
   ```sql
   SELECT * FROM leads_metadata LIMIT 1;
   ```
2. Check Supabase logs for errors

### Form doesn't open

1. Check browser console for React errors
2. Verify `lookupResult` has data
3. Check `useLeadManagement` hook is initialized

## Configuration

### Update LMS API Endpoint

Edit `src/services/leadActionService.ts`:

```typescript
async function syncLeadToLMS(leadData) {
  const response = await fetch('YOUR_LMS_API_URL/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY',
    },
    body: JSON.stringify(leadData),
  });
  
  return await response.json();
}
```

### Customize Notifications

Edit `src/services/phoneNumberLookup.ts` → `getNotificationMessage()` function to change notification text.

## Next Steps

After successful setup:

1. Test with real calls
2. Customize notification messages
3. Configure LMS integration
4. Add custom fields if needed
5. Set up analytics/tracking

## Support

Check these files for implementation details:
- `LEAD_MANAGEMENT_IMPLEMENTATION.md` - Complete documentation
- Console logs tagged with `[Lead Check]`, `[Lead Management]`, `[Phone Lookup]`

---

✅ Setup complete! The system will now automatically check phone numbers after calls and prompt to add leads.
