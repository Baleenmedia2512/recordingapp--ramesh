-- Auto-sync leads_metadata to LMS using database trigger
-- This ensures every new lead is automatically synced to external LMS
-- SAFE: Does not affect existing functionality, only adds automation

-- Step 1: Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create function to auto-sync lead to LMS via Edge Function
CREATE OR REPLACE FUNCTION auto_sync_lead_to_lms()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if not already marked as synced
  -- This prevents duplicate syncs and respects manual sync control
  IF NEW.is_synced_to_lms = false OR NEW.is_synced_to_lms IS NULL THEN
    -- Call Edge Function asynchronously using pg_net
    -- This does not block the INSERT operation
    PERFORM
      net.http_post(
        url := 'https://wkwrrdcjknvupwsfdjtd.supabase.co/functions/v1/sync-lms-lead',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrd3JyZGNqa252dXB3c2ZkanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDI2OTIsImV4cCI6MjA4MzQxODY5Mn0.nMYFs8RtopRXN5MzDHfsMIiFoTbwTloACdgpIWk3UgA',
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'phone', NEW.phone_number,
          'leadName', NEW.contact_name,
          'company', NEW.company,
          'email', NEW.email,
          'designation', NEW.designation,
          'notes', NEW.notes,
          'leadDate', NEW.lead_date,
          'leadTime', NEW.lead_time,
          'clientPlatform', NEW.client_platform,
          'adEnquiry', NEW.ad_enquiry,
          'alternatePhone', NEW.alternate_phone,
          'address', NEW.address,
          'city', NEW.city,
          'state', NEW.state,
          'pincode', NEW.pincode,
          'remarks', NEW.remarks,
          'handledBy', NEW.handled_by
        )
      );
    
    -- Log the sync attempt
    RAISE NOTICE 'Auto-sync triggered for lead: % (phone: %)', NEW.contact_name, NEW.phone_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger that fires AFTER INSERT
-- DROP existing trigger if it exists (for safe re-run)
DROP TRIGGER IF EXISTS trigger_auto_sync_lead_to_lms ON public.leads_metadata;

-- Create trigger
CREATE TRIGGER trigger_auto_sync_lead_to_lms
  AFTER INSERT ON public.leads_metadata
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_lead_to_lms();

-- Step 4: Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-sync trigger installed successfully!';
  RAISE NOTICE 'Every new lead in leads_metadata will automatically sync to LMS';
  RAISE NOTICE 'Trigger: trigger_auto_sync_lead_to_lms';
  RAISE NOTICE 'Function: auto_sync_lead_to_lms()';
  RAISE NOTICE 'NOTE: Existing sync methods (app-level) still work and are not affected';
END $$;
