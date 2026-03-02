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
  } catch (error: any) {
    console.error('Error getting lead by phone:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
    return null;
  }
}

/**
 * Create a new lead
 * NOTE: userId is required - user must be authenticated
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
    leadDate?: string;
    leadTime?: string;
    clientPlatform?: string;
    adEnquiry?: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    remarks?: string;
    handledBy?: string;
    isInContacts?: boolean;
    isSyncedToLMS?: boolean;
    lmsLeadId?: string;
  }
): Promise<LeadMetadata | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required to create a lead');
    }

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
        lead_date: leadData.leadDate || null,
        lead_time: leadData.leadTime || null,
        client_platform: leadData.clientPlatform || null,
        ad_enquiry: leadData.adEnquiry || null,
        alternate_phone: leadData.alternatePhone || null,
        address: leadData.address || null,
        city: leadData.city || null,
        state: leadData.state || null,
        pincode: leadData.pincode || null,
        remarks: leadData.remarks || null,
        handled_by: leadData.handledBy || null,
        is_in_contacts: leadData.isInContacts || false,
        is_synced_to_lms: leadData.isSyncedToLMS || false,
        lms_lead_id: leadData.lmsLeadId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', JSON.stringify(error));
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create lead: ${error.message || 'Unknown error'}`);
    }

    console.log('✅ Lead created in database:', data?.id);
    return data as LeadMetadata;
  } catch (error: any) {
    console.error('Error creating lead:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
    throw error;
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
      console.error('Error updating lead:', JSON.stringify(error));
      throw error;
    }

    console.log('✅ Lead updated:', leadId);
    return data as LeadMetadata;
  } catch (error: any) {
    console.error('Error updating lead:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
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
      console.error('Error marking lead as synced:', JSON.stringify(error));
      return false;
    }

    console.log('✅ Lead marked as synced to LMS:', leadId);
    return true;
  } catch (error: any) {
    console.error('Error marking lead as synced:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
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
      console.error('Error marking lead in contacts:', JSON.stringify(error));
      return false;
    }

    console.log('✅ Lead marked as in contacts:', leadId);
    return true;
  } catch (error: any) {
    console.error('Error marking lead in contacts:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
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
      console.error('Error getting all leads:', JSON.stringify(error));
      throw error;
    }

    return (data as LeadMetadata[]) || [];
  } catch (error: any) {
    console.error('Error getting all leads:', JSON.stringify(error));
    console.error('Error message:', error?.message || 'Unknown error');
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
