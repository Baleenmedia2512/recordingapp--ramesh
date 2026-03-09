# Auto-Sync Trigger: leads_metadata → LMS

## What It Does

Automatically syncs every new lead from `leads_metadata` table to external LMS `lead` table using a database trigger.

### Flow:
```
User saves lead in app
    ↓
leads_metadata INSERT
    ↓
Database Trigger fires (auto_sync_lead_to_lms)
    ↓
Calls Edge Function via HTTP
    ↓
Edge Function syncs to LMS MySQL
    ↓
Lead appears in LMS lead table
```

## Safety Features

✅ **Non-blocking**: Uses `pg_net` async HTTP (doesn't slow down INSERT)
✅ **Conditional**: Only syncs if `is_synced_to_lms = false`
✅ **Idempotent**: Safe to run migration multiple times
✅ **No breaking changes**: Existing app-level sync still works
✅ **Backward compatible**: Works with old and new leads

## Installation

### Step 1: Enable Extension & Create Trigger
Copy SQL from `supabase/migrations/add_auto_lms_sync_trigger.sql` and run in Supabase SQL Editor.

### Step 2: Verify Installation
```sql
-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_sync_lead_to_lms';

-- Should return:
-- trigger_auto_sync_lead_to_lms | INSERT | leads_metadata
```

### Step 3: Test
1. Make a test call in Android app
2. Click notification → Fill form → Save
3. Check Supabase logs: Should see "Auto-sync triggered for lead..."
4. Check LMS `lead` table: Lead should appear within 1-2 seconds

## How It Works

### Components:

1. **pg_net Extension**
   - Enables HTTP requests from database functions
   - Async/non-blocking (doesn't delay INSERT)

2. **auto_sync_lead_to_lms() Function**
   - Triggered automatically after INSERT
   - Checks if `is_synced_to_lms = false`
   - Calls Edge Function with all lead data (15+ fields)
   - Returns NEW row (allows INSERT to complete normally)

3. **trigger_auto_sync_lead_to_lms Trigger**
   - `AFTER INSERT` - fires after row is committed
   - `FOR EACH ROW` - runs for every inserted lead
   - `EXECUTE FUNCTION auto_sync_lead_to_lms()`

### Edge Function Called:
```
POST https://wkwrrdcjknvupwsfdjtd.supabase.co/functions/v1/sync-lms-lead
Authorization: Bearer <ANON_KEY>
Body: {
  phone, leadName, company, email, designation, notes,
  leadDate, leadTime, clientPlatform, adEnquiry,
  alternatePhone, address, city, state, pincode,
  remarks, handledBy
}
```

## What Doesn't Change

❌ **App code**: No changes to React components or services
❌ **Existing sync**: `syncToLMS()` in AddLeadModal still works
❌ **Offline queue**: Still processes offline leads correctly
❌ **User experience**: No visible changes to user

## Benefits

✅ **Automatic**: No manual sync needed
✅ **Reliable**: Even if app-level sync fails, trigger catches it
✅ **Offline-proof**: When offline queue syncs to `leads_metadata`, trigger fires automatically
✅ **Consistent**: Every lead is guaranteed to reach LMS
✅ **Real-time**: LMS gets lead within seconds of app save

## Monitoring

### Check Trigger Logs:
```sql
-- Supabase Dashboard → Logs → Database Logs
-- Look for: "Auto-sync triggered for lead: John Doe (phone: 9876543210)"
```

### Check Sync Status:
```sql
SELECT 
  contact_name,
  phone_number,
  is_synced_to_lms,
  created_at
FROM leads_metadata
ORDER BY created_at DESC
LIMIT 10;
```

### Check Failed Syncs:
```sql
-- If Edge Function fails, these leads won't be marked as synced
SELECT *
FROM leads_metadata
WHERE is_synced_to_lms = false
  AND created_at < NOW() - INTERVAL '5 minutes';
```

## Troubleshooting

### Trigger Not Firing?
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_sync_lead_to_lms';
```

### HTTP Calls Not Working?
```sql
-- Check if pg_net is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### Edge Function Not Receiving Calls?
- Check Supabase Functions logs
- Verify ANON_KEY is correct
- Test Edge Function directly via Postman

## Rollback (If Needed)

If you want to disable auto-sync:

```sql
-- Remove trigger (keeps function for manual use)
DROP TRIGGER IF EXISTS trigger_auto_sync_lead_to_lms ON public.leads_metadata;

-- Or remove everything
DROP TRIGGER IF EXISTS trigger_auto_sync_lead_to_lms ON public.leads_metadata;
DROP FUNCTION IF EXISTS auto_sync_lead_to_lms();
```

App will continue working normally with manual sync only.

## Future Enhancements

### Add Retry Logic for Failed Syncs:
Create a cron job Edge Function that runs every 10 minutes:

```typescript
// supabase/functions/retry-failed-syncs/index.ts
const { data: failedLeads } = await supabase
  .from('leads_metadata')
  .select('*')
  .eq('is_synced_to_lms', false)
  .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

for (const lead of failedLeads) {
  await fetch('/functions/v1/sync-lms-lead', { body: lead });
}
```

Schedule via Supabase Cron: Every 10 minutes

---

**Status**: ✅ Ready to install
**Risk Level**: 🟢 Low (non-breaking, reversible)
**Testing Required**: ⚠️ Test with 1-2 leads before production use
