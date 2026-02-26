-- Create leads_metadata table for local lead management
-- This table stores business leads added through the app

CREATE TABLE IF NOT EXISTS public.leads_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  designation TEXT,
  notes TEXT,
  is_synced_to_lms BOOLEAN DEFAULT false,
  lms_lead_id TEXT, -- External LMS lead ID if synced
  is_in_contacts BOOLEAN DEFAULT false, -- Whether added to phone contacts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, phone_number)
);

-- Indexes for better query performance
CREATE INDEX idx_leads_metadata_phone ON public.leads_metadata(phone_number);
CREATE INDEX idx_leads_metadata_user ON public.leads_metadata(user_id);
CREATE INDEX idx_leads_metadata_synced ON public.leads_metadata(is_synced_to_lms);
CREATE INDEX idx_leads_metadata_contacts ON public.leads_metadata(is_in_contacts);

-- Row Level Security (RLS)
ALTER TABLE public.leads_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own leads"
  ON public.leads_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads"
  ON public.leads_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
  ON public.leads_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
  ON public.leads_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_leads_metadata_updated_at
  BEFORE UPDATE ON public.leads_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.leads_metadata TO authenticated;
GRANT ALL ON public.leads_metadata TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'leads_metadata table created successfully!';
  RAISE NOTICE 'This table stores business leads added through the app';
END $$;
