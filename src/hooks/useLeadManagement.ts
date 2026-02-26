/**
 * useLeadManagement Hook
 * Handles the complete flow of checking phone numbers and adding leads after calls
 */

import { useState, useCallback } from 'react';
import { PhoneNumberLookupResult, AddLeadFormData } from '@/types';
import { lookupPhoneNumber } from '@/services/phoneNumberLookup';
import { saveLeadToAllSources } from '@/services/leadActionService';
import { showLeadNotification, showToast } from '@/services/leadNotificationService';
import { useAuth } from './useAuth';

interface LeadManagementState {
  isChecking: boolean;
  showForm: boolean;
  lookupResult: PhoneNumberLookupResult | null;
  currentPhoneNumber: string | null;
  isSubmitting: boolean;
}

export function useLeadManagement() {
  const { user } = useAuth();
  const [state, setState] = useState<LeadManagementState>({
    isChecking: false,
    showForm: false,
    lookupResult: null,
    currentPhoneNumber: null,
    isSubmitting: false,
  });

  /**
   * Check phone number after call ends
   */
  const checkPhoneAfterCall = useCallback(async (phoneNumber: string): Promise<void> => {
    if (!user?.id) {
      console.error('❌ No user ID available');
      return;
    }

    console.log('🔍 [Lead Management] Checking phone after call:', phoneNumber);
    
    setState(prev => ({
      ...prev,
      isChecking: true,
      currentPhoneNumber: phoneNumber,
    }));

    try {
      // Lookup phone number across all sources
      const result = await lookupPhoneNumber(phoneNumber, user.id);
      
      setState(prev => ({
        ...prev,
        isChecking: false,
        lookupResult: result,
      }));

      // Determine what to do based on results
      if (result.foundInContacts && result.foundInLMS) {
        // Already exists everywhere - just show info toast
        showToast(`${result.contactName || phoneNumber} is already in contacts and LMS`);
        return;
      }

      // Show notification with appropriate action
      showLeadNotification(result, (action) => {
        handleNotificationAction(action, result);
      });

    } catch (error) {
      console.error('❌ Error checking phone:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
      }));
    }
  }, [user]);

  /**
   * Handle notification action click
   */
  const handleNotificationAction = useCallback((
    action: string,
    result: PhoneNumberLookupResult
  ) => {
    console.log('🔔 [Lead Management] Notification action:', action);

    switch (action) {
      case 'add-all':
      case 'add-to-contacts':
      case 'add-to-lms':
      case 'sync-to-lms':
        // Show the form
        setState(prev => ({
          ...prev,
          showForm: true,
          lookupResult: result,
        }));
        break;
        
      case 'already-exists':
        // Do nothing, already showed toast
        break;

      default:
        console.log('Unknown action:', action);
    }
  }, []);

  /**
   * Handle form submission
   */
  const handleFormSubmit = useCallback(async (formData: AddLeadFormData): Promise<void> => {
    if (!user?.id) {
      console.error('❌ No user ID available');
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      console.log('💾 [Lead Management] Submitting form:', formData);

      const result = await saveLeadToAllSources(formData, user.id);

      if (result.success) {
        // Show success message
        const messages: string[] = [];
        if (result.savedToContacts) messages.push('contacts');
        if (result.savedToLeads) messages.push('leads');
        if (result.syncedToLMS) messages.push('LMS');

        showToast(`✅ Saved to ${messages.join(', ')}`);

        // Close form
        setState(prev => ({
          ...prev,
          showForm: false,
          isSubmitting: false,
          lookupResult: null,
          currentPhoneNumber: null,
        }));
      } else {
        // Show errors
        if (result.errors.length > 0) {
          showToast(`⚠️ Errors: ${result.errors.join(', ')}`);
        } else {
          showToast('⚠️ No actions were completed');
        }
        setState(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      showToast('❌ Error saving lead');
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [user]);

  /**
   * Cancel form
   */
  const handleFormCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      showForm: false,
      lookupResult: null,
      currentPhoneNumber: null,
      isSubmitting: false,
    }));
  }, []);

  /**
   * Manual trigger to show form for a phone number
   */
  const showAddLeadForm = useCallback(async (phoneNumber: string): Promise<void> => {
    if (!user?.id) {
      console.error('❌ No user ID available');
      return;
    }

    setState(prev => ({
      ...prev,
      isChecking: true,
      currentPhoneNumber: phoneNumber,
    }));

    try {
      const result = await lookupPhoneNumber(phoneNumber, user.id);
      
      setState(prev => ({
        ...prev,
        isChecking: false,
        showForm: true,
        lookupResult: result,
      }));
    } catch (error) {
      console.error('❌ Error checking phone:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
      }));
    }
  }, [user]);

  return {
    // State
    isChecking: state.isChecking,
    showForm: state.showForm,
    lookupResult: state.lookupResult,
    currentPhoneNumber: state.currentPhoneNumber,
    isSubmitting: state.isSubmitting,

    // Actions
    checkPhoneAfterCall,
    handleFormSubmit,
    handleFormCancel,
    showAddLeadForm,
  };
}

export default useLeadManagement;
