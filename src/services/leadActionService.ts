/**
 * Lead Action Service
 * Handles saving leads to Android Contacts, Local Database, and External LMS
 */

import { AddLeadFormData } from '@/types';
import { addToAndroidContacts } from './androidContacts';
import { createLead, updateLead, getLeadByPhoneNumber } from './leadsMetadataService';
import { showToast } from './leadNotificationService';

/**
 * Sync lead to external LMS
 * This is a placeholder - you'll need to implement the actual LMS API call
 */
async function syncLeadToLMS(leadData: {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  designation?: string;
  notes?: string;
}): Promise<{ success: boolean; leadId?: string }> {
  try {
    // TODO: Implement actual LMS API call
    // For now, we'll simulate the API call
    
    console.log('🌐 Syncing lead to external LMS:', leadData);
    
    // Example implementation:
    // const response = await fetch(`${LMS_BASE_URL}/api/leads/create`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${LMS_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     name: leadData.name,
    //     phone: leadData.phone,
    //     company: leadData.company,
    //     email: leadData.email,
    //     designation: leadData.designation,
    //     notes: leadData.notes,
    //   }),
    // });
    // 
    // const data = await response.json();
    // return { success: true, leadId: data.leadId };

    // Simulated response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      leadId: `LMS_${Date.now()}`,
    };
  } catch (error) {
    console.error('❌ Error syncing lead to LMS:', error);
    return { success: false };
  }
}

/**
 * Process and save lead to all requested destinations
 */
export async function saveLeadToAllSources(
  formData: AddLeadFormData,
  userId: string
): Promise<{
  success: boolean;
  savedToContacts: boolean;
  savedToLeads: boolean;
  syncedToLMS: boolean;
  leadId?: string;
  errors: string[];
}> {
  const result = {
    success: false,
    savedToContacts: false,
    savedToLeads: false,
    syncedToLMS: false,
    leadId: undefined as string | undefined,
    errors: [] as string[],
  };

  console.log('💾 [Save Lead] Starting save process:', {
    phone: formData.phoneNumber,
    name: formData.contactName,
    addToContacts: formData.addToContacts,
    addToLeads: formData.addToLeads,
    syncToLMS: formData.syncToLMS,
  });

  // Step 1: Add to Android Contacts (if requested)
  if (formData.addToContacts) {
    try {
      showToast('Adding to contacts...');
      const contactSuccess = await addToAndroidContacts({
        name: formData.contactName,
        phone: formData.phoneNumber,
        email: formData.email,
        company: formData.company,
        designation: formData.designation,
        notes: formData.notes,
      });

      if (contactSuccess) {
        result.savedToContacts = true;
        console.log('✅ Added to Android contacts');
        showToast('Added to contacts ✓');
      } else {
        result.errors.push('Failed to add to contacts');
        console.error('❌ Failed to add to contacts');
      }
    } catch (error) {
      result.errors.push('Error adding to contacts');
      console.error('❌ Error adding to contacts:', error);
    }
  }

  // Step 2: Save to Local Leads Database (if requested)
  if (formData.addToLeads) {
    try {
      showToast('Saving to local database...');
      
      // Check if lead already exists
      const existingLead = await getLeadByPhoneNumber(formData.phoneNumber, userId);

      if (existingLead) {
        // Update existing lead
        const updated = await updateLead(existingLead.id, userId, {
          contact_name: formData.contactName,
          company: formData.company || undefined,
          email: formData.email || undefined,
          designation: formData.designation || undefined,
          notes: formData.notes || undefined,
          is_in_contacts: formData.addToContacts || existingLead.is_in_contacts,
        });

        if (updated) {
          result.savedToLeads = true;
          result.leadId = updated.id;
          console.log('✅ Updated existing lead in database');
          showToast('Lead updated ✓');
        }
      } else {
        // Create new lead
        const newLead = await createLead(userId, {
          phoneNumber: formData.phoneNumber,
          contactName: formData.contactName,
          company: formData.company,
          email: formData.email,
          designation: formData.designation,
          notes: formData.notes,
          isInContacts: formData.addToContacts,
          isSyncedToLMS: false,
        });

        if (newLead) {
          result.savedToLeads = true;
          result.leadId = newLead.id;
          console.log('✅ Saved to local leads database');
          showToast('Saved to leads ✓');
        } else {
          result.errors.push('Failed to save to local database');
          console.error('❌ Failed to save to leads database');
        }
      }
    } catch (error) {
      result.errors.push('Error saving to database');
      console.error('❌ Error saving to leads database:', error);
    }
  }

  // Step 3: Sync to External LMS (if requested)
  if (formData.syncToLMS) {
    try {
      showToast('Syncing to LMS...');
      const lmsResult = await syncLeadToLMS({
        name: formData.contactName,
        phone: formData.phoneNumber,
        company: formData.company,
        email: formData.email,
        designation: formData.designation,
        notes: formData.notes,
      });

      if (lmsResult.success) {
        result.syncedToLMS = true;
        console.log('✅ Synced to external LMS');
        showToast('Synced to LMS ✓');

        // Update local lead with LMS ID if we saved to local database
        if (result.leadId && lmsResult.leadId) {
          await updateLead(result.leadId, userId, {
            is_synced_to_lms: true,
            lms_lead_id: lmsResult.leadId,
          });
        }
      } else {
        result.errors.push('Failed to sync to LMS');
        console.error('❌ Failed to sync to LMS');
      }
    } catch (error) {
      result.errors.push('Error syncing to LMS');
      console.error('❌ Error syncing to LMS:', error);
    }
  }

  // Overall success if at least one action succeeded
  result.success = result.savedToContacts || result.savedToLeads || result.syncedToLMS;

  console.log('✅ [Save Lead] Process complete:', {
    success: result.success,
    contacts: result.savedToContacts,
    leads: result.savedToLeads,
    lms: result.syncedToLMS,
    errors: result.errors,
  });

  return result;
}
