# Quick Deployment Guide

## Step 1: Get Supabase Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "CLI Access"
4. Copy the token

## Step 2: Login with Token
```powershell
npx supabase login --token YOUR_TOKEN_HERE
```

## Step 3: Link Your Project
```powershell
npx supabase link --project-ref wkwrrdcjknvupwsfdjtd
```

## Step 4: Deploy Edge Function
```powershell
npx supabase functions deploy notify-lms
```

## Step 5: Set Secrets
```powershell
npx supabase secrets set --project-ref wkwrrdcjknvupwsfdjtd LMS_BASE_URL=https://e2wleadmanager.vercel.app
npx supabase secrets set --project-ref wkwrrdcjknvupwsfdjtd LMS_API_KEY=CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz
```

## Step 6: Configure Database Webhook (Manual)

Go to: https://supabase.com/dashboard/project/wkwrrdcjknvupwsfdjtd/database/hooks

1. Click **"Create a new hook"**
2. Configure:
   - **Name**: `notify_lms_on_recording`
   - **Table**: `call_logs`
   - **Events**: Check `INSERT` and `UPDATE`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://wkwrrdcjknvupwsfdjtd.supabase.co/functions/v1/notify-lms`
   - **HTTP Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_ANON_KEY_FROM_ENV
     ```
   - **HTTP Parameters** (Body):
     ```json
     {
       "type": "INSERT",
       "table": "call_logs",
       "record": "{{ record }}",
       "old_record": "{{ old_record }}"
     }
     ```
   - **Conditions** (Filter):
     ```
     recording_url IS NOT NULL AND call_type = 'outgoing'
     ```

3. Click **"Create webhook"**

## Step 7: Test It!

1. Make an outgoing call on your mobile app
2. Recording uploads to Supabase (should work already ✅)
3. Check Edge Function logs:
   ```powershell
   npx supabase functions logs notify-lms --project-ref wkwrrdcjknvupwsfdjtd
   ```

That's it! The server will now notify LMS automatically.
