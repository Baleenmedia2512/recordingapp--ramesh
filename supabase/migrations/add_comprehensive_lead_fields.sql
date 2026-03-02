-- Add comprehensive lead fields to leads_metadata table
-- This migration adds fields matching the external LMS form format

-- Add new columns to leads_metadata table
ALTER TABLE public.leads_metadata
  ADD COLUMN IF NOT EXISTS lead_date DATE,
  ADD COLUMN IF NOT EXISTS lead_time TIME,
  ADD COLUMN IF NOT EXISTS client_platform TEXT,
  ADD COLUMN IF NOT EXISTS ad_enquiry TEXT,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS handled_by TEXT;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_leads_metadata_platform ON public.leads_metadata(client_platform);
CREATE INDEX IF NOT EXISTS idx_leads_metadata_date ON public.leads_metadata(lead_date);
CREATE INDEX IF NOT EXISTS idx_leads_metadata_city ON public.leads_metadata(city);
CREATE INDEX IF NOT EXISTS idx_leads_metadata_handled_by ON public.leads_metadata(handled_by);

-- Add check constraint for pincode (6 digits if provided)
ALTER TABLE public.leads_metadata
  ADD CONSTRAINT check_pincode_format 
  CHECK (pincode IS NULL OR pincode ~ '^\d{6}$');

-- Add check constraint for alternate_phone (10 digits if provided)
ALTER TABLE public.leads_metadata
  ADD CONSTRAINT check_alternate_phone_format 
  CHECK (alternate_phone IS NULL OR alternate_phone ~ '^\d{10}$');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added comprehensive lead fields to leads_metadata table';
  RAISE NOTICE 'New fields: lead_date, lead_time, client_platform, ad_enquiry, alternate_phone, address, city, state, pincode, remarks, handled_by';
END $$;
