/**
 * Lead Notification Service
 * Handles showing notifications after call ends based on phone lookup results
 * 
 * REQUIRED PACKAGES:
 * - npm install @capacitor/local-notifications
 * - npm install @capacitor/toast
 */

import { Capacitor } from '@capacitor/core';
import { PhoneNumberLookupResult } from '@/types';
import { getNotificationMessage } from './phoneNumberLookup';

/**
 * Show a local notification
 */
export async function showLeadNotification(
  lookupResult: PhoneNumberLookupResult,
  onAction: (action: string) => void
): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎯 [showLeadNotification] ▶️ FUNCTION CALLED!');
  console.log('🎯 [showLeadNotification] Phone:', lookupResult.phoneNumber);
  console.log('🎯 [showLeadNotification] Time:', new Date().toLocaleTimeString());
  console.log('🎯 [showLeadNotification] Lookup result:', JSON.stringify(lookupResult));
  console.log('═══════════════════════════════════════════════════');
  
  console.log('🔍 [showLeadNotification] Checking platform...');
  console.log('🔍 [showLeadNotification] Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
  console.log('🔍 [showLeadNotification] Capacitor.getPlatform():', Capacitor.getPlatform());
  
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ [showLeadNotification] Not on native platform, showing web notification');
    showWebNotification(lookupResult, onAction);
    return;
  }

  // On Android, the native PhoneLookupWorker handles notifications in background
  // Skip web layer notification to avoid duplicates
  if (Capacitor.getPlatform() === 'android') {
    console.log('ℹ️ [showLeadNotification] Android detected - native worker handles notifications');
    console.log('ℹ️ [showLeadNotification] Skipping web notification to avoid duplicates');
    return;
  }

  console.log('✅ [showLeadNotification] On native platform, proceeding...');
  
  try {
    console.log('📦 [showLeadNotification] About to import LocalNotifications plugin...');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    console.log('✅ [showLeadNotification] Plugin imported successfully!');
    console.log('✅ [showLeadNotification] LocalNotifications object:', typeof LocalNotifications);
    
    // Check if permission is already granted (don't request if app is in background)
    console.log('🔐 [Notification] Checking permissions...');
    const permission = await LocalNotifications.checkPermissions();
    console.log('📋 [Notification] Current permission status:', permission.display);
    console.log('📋 [Notification] Full permission object:', JSON.stringify(permission));
    
    // If not granted, try to request (may fail if app is in background)
    if (permission.display !== 'granted') {
      console.log('⚠️ [Notification] Permission not granted, attempting to request...');
      try {
        const requestResult = await LocalNotifications.requestPermissions();
        console.log('📋 [Notification] Request result:', requestResult.display);
        if (requestResult.display !== 'granted') {
          console.warn('⚠️ [Notification] Permission denied or request blocked (app may be in background)');
          console.warn('   User needs to manually enable notifications in Settings → Apps → Call Monitor → Permissions');
          return;
        }
        console.log('✅ [Notification] Permission granted after request!');
      } catch (requestError) {
        console.error('❌ [Notification] Permission request failed (likely app in background):', requestError);
        console.error('❌ [Notification] Request error details:', JSON.stringify(requestError));
        console.warn('   Notification blocked - enable in Settings → Apps → Call Monitor → Permissions → Notifications');
        return;
      }
    } else {
      console.log('✅ [Notification] Permission already granted!');
    }

    console.log('📝 [Notification] Getting notification message...');
    const notification = getNotificationMessage(lookupResult);
    console.log('✅ [Notification] Message generated:', {
      title: notification.title,
      message: notification.message,
      action: notification.action
    });

    // Use a safe notification ID (Java int max: 2,147,483,647)
    // Fixed ID for lead notifications allows replacing previous notification
    const notificationId = 1001;
    
    console.log('📢 [Notification] About to schedule notification with ID:', notificationId);
    console.log('📢 [Notification] Title:', notification.title);
    console.log('📢 [Notification] Body:', notification.message);
    console.log('📢 [Notification] Action:', notification.action);

    // Schedule notification
    console.log('⏰ [Notification] Calling LocalNotifications.schedule()...');
    try {
      const scheduleResult = await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: notification.title,
            body: notification.message,
            largeBody: notification.message,
            summaryText: 'Call Monitor',
            actionTypeId: notification.action,
            extra: {
              phoneNumber: lookupResult.phoneNumber,
              action: notification.action,
              lookupResult: JSON.stringify(lookupResult),
            },
          },
        ],
      });
      console.log('✅ [Notification] schedule() returned:', JSON.stringify(scheduleResult));
    } catch (scheduleError) {
      console.error('❌ [Notification] schedule() threw error:', scheduleError);
      console.error('❌ [Notification] Error details:', JSON.stringify(scheduleError));
      throw scheduleError; // Re-throw to outer catch
    }

    console.log('✅ [showLeadNotification] Notification shown successfully:', notification.title);
  } catch (error: any) {
    console.error('❌ [showLeadNotification] Error showing notification:', error);
    console.error('❌ [showLeadNotification] Error message:', error?.message);
    console.error('❌ [showLeadNotification] Error stack:', error?.stack);
    console.error('❌ [showLeadNotification] Error JSON:', JSON.stringify(error));
    // Fallback to web notification
    console.log('🔄 [showLeadNotification] Attempting fallback to web notification...');
    try {
      showWebNotification(lookupResult, onAction);
    } catch (fallbackError) {
      console.error('❌ [showLeadNotification] Fallback also failed:', fallbackError);
    }
  }
}

/**
 * Show web notification (fallback for browser)
 */
async function showWebNotification(
  lookupResult: PhoneNumberLookupResult,
  onAction: (action: string) => void
): Promise<void> {
  const notification = getNotificationMessage(lookupResult);
  
  // Check if browser notifications are supported
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const webNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
        tag: 'call-monitor-lead',
        requireInteraction: true,
      });

      webNotification.onclick = () => {
        onAction(notification.action);
        webNotification.close();
      };
    }
  } else {
    console.log('Browser notifications not supported');
  }
}

/**
 * Show in-app alert (alternative to notifications)
 */
export function showLeadAlert(
  lookupResult: PhoneNumberLookupResult,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  const notification = getNotificationMessage(lookupResult);
  
  // For web, we can use a custom modal or alert
  if (window.confirm(`${notification.title}\n\n${notification.message}\n\nWould you like to proceed?`)) {
    onConfirm();
  } else if (onCancel) {
    onCancel();
  }
}

/**
 * Show toast notification (non-intrusive)
 */
export async function showToast(message: string, duration: number = 3000): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({
        text: message,
        duration: duration === 3000 ? 'short' : 'long',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error showing toast:', error);
      alert(message);
    }
  } else {
    // Web fallback
    console.log('Toast:', message);
    alert(message);
  }
}
