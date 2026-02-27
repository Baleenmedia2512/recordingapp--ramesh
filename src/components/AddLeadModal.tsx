/**
 * Add Lead Modal Component
 * Simplified form for adding leads from notification clicks
 */

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { createLead } from '@/services/leadsMetadataService';
import { ensureAuth } from '@/lib/autoAuth';
import { addToOfflineQueue, recordSupabaseError, isLikelyOffline, getQueueCount } from '@/lib/offlineQueue';

interface AddLeadModalProps {
  phoneNumber: string;
  actionType: string;
  onClose: () => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  designation: string;
  notes: string;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ phoneNumber, actionType, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    company: '',
    email: '',
    designation: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToAndroidContacts = async (): Promise<{ success: boolean; message?: string }> => {
    if (!Capacitor.isNativePlatform()) return { success: true };

    try {
      // Check WRITE_CONTACTS permission first
      const { CallMonitor } = await import('@/plugins/CallMonitorPlugin');
      const { Contacts } = await import('@capacitor-community/contacts');
      
      const permission = await Contacts.checkPermissions();
      console.log('📱 Contact permission status:', permission);
      
      if (permission.contacts !== 'granted') {
        console.log('📱 Requesting WRITE_CONTACTS permission...');
        const requestResult = await Contacts.requestPermissions();
        
        if (requestResult.contacts !== 'granted') {
          return {
            success: false,
            message: 'Permission denied: Cannot write to contacts. Please enable in Settings.'
          };
        }
      }
      
      // Call native plugin to add contact (uses Android ContactsContract API)
      const result = await CallMonitor.addContact({
        name: formData.name,
        phoneNumber: phoneNumber,
        email: formData.email || '',
        company: formData.company || '',
      });
      
      console.log('✅ Contact save result:', result);
      
      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Failed to save contact'
        };
      }
      
      return { success: true };
    } catch (e: any) {
      console.error('❌ Failed to save contact:', JSON.stringify(e));
      console.error('❌ Contact error message:', e?.message || 'Unknown error');
      return {
        success: false,
        message: e?.message || 'Unknown error saving contact'
      };
    }
  };

  const saveToLeadsMetadata = async () => {
    try {
      // Use auto-auth to ensure we have a valid session
      const userId = await ensureAuth();
      console.log('✅ [Add Lead Modal] Auth verified:', userId);

      // Try to save to database
      const result = await createLead(userId, {
        phoneNumber: phoneNumber,
        contactName: formData.name,
        company: formData.company,
        email: formData.email,
        designation: formData.designation,
        notes: formData.notes,
        isInContacts: actionType === 'ADD_BOTH' || actionType === 'ADD_CONTACT' || actionType === 'add-all' || actionType === 'add-to-contacts' || actionType === 'add-to-db',
        isSyncedToLMS: false,
      });

      if (!result) {
        throw new Error('Failed to save to leads_metadata');
      }

      console.log('✅ Lead saved to database:', result.id);
      return true;
    } catch (e: any) {
      console.error('❌ Failed to save lead:', JSON.stringify(e));
      console.error('❌ Error message:', e?.message || 'Unknown error');
      
      // If error is network timeout, save to offline queue
      if (e?.message?.includes('timeout') || e?.message?.includes('offline')) {
        console.log('📦 [Add Lead Modal] Device offline - saving to local queue');
        recordSupabaseError(e);
        
        // Get userId for offline queue
        const userId = await ensureAuth();
        addToOfflineQueue(userId, {
          phoneNumber: phoneNumber,
          contactName: formData.name,
          company: formData.company,
          email: formData.email,
          designation: formData.designation,
          notes: formData.notes,
          isInContacts: actionType === 'ADD_BOTH' || actionType === 'ADD_CONTACT' || actionType === 'add-all' || actionType === 'add-to-contacts' || actionType === 'add-to-db',
          isSyncedToLMS: false,
        });
        
        console.log('✅ [Add Lead Modal] Saved to offline queue - will sync when online');
        return true; // Return success since we saved locally
      }
      
      throw e;
    }
  };

  const syncToLMS = async () => {
    try {
      const SUPABASE_URL = 'https://wkwrrdcjknvupwsfdjtd.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrd3JyZGNqa252dXB3c2ZkanRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDI2OTIsImV4cCI6MjA4MzQxODY5Mn0.nMYFs8RtopRXN5MzDHfsMIiFoTbwTloACdgpIWk3UgA';
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-lms-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          leadName: formData.name,
          company: formData.company,
          email: formData.email,
          designation: formData.designation,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync to LMS');
      }

      console.log('✅ Lead synced to LMS');
      return true;
    } catch (e) {
      console.error('❌ Failed to sync to LMS:', e);
      // Don't fail if LMS sync fails
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Normalize action type to handle all formats:
      // add-all/ADD_BOTH, add-to-contacts/ADD_CONTACT, add-to-lms/ADD_LMS, add-to-db/ADD_DB
      const normalizedAction = actionType.toUpperCase().replace(/-/g, '_')
        .replace('ADD_ALL', 'ADD_BOTH')
        .replace('ADD_TO_CONTACTS', 'ADD_CONTACT')
        .replace('ADD_TO_DB', 'ADD_DB')
        .replace('ADD_TO_LMS', 'ADD_LMS');
      console.log('🔄 Normalized action:', actionType, '->', normalizedAction);
      
      // Perform actions based on actionType
      let contactResult: { success: boolean; message?: string } = { success: true };
      
      if (normalizedAction === 'ADD_BOTH' || normalizedAction === 'ADD_CONTACT') {
        console.log('📱 Adding to Android contacts...');
        contactResult = await addToAndroidContacts();
        
        if (!contactResult.success) {
          throw new Error(`Contact save failed: ${contactResult.message}`);
        }
      }

      if (normalizedAction === 'ADD_BOTH' || normalizedAction === 'ADD_LMS' || normalizedAction === 'ADD_DB') {
        console.log('💾 Saving to leads metadata and database...');
        await saveToLeadsMetadata();
        if (normalizedAction !== 'ADD_DB') {
          await syncToLMS();
        }
      }

      // Success! Check if offline
      const offline = isLikelyOffline();
      const queueCount = getQueueCount();
      
      if (offline && queueCount > 0) {
        alert(`✅ Lead saved locally (offline mode)\n📦 ${queueCount} items pending sync when online`);
      } else {
        alert('✅ Lead added successfully!');
      }
      onClose();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save lead. Please try again.';
      setError(errorMsg);
      console.error('Save error:', JSON.stringify(err));
      console.error('Save error message:', err?.message || 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Lead</h2>
              <p className="text-sm text-gray-600 mt-1">📞 {phoneNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Action Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              {(actionType === 'ADD_BOTH' || actionType === 'add-all') && '📱 Will save to: Phone Contacts + Database'}
              {(actionType === 'ADD_CONTACT' || actionType === 'add-to-contacts') && '📱 Will save to: Phone Contacts only'}
              {(actionType === 'ADD_LMS' || actionType === 'add-to-lms') && '🏢 Will save to: LMS Database only'}
              {(actionType === 'ADD_DB' || actionType === 'add-to-db') && '💾 Will save to: Database only'}
              {actionType === 'already-exists' && '✅ Already saved in both places'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter contact name"
                required
                disabled={isSaving}
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company name"
                disabled={isSaving}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
                disabled={isSaving}
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Job title"
                disabled={isSaving}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
                disabled={isSaving}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;
