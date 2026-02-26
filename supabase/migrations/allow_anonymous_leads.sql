-- Allow anonymous users to insert leads without authentication
-- For apps that don't require user login

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads_metadata;

-- Create new policy that allows anonymous inserts
CREATE POLICY "Allow anonymous lead inserts"
  ON public.leads_metadata FOR INSERT
  WITH CHECK (
    -- Either authenticated user owns it, OR user_id is a special anonymous UUID
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR auth.role() = 'anon'
  );

-- Also update the SELECT policy to allow viewing anonymous leads
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads_metadata;

CREATE POLICY "Users can view their own and anonymous leads"
  ON public.leads_metadata FOR SELECT
  USING (
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR auth.role() = 'anon'
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads_metadata;

CREATE POLICY "Users can update their own and anonymous leads"
  ON public.leads_metadata FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR auth.role() = 'anon'
  );

-- Success notice
DO $$
BEGIN
  RAISE NOTICE 'Anonymous lead access enabled!';
  RAISE NOTICE 'Apps without authentication can now create leads';
END $$;
