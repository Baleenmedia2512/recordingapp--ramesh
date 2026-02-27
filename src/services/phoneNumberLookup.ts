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
 * Check if phone number exists in Android Contacts
 * OPTIMIZED: Uses native PhoneLookup API for instant results (~100ms)
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
    
    // Use native fast lookup (PhoneLookup API) - instant!
    const { CallMonitor } = await import('../plugins/CallMonitorPlugin');
    const result = await CallMonitor.lookupContactByPhone({ phoneNumber });
    
    if (result.found && result.name) {
      console.log('✅ [Contacts] Found:', result.name);
      return { found: true, name: result.name };
    } else {
      console.log('❌ [Contacts] Not found');
      return { found: false, name: undefined };
    }
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
    
    const normalized = normalizePhoneNumber(phoneNumber);
    
    // Query leads_metadata table
    let query = supabase
      .from('leads_metadata')
      .select('*')
      .eq('phone_number', normalized);
    
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
  console.log('⏱️ [Phone Lookup] Starting parallel checks with 8s timeout...');
  console.log('⏱️ [Phone Lookup] Time now:', new Date().toLocaleTimeString());
  
  let contactsResult: { found: boolean; name?: string };
  let leadsResult: { found: boolean; leadData?: any };
  let lmsResult: { found: boolean; lmsData?: any };
  
  try {
    console.log('📞 [Phone Lookup] Starting Promise.all...');
    [contactsResult, leadsResult, lmsResult] = await Promise.all([
      withTimeout(checkInContacts(normalized), 8000, 'Contacts check').catch(err => {
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
 * Logic:
 * 1. NOT in LMS AND NOT in contacts → "Add as Lead and contact book?"
 * 2. In leads table BUT NOT in contacts → "Add as contact book?"
 * 3. In contacts BUT NOT in LMS → "Add to LMS?"
 * 4. In BOTH contacts AND LMS → "Already available in phone and LMS"
 */
export function getNotificationMessage(lookup: PhoneNumberLookupResult): {
  title: string;
  message: string;
  action: 'add-all' | 'add-to-contacts' | 'add-to-lms' | 'already-exists' | 'sync-to-lms';
} {
  const { foundInContacts, foundInLeads, foundInLMS, contactName, leadData, lmsData } = lookup;

  // Case 1: Found in BOTH contacts AND LMS → Already available
  if (foundInContacts && foundInLMS) {
    return {
      title: '✅ Already Available',
      message: `${contactName || lmsData?.leadName || 'This number'} is already available in phone contacts and LMS`,
      action: 'already-exists',
    };
  }

  // Case 2: Found in leads table BUT NOT in contacts → Add as contact book
  if (foundInLeads && !foundInContacts) {
    return {
      title: '📱 Add to Contact Book?',
      message: `${leadData?.contact_name || lookup.phoneNumber} is in your leads table. Add to phone contacts?`,
      action: 'add-to-contacts',
    };
  }

  // Case 3: Found in contacts BUT NOT in LMS → Add to LMS
  if (foundInContacts && !foundInLMS) {
    return {
      title: '🏢 Add to LMS?',
      message: `${contactName} is in your contacts. Add to LMS as a lead?`,
      action: 'add-to-lms',
    };
  }

  // Case 4: Found in LMS but NOT in contacts (not in leads either)
  if (foundInLMS && !foundInContacts && !foundInLeads) {
    return {
      title: '📱 Add to Contact Book?',
      message: `${lmsData?.leadName || lookup.phoneNumber} is in LMS. Add to phone contacts?`,
      action: 'add-to-contacts',
    };
  }

  // Case 5: Found in leads and contacts but NOT in LMS → Sync to LMS
  if (foundInLeads && foundInContacts && !foundInLMS) {
    return {
      title: '🏢 Sync to LMS?',
      message: `${leadData?.contact_name || contactName} is in your contacts and leads. Sync to LMS?`,
      action: 'sync-to-lms',
    };
  }

  // Case 6: NOT found in LMS AND NOT in contacts → Add as Lead and contact book
  return {
    title: '➕ Add as Lead?',
    message: `${lookup.phoneNumber} not found. Add as lead and contact book?`,
    action: 'add-all',
  };
}
