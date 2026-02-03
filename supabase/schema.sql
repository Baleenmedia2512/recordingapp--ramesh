-- Supabase Database Schema for Call Monitor
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, but we can add a profile table)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  device_platform TEXT NOT NULL CHECK (device_platform IN ('android', 'ios', 'web')),
  os_version TEXT,
  app_version TEXT,
  last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Call logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing', 'missed', 'rejected', 'voicemail')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  device_platform TEXT NOT NULL CHECK (device_platform IN ('android', 'ios')),
  has_recording BOOLEAN DEFAULT false,
  recording_path TEXT,
  recording_url TEXT,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(device_id, timestamp, phone_number)
);

-- Recordings table
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  duration INTEGER, -- in seconds
  format TEXT DEFAULT 'm4a',
  is_encrypted BOOLEAN DEFAULT true,
  storage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for better query performance
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_timestamp ON public.call_logs(timestamp DESC);
CREATE INDEX idx_call_logs_phone_number ON public.call_logs(phone_number);
CREATE INDEX idx_call_logs_call_type ON public.call_logs(call_type);
CREATE INDEX idx_call_logs_has_recording ON public.call_logs(has_recording);
CREATE INDEX idx_devices_user_id ON public.devices(user_id);
CREATE INDEX idx_recordings_call_log_id ON public.recordings(call_log_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Devices policies
CREATE POLICY "Users can view their own devices" 
  ON public.devices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" 
  ON public.devices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
  ON public.devices FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" 
  ON public.devices FOR DELETE 
  USING (auth.uid() = user_id);

-- Call logs policies
CREATE POLICY "Users can view their own call logs" 
  ON public.call_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs" 
  ON public.call_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs" 
  ON public.call_logs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call logs" 
  ON public.call_logs FOR DELETE 
  USING (auth.uid() = user_id);

-- Recordings policies
CREATE POLICY "Users can view their own recordings" 
  ON public.recordings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.call_logs 
      WHERE call_logs.id = recordings.call_log_id 
      AND call_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own recordings" 
  ON public.recordings FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.call_logs 
      WHERE call_logs.id = recordings.call_log_id 
      AND call_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own recordings" 
  ON public.recordings FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.call_logs 
      WHERE call_logs.id = recordings.call_log_id 
      AND call_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own recordings" 
  ON public.recordings FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.call_logs 
      WHERE call_logs.id = recordings.call_log_id 
      AND call_logs.user_id = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_devices_updated_at 
  BEFORE UPDATE ON public.devices 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at 
  BEFORE UPDATE ON public.call_logs 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recordings_updated_at 
  BEFORE UPDATE ON public.recordings 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
