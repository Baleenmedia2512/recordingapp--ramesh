/**
 * Phone Number Lookup Service
 * Checks phone numbers across Android Contacts, Local Leads, and External LMS
 */

import { PhoneNumberLookupResult } from '@/types';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import LMS_CONFIG from '@/config/lms.config';
import { ensureAuth } from '@/lib/autoAuth';

/**
 * Normalize phone number for comparison
 * Removes spaces, dashes, parentheses, and plus sign
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Timeout wrapper for promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Generate alternative phone number formats for better matching
 * Indian numbers can be stored as: 9360515518, 919360515518, +919360515518
 */
function getPhoneNumberVariants(phoneNumber: string): string[] {
  const normalized = normalizePhoneNumber(phoneNumber);
  const variants: string[] = [normalized];
  
  // If starts with country code (91 for India), add version without it
  if (normalized.startsWith('91') && normalized.length > 10) {
    variants.push(normalized.substring(2)); // Remove 91
  }
  
  // If doesn't have country code and is 10 digits, add version with country code
  if (!normalized.startsWith('91') && normalized.length === 10) {
    variants.push('91' + normalized);
  }
  
  // Add +91 version
  if (normalized.startsWith('91')) {
    variants.push('+' + normalized);
  } else if (normalized.length === 10) {
    variants.push('+91' + normalized);
  }
  
  // Always add last 10 digits version (most common format)
  if (normalized.length > 10) {
    variants.push(normalized.substring(normalized.length - 10));
  }
  
  // Remove duplicates
  return [...new Set(variants)];
}

/**
 * Check if phone number exists in Android Contacts
 * OPTIMIZED: Uses native PhoneLookup API for instant results (~100ms)
 * ENHANCED: Tries multiple phone number formats for better matching
 */
async function checkInContacts(phoneNumber: string): Promise<{ found: boolean; name?: string }> {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ [Contacts] Not on native platform, skipping contacts check');
    return { found: false, name: undefined };
  }

  try {
    console.log('🔍 [Contacts] Fast lookup for:', phoneNumber);
    
    // Check permission first (instant check, no dialog)
    const { Contacts } = await import('@capacitor-community/contacts');
    const permission = await Contacts.checkPermissions();
    console.log('✅ [Contacts] Permission status:', permission.contacts);
    
    if (permission.contacts !== 'granted') {
      console.warn('⚠️ [Contacts] Permission not granted:', permission.contacts);
      console.warn('   Enable in: Settings → Apps → Call Monitor → Permissions → Contacts');
      return { found: false, name: undefined };
    }
    
    // Generate multiple phone number formats to try
    const variants = getPhoneNumberVariants(phoneNumber);
    console.log('🔍 [Contacts] Trying formats:', variants);
    
    // Try each variant until we find a match
    const { CallMonitor } = await import('../plugins/CallMonitorPlugin');
    
    for (const variant of variants) {
      const result = await CallMonitor.lookupContactByPhone({ phoneNumber: variant });
      
      if (result.found && result.name) {
        console.log(`✅ [Contacts] Found with format "${variant}":`, result.name);
        return { found: true, name: result.name };
      }
    }
    
    console.log('❌ [Contacts] Not found in any format');
    return { found: false, name: undefined };
  } catch (error: any) {
    console.error('❌ [Contacts] Error:', error);
    return { found: false, name: undefined };
  }
}

/**
 * Check if phone number exists in local leads_metadata table
 */
async function checkInLeads(phoneNumber: string, userId?: string): Promise<{ found: boolean; leadData?: any }> {
  try {
    console.log('🔍 [Leads] Checking leads_metadata table for:', phoneNumber);
    
    // Try multiple phone number formats
    const variants = getPhoneNumberVariants(phoneNumber);
    console.log('🔍 [Leads] Trying formats:', variants);
    
    // Query leads_metadata table with OR condition for all variants
    let query = supabase
      .from('leads_metadata')
      .select('*')
      .or(variants.map(v => `phone_number.eq.${v}`).join(','));
    
    // Add user filter if userId provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('❌ [Leads] Not found in leads table');
        return { found: false };
      }
      console.error('❌ [Leads] Query error:', error);
      return { found: false };
    }

    if (data) {
      console.log('✅ [Leads] Found in leads table:', data.contact_name);
      return { found: true, leadData: data };
    }

    console.log('❌ [Leads] Not found in leads table');
    return { found: false };
  } catch (error) {
    console.error('❌ [Leads] Error checking leads:', error);
    return { found: false };
  }
}

/**
 * Check if phone number exists in external LMS
 */
async function checkInLMS(phoneNumber: string): Promise<{ found: boolean; lmsData?: any }> {
  if (!LMS_CONFIG.enabled) {
    console.log('ℹ️ [LMS] Integration disabled');
    return { found: false };
  }

  try {
    console.log('🔍 [LMS] Checking external LMS for:', phoneNumber);
    
    // Use edge function to avoid CORS issues
    if (LMS_CONFIG.useEdgeFunction) {
      console.log('📡 [LMS] Using edge function for lookup');
      const response = await fetch('/api/lms/check-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ [LMS] Edge function check failed:', response.status);
        return { found: false };
      }

      const data = await response.json();
      if (data.isLMSCall) {
        console.log('✅ [LMS] Found in LMS:', data.leadName);
        return { found: true, lmsData: data };
      }

      console.log('❌ [LMS] Not found in LMS');
      return { found: false };
    }

    // Direct LMS API call (may face CORS on mobile)
    console.log('📡 [LMS] Direct API call');
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.matchCall}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          timestamp: new Date().toISOString(),
          apiKey: LMS_CONFIG.apiKey,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.warn('⚠️ [LMS] API call failed:', response.status);
      return { found: false };
    }

    const data = await response.json();
    if (data.match || data.isLMSCall) {
      console.log('✅ [LMS] Found in LMS:', data.leadName || data.customerName);
      return { found: true, lmsData: data };
    }

    console.log('❌ [LMS] Not found in LMS');
    return { found: false };
  } catch (error) {
    console.error('❌ [LMS] Error checking LMS:', error);
    return { found: false };
  }
}

