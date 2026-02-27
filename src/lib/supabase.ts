import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

// Debug logging to check if env vars are loaded
console.log('🔍 Supabase URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'MISSING');
console.log('🔍 Supabase Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');

// Mock mode for testing without Supabase
export const isMockMode = !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('placeholder');

console.log('🔍 Mock Mode:', isMockMode);

if (!isMockMode && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Use dummy values for mock mode
const finalUrl = isMockMode ? 'https://mock.supabase.co' : SUPABASE_URL;
const finalKey = isMockMode ? 'mock-key' : SUPABASE_ANON_KEY;

console.log('🔍 Final URL:', finalUrl);

// Custom fetch with timeout to prevent hanging on offline devices
const fetchWithTimeout = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏱️ [Supabase] Request timeout after 5s:', url);
    controller.abort();
  }, 5000); // 5 second timeout for all Supabase requests

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('❌ [Supabase] Request aborted (timeout or offline)');
      throw new Error('Network timeout - device may be offline');
    }
    throw error;
  }
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'call-monitor-app',
    },
    fetch: fetchWithTimeout, // Use custom fetch with timeout
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
