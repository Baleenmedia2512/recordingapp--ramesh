import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mock mode for testing without Supabase
export const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');

if (!isMockMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Use dummy values for mock mode
const finalUrl = isMockMode ? 'https://mock.supabase.co' : supabaseUrl;
const finalKey = isMockMode ? 'mock-key' : supabaseAnonKey;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