/**
 * Comprehensive phone number lookup across all sources
 * @param phoneNumber - Phone number to look up
 * @param userId - Optional user ID (not required for apps without authentication)
 * @returns Complete lookup result with data from all sources
 */
export async function lookupPhoneNumber(
  phoneNumber: string,
  userId?: string
): Promise<PhoneNumberLookupResult> {
  console.log('🔍 [Phone Lookup] Starting comprehensive lookup for:', phoneNumber);
  console.log('🔍 [Phone Lookup] User ID provided:', userId || 'None');
  
  // Ensure we have authentication
  if (!userId) {
    try {
      userId = await ensureAuth();
      console.log('✅ [Phone Lookup] Auto-authenticated with user ID:', userId);
    } catch (error) {
      console.error('❌ [Phone Lookup] Auto-auth failed:', error);
      // Continue without userId - will skip leads database check
    }
  }
  
  console.log('🔍 [Phone Lookup] Using User ID:', userId || 'No user (will skip leads check)');
  
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Check sources with timeouts (skip local leads if no userId)
  console.log('⏱️ [Phone Lookup] Starting parallel checks...');
  console.log('⏱️ [Phone Lookup] Time now:', new Date().toLocaleTimeString());
  
  let contactsResult: { found: boolean; name?: string };
  let leadsResult: { found: boolean; leadData?: any };
  let lmsResult: { found: boolean; lmsData?: any };
  
  try {
    console.log('📞 [Phone Lookup] Starting Promise.all...');
    [contactsResult, leadsResult, lmsResult] = await Promise.all([
      withTimeout(checkInContacts(normalized), 25000, 'Contacts check').catch(err => {
        console.error('❌ [Contacts] Timeout or error:', err.message);
        return { found: false, name: undefined };
      }),
      userId 
        ? withTimeout(checkInLeads(normalized, userId), 5000, 'Leads check').catch(err => {
            console.error('❌ [Leads] Timeout or error:', err.message);
            return { found: false, leadData: undefined };
          })
        : Promise.resolve({ found: false, leadData: undefined }),
      withTimeout(checkInLMS(normalized), 8000, 'LMS check').catch(err => {
        console.error('❌ [LMS] Timeout or error:', err.message);
        return { found: false, lmsData: undefined };
      }),
    ]);
    console.log('✅ [Phone Lookup] Promise.all completed!');
  } catch (promiseAllError: any) {
    console.error('❌ [Phone Lookup] Promise.all threw unexpected error:', promiseAllError);
    // Return safe defaults
    contactsResult = { found: false, name: undefined };
    leadsResult = { found: false, leadData: undefined };
    lmsResult = { found: false, lmsData: undefined };
  }
  
  console.log('✅ [Phone Lookup] All checks completed (or timed out)');
  console.log('⏱️ [Phone Lookup] Time now:', new Date().toLocaleTimeString());

  const result: PhoneNumberLookupResult = {
    phoneNumber: normalized,
    foundInContacts: contactsResult.found,
    foundInLeads: leadsResult.found,
    foundInLMS: lmsResult.found,
    contactName: contactsResult.name,
    leadData: leadsResult.leadData,
    lmsData: lmsResult.lmsData,
  };

  console.log('✅ [Phone Lookup] Results:', {
    phone: normalized,
    inContacts: result.foundInContacts,
    inLeads: result.foundInLeads,
    inLMS: result.foundInLMS,
  });

  return result;
}

/**
 * Get notification message based on where phone was found
 * 
 * 4 CASES:
 * 1. ✅ In BOTH contacts AND database → Present in both
 * 2. ❌ ONLY in database (NOT in contacts) → Present only in DB, add to contacts?
 * 3. ❌ ONLY in contacts (NOT in database) → Present only in contacts, add to DB?
 * 4. ❌ NOT in either → Not present, add as lead?
 * 
 * Note: LMS sync happens silently in Android background after recording upload
 */
export function getNotificationMessage(lookup: PhoneNumberLookupResult): {
  title: string;
  message: string;
  action: 'add-all' | 'add-to-contacts' | 'add-to-lms' | 'already-exists' | 'sync-to-lms' | 'add-to-db';
} {
  const { foundInContacts, foundInLeads, contactName, leadData } = lookup;

  // Get display name (from contacts, or leads table, or just phone number)
  const displayName = contactName || leadData?.contact_name || lookup.phoneNumber;

  // Case 1: ✅ Present in BOTH contacts AND database
  if (foundInContacts && foundInLeads) {
    return {
      title: '✅ Present in Both',
      message: `${displayName} is in contacts and database`,
      action: 'already-exists',
    };
  }

  // Case 2: ❌ Present ONLY in database (NOT in contacts)
  if (foundInLeads && !foundInContacts && leadData) {
    return {
      title: '📱 Only in Database',
      message: `${displayName} - Add to contacts?`,
      action: 'add-to-contacts',
    };
  }

  // Case 3: ❌ Present ONLY in contacts (NOT in database)
  if (foundInContacts && !foundInLeads) {
    return {
      title: '💾 Only in Contacts',
      message: `${displayName} - Add to database?`,
      action: 'add-to-db',
    };
  }
  
  // Case 4: ❌ NOT present in database AND contacts
  return {
    title: '➕ Not in DB or Contacts',
    message: `${displayName} - Add as lead?`,
    action: 'add-all',
  };
}
