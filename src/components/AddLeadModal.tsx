/**
 * Add Lead Modal Component
 * Simplified form for adding leads from notification clicks
 */

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/lib/supabase';
import { createLead } from '@/services/leadsMetadataService';
import { ensureAuth } from '@/lib/autoAuth';
import { addToOfflineQueue, recordSupabaseError, isLikelyOffline, getQueueCount } from '@/lib/offlineQueue';

interface AddLeadModalProps {
  phoneNumber: string;
  actionType: string;
  onClose: () => void;
}

interface FormData {
  // Basic Info
  leadDate: string;
  leadTime: string;
  clientPlatform: string;
  name: string;
  
  // Contact Details
  email: string;
  alternatePhone: string;
  
  // Business Info
  company: string;
  designation: string;
  adEnquiry: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Additional
  remarks: string;
  handledBy: string;
  notes: string;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ phoneNumber, actionType, onClose }) => {
  // Normalize phone number - remove country code (91) if present
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return phone;
    const trimmed = phone.trim();
    // If phone starts with 91 and is longer than 10 digits, remove 91 prefix
    if (trimmed.startsWith('91') && trimmed.length > 10) {
      return trimmed.substring(2);
    }
    return trimmed;
  };
  
  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  // Get user email from localStorage (set during login)
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '';
  
  const [formData, setFormData] = useState<FormData>({
    leadDate: currentDate,
    leadTime: currentTime,
    clientPlatform: '',
    name: '',
    email: '',
    alternatePhone: '',
    company: '',
    designation: '',
    adEnquiry: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    remarks: '',
    handledBy: userEmail,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Helper function: Check if phone exists in device contacts
  const checkDeviceContacts = async (phone: string): Promise<{ name: string } | null> => {
    if (!Capacitor.isNativePlatform()) return null;
    
    try {
      // Check READ_CONTACTS permission
      const permission = await Contacts.checkPermissions();
      if (permission.contacts !== 'granted') {
        const requestResult = await Contacts.requestPermissions();
        if (requestResult.contacts !== 'granted') {
          console.log('📱 Contacts permission denied - skipping auto-fill');
          return null;
        }
      }

      // Search contacts by phone number
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        },
      });

      const normalizedSearchPhone = normalizePhoneNumber(phone);
      
      // Find matching contact by normalized phone
      for (const contact of result.contacts) {
        if (contact.phones && contact.phones.length > 0) {
          for (const phoneEntry of contact.phones) {
            const normalizedContactPhone = normalizePhoneNumber(phoneEntry.number || '');
            if (normalizedContactPhone === normalizedSearchPhone) {
              const contactName = contact.name?.display || contact.name?.given || '';
              if (contactName) {
                console.log('✅ Found in contacts:', contactName);
                return { name: contactName };
              }
            }
          }
        }
      }
      
      console.log('📱 Phone not found in contacts');
      return null;
    } catch (e: any) {
      console.error('❌ Error checking contacts:', e?.message);
      return null;
    }
  };

  // Helper function: Check if phone exists in leads_metadata database
  const checkLeadsDatabase = async (phone: string): Promise<{ name: string } | null> => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Query leads_metadata for existing lead with this phone
      const { data, error } = await supabase
        .from('leads_metadata')
        .select('contact_name')
        .eq('phone_number', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - expected, not an error
          console.log('📊 Phone not found in database');
        } else {
          console.error('❌ Database query error:', error.message);
        }
        return null;
      }

      if (data && data.contact_name) {
        console.log('✅ Found in database:', data.contact_name);
        return { name: data.contact_name };
      }

      return null;
    } catch (e: any) {
      console.error('❌ Error checking database:', e?.message);
      return null;
    }
  };

  // Auto-fill effect: Check contacts and database when modal opens
  useEffect(() => {
    const autoFillLeadData = async () => {
      if (!phoneNumber || isAutoFilling) return;
      
      setIsAutoFilling(true);
      console.log('🔍 Auto-filling lead data for:', phoneNumber);

      try {
        // Priority 1: Check device contacts
        const contactData = await checkDeviceContacts(phoneNumber);
        if (contactData && contactData.name) {
          console.log('✅ Auto-filled from contacts:', contactData.name);
          setFormData(prev => ({
            ...prev,
            name: contactData.name,
          }));
          setIsAutoFilling(false);
          return;
        }

        // Priority 2: Check leads_metadata database
        const dbData = await checkLeadsDatabase(phoneNumber);
        if (dbData && dbData.name) {
          console.log('✅ Auto-filled from database:', dbData.name);
          setFormData(prev => ({
            ...prev,
            name: dbData.name,
          }));
          setIsAutoFilling(false);
          return;
        }

        console.log('ℹ️ No existing data found - form remains empty');
      } catch (e: any) {
        console.error('❌ Auto-fill error:', e?.message);
      } finally {
        setIsAutoFilling(false);
      }
    };

    autoFillLeadData();
  }, [phoneNumber]); // Only run when phoneNumber changes

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

      // Normalize phone numbers before saving
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const normalizedAlternatePhone = formData.alternatePhone ? normalizePhoneNumber(formData.alternatePhone) : '';
      
      console.log('📞 Phone normalization:', phoneNumber, '→', normalizedPhone);
      if (formData.alternatePhone) {
        console.log('📞 Alternate phone normalization:', formData.alternatePhone, '→', normalizedAlternatePhone);
      }

      // Try to save to database
      const result = await createLead(userId, {
        phoneNumber: normalizedPhone,
        contactName: formData.name,
        company: formData.company,
        email: formData.email,
        designation: formData.designation,
        notes: formData.notes,
        leadDate: formData.leadDate,
        leadTime: formData.leadTime,
        clientPlatform: formData.clientPlatform,
        adEnquiry: formData.adEnquiry,
        alternatePhone: normalizedAlternatePhone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        remarks: formData.remarks,
        handledBy: formData.handledBy,
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
        
        // Normalize phone numbers before saving to offline queue
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const normalizedAlternatePhone = formData.alternatePhone ? normalizePhoneNumber(formData.alternatePhone) : '';
        
        // Get userId for offline queue
        const userId = await ensureAuth();
        addToOfflineQueue(userId, {
          phoneNumber: normalizedPhone,
          contactName: formData.name,
          company: formData.company,
          email: formData.email,
          designation: formData.designation,
          notes: formData.notes,
          leadDate: formData.leadDate,
          leadTime: formData.leadTime,
          clientPlatform: formData.clientPlatform,
          adEnquiry: formData.adEnquiry,
          alternatePhone: normalizedAlternatePhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          remarks: formData.remarks,
          handledBy: formData.handledBy,
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
      
      // Normalize phone numbers before syncing
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const normalizedAlternatePhone = formData.alternatePhone ? normalizePhoneNumber(formData.alternatePhone) : '';
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-lms-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          leadName: formData.name,
          company: formData.company,
          email: formData.email,
          designation: formData.designation,
          notes: formData.notes,
          leadDate: formData.leadDate,
          leadTime: formData.leadTime,
          clientPlatform: formData.clientPlatform,
          adEnquiry: formData.adEnquiry,
          alternatePhone: normalizedAlternatePhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          remarks: formData.remarks,
          handledBy: formData.handledBy,
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
    
    // Validation
    if (!formData.name.trim()) {
      setError('Client Name is required');
      return;
    }
    
    if (formData.name.length > 100) {
      setError('Client Name must be 100 characters or less');
      return;
    }
    
    if (!formData.clientPlatform) {
      setError('Client Platform is required');
      return;
    }
    
    // Validate alternate phone if provided (must be 10 digits)
    if (formData.alternatePhone && !/^\d{10}$/.test(formData.alternatePhone)) {
      setError('Alternate Phone must be exactly 10 digits');
      return;
    }
    
    // Validate pincode if provided (must be 6 digits)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      setError('Pincode must be exactly 6 digits');
      return;
    }
    
    // Validate remarks length
    if (formData.remarks.length > 500) {
      setError('Remarks must be 500 characters or less');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Normalize action type to handle all formats:
      // add-all/ADD_BOTH/ADD_NEW, add-to-contacts/ADD_CONTACT, add-to-lms/ADD_LMS, add-to-db/ADD_DB
      const normalizedAction = actionType.toUpperCase().replace(/-/g, '_')
        .replace('ADD_ALL', 'ADD_BOTH')
        .replace('ADD_NEW', 'ADD_BOTH')  // Treat ADD_NEW as ADD_BOTH
        .replace('ADD_TO_CONTACTS', 'ADD_CONTACT')
        .replace('ADD_TO_DB', 'ADD_DB')
        .replace('ADD_TO_LMS', 'ADD_LMS');
      console.log('🔄 Normalized action:', actionType, '->', normalizedAction);
      
      // Validate action type
      const validActions = ['ADD_BOTH', 'ADD_CONTACT', 'ADD_DB', 'ADD_LMS', 'ALREADY_EXISTS', 'SYNC_TO_LMS'];
      if (!validActions.includes(normalizedAction)) {
        console.error('⚠️ Unknown action type:', normalizedAction, '- defaulting to ADD_BOTH');
        // Default to ADD_BOTH if unknown action
      }
      
      // Perform actions based on actionType
      let contactResult: { success: boolean; message?: string } = { success: true };
      let didSaveAnything = false;
      
      // Step 1: Add to contacts if needed
      if (normalizedAction === 'ADD_BOTH' || normalizedAction === 'ADD_CONTACT') {
        console.log('📱 Adding to Android contacts...');
        contactResult = await addToAndroidContacts();
        
        if (!contactResult.success) {
          throw new Error(`Contact save failed: ${contactResult.message}`);
        }
        didSaveAnything = true;
      }

      // Step 2: Save to database (for ADD_BOTH, ADD_CONTACT, ADD_LMS, ADD_DB)
      // ADD_CONTACT should also update DB to mark is_in_contacts=true
      if (normalizedAction === 'ADD_BOTH' || normalizedAction === 'ADD_CONTACT' || normalizedAction === 'ADD_LMS' || normalizedAction === 'ADD_DB') {
        console.log('💾 Saving to leads metadata and database...');
        await saveToLeadsMetadata();
        didSaveAnything = true;
        
        // Step 3: Sync to LMS (only if not ADD_DB or ADD_CONTACT)
        if (normalizedAction !== 'ADD_DB' && normalizedAction !== 'ADD_CONTACT') {
          console.log('🌐 Syncing to LMS...');
          await syncToLMS();
        }
      }
      
      // Validation: If nothing was saved, show error
      if (!didSaveAnything && normalizedAction !== 'ALREADY_EXISTS') {
        throw new Error(`No save action performed for: ${normalizedAction}`);
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
              {(actionType === 'ADD_BOTH' || actionType === 'add-all' || actionType === 'ADD_NEW') && '📱 Will save to: Phone Contacts + Database + LMS'}
              {(actionType === 'ADD_CONTACT' || actionType === 'add-to-contacts') && '📱 Will save to: Phone Contacts + Database (update)'}
              {(actionType === 'ADD_LMS' || actionType === 'add-to-lms') && '🏢 Will save to: Database + LMS'}
              {(actionType === 'ADD_DB' || actionType === 'add-to-db') && '💾 Will save to: Database only'}
              {(actionType === 'already-exists' || actionType === 'ALREADY_EXISTS') && '✅ Already saved in both places'}
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
            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.leadDate}
                  onChange={(e) => handleChange('leadDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.leadTime}
                  onChange={(e) => handleChange('leadTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Client Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Platform <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.clientPlatform}
                onChange={(e) => handleChange('clientPlatform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSaving}
              >
                <option value="">Select Platform</option>
                <option value="Google">Google</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter client name (max 100 characters)"
                maxLength={100}
                required
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.name.length}/100 characters</p>
            </div>

            {/* Ad Enquiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Enquiry
              </label>
              <textarea
                value={formData.adEnquiry}
                onChange={(e) => handleChange('adEnquiry', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What are they enquiring about?"
                disabled={isSaving}
              />
            </div>

            {/* Client Contact (read-only, from phoneNumber prop) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Contact <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>

            {/* Email and Alternate Phone Row */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10 digits"
                  maxLength={10}
                  pattern="\d{10}"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Company and Designation Row */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Address Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Address</h3>
              
              {/* Street Address */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Building, Street"
                  disabled={isSaving}
                />
              </div>

              {/* City, State, Pincode Row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="tel"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="6 digits"
                    maxLength={6}
                    pattern="\d{6}"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional remarks (max 500 characters)..."
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.remarks.length}/500 characters</p>
            </div>

            {/* Handled By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Handled By
              </label>
              <input
                type="email"
                value={formData.handledBy}
                onChange={(e) => handleChange('handledBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your email"
                disabled={isSaving}
              />
            </div>

            {/* Old Notes field (keeping for backward compatibility) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any other notes..."
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
