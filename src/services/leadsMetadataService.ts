/**
 * Leads Metadata Service
 * Handles database operations for the leads_metadata table
 */

import { supabase } from '@/lib/supabase';
import { LeadMetadata } from '@/types';
import { normalizePhoneNumber } from './phoneNumberLookup';

/**
 * Get lead by phone number
 */
export async function getLeadByPhoneNumber(
  phoneNumber: string,
  userId: string
): Promise<LeadMetadata | null> {
  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
      .from('leads_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', normalized)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is expected when lead doesn't exist
        return null;
      }
      throw error;
    }

    return data as LeadMetadata;
  } catch (error) {
    console.error('Error getting lead by phone:', error);
    return null;
  }
}

/**
 * Create a new lead
 */
export async function createLead(
  userId: string,
  leadData: {
    phoneNumber: string;
    contactName: string;
    company?: string;
    email?: string;
    designation?: string;
    notes?: string;
    isInContacts?: boolean;
    isSyncedToLMS?: boolean;
    lmsLeadId?: string;
  }
): Promise<LeadMetadata | null> {
  try {
    const normalized = normalizePhoneNumber(leadData.phoneNumber);

    const { data, error } = await supabase
      .from('leads_metadata')
      .insert({
        user_id: userId,
        phone_number: normalized,
        contact_name: leadData.contactName,
        company: leadData.company || null,
        email: leadData.email || null,
        designation: leadData.designation || null,
        notes: leadData.notes || null,
        is_in_contacts: leadData.isInContacts || false,
        is_synced_to_lms: leadData.isSyncedToLMS || false,
        lms_lead_id: leadData.lmsLeadId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      throw error;
    }

    console.log('✅ Lead created in database:', data?.id);
    return data as LeadMetadata;
  } catch (error) {
    console.error('Error creating lead:', error);
    return null;
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(
  leadId: string,
  userId: string,
  updates: Partial<Omit<LeadMetadata, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<LeadMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('leads_metadata')
      .update(updates)
      .eq('id', leadId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      throw error;
    }

    console.log('✅ Lead updated:', leadId);
    return data as LeadMetadata;
  } catch (error) {
    console.error('Error updating lead:', error);
    return null;
  }
}

/**
 * Mark lead as synced to LMS
 */
export async function markLeadSyncedToLMS(
  leadId: string,
  userId: string,
  lmsLeadId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads_metadata')
      .update({
        is_synced_to_lms: true,
        lms_lead_id: lmsLeadId,
      })
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking lead as synced:', error);
      return false;
    }

    console.log('✅ Lead marked as synced to LMS:', leadId);
    return true;
  } catch (error) {
    console.error('Error marking lead as synced:', error);
    return false;
  }
}

/**
 * Mark lead as added to contacts
 */
export async function markLeadInContacts(
  leadId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads_metadata')
      .update({
        is_in_contacts: true,
      })
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking lead in contacts:', error);
      return false;
    }

    console.log('✅ Lead marked as in contacts:', leadId);
    return true;
  } catch (error) {
    console.error('Error marking lead in contacts:', error);
    return false;
  }
}

/**
 * Get all leads for a user
 */
export async function getAllLeads(userId: string): Promise<LeadMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('leads_metadata')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all leads:', error);
      throw error;
    }

    return (data as LeadMetadata[]) || [];
  } catch (error) {
    console.error('Error getting all leads:', error);
    return [];
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads_metadata')
      .delete()
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting lead:', error);
      return false;
    }

    console.log('✅ Lead deleted:', leadId);
    return true;
  } catch (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
}
