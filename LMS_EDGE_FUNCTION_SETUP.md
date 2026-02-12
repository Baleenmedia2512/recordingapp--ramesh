# LMS Integration via Supabase Edge Functions

## Overview

This implementation solves the mobile network restriction issue by using **server-to-server communication** instead of direct mobile-to-LMS API calls.

### Architecture

```
Mobile App → Supabase Storage → Database Trigger → Edge Function → LMS API
```

1. **Mobile App**: Uploads recording to Supabase Storage, updates `call_logs.recording_url`
2. **Database Webhook**: Triggered when `recording_url` is set
3. **Edge Function**: Runs on Supabase servers, calls LMS API endpoints
4. **LMS API**: Receives recording information from trusted server

## Deployment Steps

### 1. Deploy Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
supabase functions deploy notify-lms

# Set environment variables
supabase secrets set LMS_BASE_URL=https://e2wleadmanager.vercel.app
supabase secrets set LMS_API_KEY=CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz
```

### 2. Configure Database Webhook

Go to your Supabase Dashboard:

1. Navigate to **Database → Webhooks**
2. Click **Create a new webhook**
3. Configure:
   - **Table**: `call_logs`
   - **Events**: Select `INSERT` and `UPDATE`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-lms`
   - **HTTP Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_ANON_KEY
     ```
   - **Conditions** (SQL): 
     ```sql
     NEW.recording_url IS NOT NULL AND NEW.call_type = 'outgoing'
     ```

4. Click **Create webhook**

### 3. Test the Integration

1. Make an outgoing call from the mobile app
2. Upload the recording to Supabase (should work normally)
3. Check Edge Function logs:
   ```bash
   supabase functions logs notify-lms
   ```
4. Verify the LMS received the recording URL

## Alternative: Using pg_net Extension

If you prefer database-level triggers instead of webhooks:

```sql
-- Enable pg_net extension (requires superuser/admin)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The trigger is already created in schema.sql
-- Just enable pg_net and set the configuration:
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = 'YOUR_ANON_KEY';
```

## Troubleshooting

### Edge Function Logs

Check logs in Supabase Dashboard → Edge Functions → notify-lms → Logs

Or via CLI:
```bash
supabase functions logs notify-lms --tail
```

### Common Issues

1. **Webhook not triggering**: Check that `recording_url` is being set in `call_logs` table
2. **401 Unauthorized**: Verify `LMS_API_KEY` secret is set correctly
3. **Timeout**: Check LMS API is accessible from Supabase servers
4. **CORS errors**: Edge Function should handle CORS automatically

## Monitoring

### Success Indicators

- ✅ Mobile app uploads recording to Supabase (Status 200)
- ✅ `call_logs.recording_url` is populated
- ✅ Edge Function logs show "Successfully notified LMS"
- ✅ LMS shows recording attached to call

### Failure Recovery

The webhook will retry automatically on failure. Check:
- Supabase Dashboard → Database → Webhooks → View webhook status
- Edge Function logs for error details

## Benefits of This Approach

1. ✅ **Bypasses mobile network restrictions** - Server-to-server communication
2. ✅ **Reliable delivery** - Automatic retries on failure
3. ✅ **Centralized logging** - All LMS interactions logged in one place
4. ✅ **Easy maintenance** - Update Edge Function without app rebuild
5. ✅ **Secure** - API keys stored in Supabase secrets, not in app

## Next Steps

1. Deploy the Edge Function using the commands above
2. Configure the webhook in Supabase Dashboard
3. Test with a real call recording
4. Monitor Edge Function logs for success/errors
5. (Optional) Remove direct LMS API calls from mobile app code
