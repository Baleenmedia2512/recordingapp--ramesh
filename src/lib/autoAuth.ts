/**
 * Auto Authentication for No-Login App
 * Automatically creates and maintains a Supabase session without requiring user login
 */

import { supabase } from './supabase';

const DEVICE_ID_KEY = 'device_anonymous_id';
const AUTH_SESSION_KEY = 'auto_auth_session';

/**
 * Get or create a persistent device ID
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Initialize anonymous authentication automatically
 * This runs on app start and ensures there's always a valid Supabase session
 */
export async function initializeAutoAuth(): Promise<{ userId: string; email: string }> {
  const ANONYMOUS_UUID = '00000000-0000-0000-0000-000000000000';
  
  try {
    console.log('🔐 [Auto Auth] Checking authentication...');

    // Check if we already have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      console.log('✅ [Auto Auth] Existing session found:', session.user.id);
      return {
        userId: session.user.id,
        email: session.user.email || 'anonymous',
      };
    }

    // Check if we have stored credentials (from previous successful auth)
    const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (storedSession) {
      console.log('🔄 [Auto Auth] Found stored credentials, attempting sign in...');
      try {
        const { email, password } = JSON.parse(storedSession);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError && signInData.user) {
          console.log('✅ [Auto Auth] Signed in with stored credentials:', signInData.user.id);
          return {
            userId: signInData.user.id,
            email: signInData.user.email || 'anonymous',
          };
        }
      } catch (err) {
        console.log('⚠️ [Auto Auth] Stored credentials failed, will use offline mode');
      }
    }

    // If we reach here, either no stored session or signin failed
    // Use offline UUID immediately (don't try to create account, avoid rate limits)
    console.log('🔄 [Auto Auth] Using offline anonymous UUID:', ANONYMOUS_UUID);
    return {
      userId: ANONYMOUS_UUID,
      email: 'offline@callmonitor.local',
    };

  } catch (error) {
    console.error('❌ [Auto Auth] Failed to initialize:', error);
    
    // Return special anonymous UUID for offline mode
    const ANONYMOUS_UUID = '00000000-0000-0000-0000-000000000000';
    console.log('🔄 [Auto Auth] Using offline anonymous UUID:', ANONYMOUS_UUID);
    return {
      userId: ANONYMOUS_UUID,
      email: 'offline@callmonitor.local',
    };
  }
}

/**
 * Get current authenticated user ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Ensure we have a valid session (refresh if needed)
 */
export async function ensureAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (userId) {
    return userId;
  }
  
  // No session, reinitialize
  const result = await initializeAutoAuth();
  return result.userId;
}
