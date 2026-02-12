-- Add native_call_id column to store Android/iOS call log IDs
-- This fixes the UUID error when syncing mobile call logs

-- Add column to call_recordings table
ALTER TABLE public.call_recordings 
ADD COLUMN IF NOT EXISTS native_call_id TEXT;

-- Add index for faster lookups by native ID
CREATE INDEX IF NOT EXISTS idx_call_recordings_native_call_id 
ON public.call_recordings(native_call_id);

-- Update existing rows to use their current id as native_call_id (if they're numeric)
-- This is a one-time migration for existing data
UPDATE public.call_recordings 
SET native_call_id = id::text 
WHERE native_call_id IS NULL;

-- Optional: Add comment for documentation
COMMENT ON COLUMN public.call_recordings.native_call_id IS 
'Stores the original call log ID from Android CallLog or iOS system (often numeric)';
