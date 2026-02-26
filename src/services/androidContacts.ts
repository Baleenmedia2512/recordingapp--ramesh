/**
 * Android Contacts Service
 * Handles checking and adding contacts to Android's contact book
 * 
 * REQUIRED PACKAGE: npm install @capacitor-community/contacts
 */

import { Capacitor } from '@capacitor/core';

interface ContactData {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  designation?: string;
  notes?: string;
}

/**
 * Check if a phone number exists in Android contacts
 */
export async function checkPhoneInContacts(
  phoneNumber: string
): Promise<{ found: boolean; name?: string }> {
  console.log('🔍 [Contacts Check] Starting check for:', phoneNumber);
  
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform, skipping contacts check');
    return { found: false };
  }

  try {
    // Check if app is in foreground (permission requests must happen in foreground)
    const { App } = await import('@capacitor/app');
    const appState = await App.getState();
    
    if (!appState.isActive) {
      console.warn('⚠️ [Contacts Check] App is in background - skipping permission request');
      return { found: false };
    }
    
    // Use Capacitor plugin to check contacts
    const { Contacts } = await import('@capacitor-community/contacts');
    
    console.log('🔍 [Contacts Check] Checking current permission status...');
    
    // Check current permission status first
    let permissionStatus;
    try {
      permissionStatus = await Contacts.checkPermissions();
      console.log('🔍 [Contacts Check] Current permission status:', permissionStatus.contacts);
    } catch (error) {
      console.error('❌ [Contacts Check] Failed to check permission status:', error);
      return { found: false };
    }
    
    // If permission not granted, request it (only if app is in foreground)
    if (permissionStatus.contacts !== 'granted') {
      // Double-check app state before requesting (it might have changed)
      const currentState = await App.getState();
      if (!currentState.isActive) {
        console.warn('⚠️ [Contacts Check] App went to background - skipping permission request');
        return { found: false };
      }
      
      console.log('🔍 [Contacts Check] Requesting permissions...');
      try {
        // Wrap permission request with shorter timeout since it may hang
        const permissionPromise = Contacts.requestPermissions();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Permission request timeout')), 3000)
        );
        
        const permission = await Promise.race([permissionPromise, timeoutPromise]) as any;
        console.log('🔍 [Contacts Check] Permission request result:', permission.contacts);
        
        if (permission.contacts !== 'granted') {
          console.warn('⚠️ Contacts permission not granted');
          return { found: false };
        }
      } catch (error: any) {
        console.error('❌ [Contacts Check] Permission request failed:', error);
        return { found: false };
      }
    }

    console.log('🔍 [Contacts Check] Fetching contacts...');

    // Get all contacts (we'll need to optimize this later with a better plugin)
    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
      },
    });
    
    console.log(`🔍 [Contacts Check] Retrieved ${result.contacts.length} contacts`);

    // Normalize the phone number to compare
    const normalizedSearch = phoneNumber.replace(/[\s\-\(\)\+]/g, '');

    // Search through contacts
    for (const contact of result.contacts) {
      if (contact.phones && contact.phones.length > 0) {
        for (const phone of contact.phones) {
          const normalizedContact = phone.number?.replace(/[\s\-\(\)\+]/g, '') || '';
          
          // Check if numbers match (last 10 digits)
          if (
            normalizedSearch.slice(-10) === normalizedContact.slice(-10) ||
            normalizedContact.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedContact)
          ) {
            console.log('✅ [Contacts Check] Found match:', contact.name?.display || 'Unknown');
            return {
              found: true,
              name: contact.name?.display || contact.name?.given || 'Unknown',
            };
          }
        }
      }
    }

    console.log('ℹ️ [Contacts Check] No match found in contacts');
    return { found: false };
  } catch (error) {
    console.error('❌ [Contacts Check] Error checking contacts:', error);
    return { found: false };
  }
}

/**
 * Add a contact to Android's contact book
 */
export async function addToAndroidContacts(contactData: ContactData): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform, cannot add to contacts');
    return false;
  }

  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    
    // Request permission
    const permission = await Contacts.requestPermissions();
    if (permission.contacts !== 'granted') {
      console.error('❌ Contacts permission not granted');
      return false;
    }

    // Create contact object
    const newContact: any = {
      name: {
        given: contactData.name,
        display: contactData.name,
      },
      phones: [
        {
          type: 'mobile',
          number: contactData.phone,
        },
      ],
    };

    // Add email if provided
    if (contactData.email) {
      newContact.emails = [
        {
          type: 'work',
          address: contactData.email,
        },
      ];
    }

    // Add organization if company provided
    if (contactData.company) {
      newContact.organization = {
        company: contactData.company,
        jobTitle: contactData.designation || '',
      };
    }

    // Add notes if provided
    if (contactData.notes) {
      newContact.note = contactData.notes;
    }

    // Create the contact
    const result = await Contacts.createContact({
      contact: newContact,
    });

    if (result && result.contactId) {
      console.log('✅ Contact added successfully:', result.contactId);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error adding contact:', error);
    return false;
  }
}

/**
 * Open Android's contact picker or form
 * This is a fallback if the Contacts plugin doesn't work well
 */
export async function openContactForm(contactData: ContactData): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform');
    return;
  }

  try {
    // Try to use intent to open contacts app with pre-filled data
    if (Capacitor.getPlatform() === 'android') {
      // On Android, we can use an intent
      const intent = {
        action: 'android.intent.action.INSERT',
        type: 'vnd.android.cursor.dir/contact',
        extras: {
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email || '',
          company: contactData.company || '',
          notes: contactData.notes || '',
        },
      };

      // This would require a custom Capacitor plugin to send intents
      console.log('📱 Would open contact form with:', intent);
    }
  } catch (error) {
    console.error('Error opening contact form:', error);
  }
}
