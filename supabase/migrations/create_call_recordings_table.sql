-- Create call_recordings table (separate from LMS CallLog table)
-- Run this in your Supabase SQL Editor

-- Call recordings table for the mobile app
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  device_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing', 'missed', 'rejected', 'voicemail')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  device_platform TEXT NOT NULL CHECK (device_platform IN ('android', 'ios')),
  has_recording BOOLEAN DEFAULT false,
  recording_url TEXT,
  recording_file_path TEXT,
  recording_file_name TEXT,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(device_id, timestamp, phone_number)
);

-- Indexes for better query performance
CREATE INDEX idx_call_recordings_user_id ON public.call_recordings(user_id);
CREATE INDEX idx_call_recordings_timestamp ON public.call_recordings(timestamp DESC);
CREATE INDEX idx_call_recordings_phone_number ON public.call_recordings(phone_number);
CREATE INDEX idx_call_recordings_call_type ON public.call_recordings(call_type);
CREATE INDEX idx_call_recordings_has_recording ON public.call_recordings(has_recording);

-- Row Level Security (RLS)
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_recordings
CREATE POLICY "Users can view their own call recordings" 
  ON public.call_recordings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call recordings" 
  ON public.call_recordings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call recordings" 
  ON public.call_recordings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call recordings" 
  ON public.call_recordings FOR DELETE 
  USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_call_recordings_updated_at
  BEFORE UPDATE ON public.call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.call_recordings TO authenticated;
GRANT ALL ON public.call_recordings TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'call_recordings table created successfully!';
  RAISE NOTICE 'Table: public.call_recordings';
  RAISE NOTICE 'This is separate from your LMS CallLog table';
END $$;
