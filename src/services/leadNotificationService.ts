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
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform, showing web notification');
    showWebNotification(lookupResult, onAction);
    return;
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    // Check if permission is already granted (don't request if app is in background)
    const permission = await LocalNotifications.checkPermissions();
    console.log('📋 [Notification] Current permission status:', permission.display);
    
    // If not granted, try to request (may fail if app is in background)
    if (permission.display !== 'granted') {
      console.log('⚠️ [Notification] Permission not granted, attempting to request...');
      try {
        const requestResult = await LocalNotifications.requestPermissions();
        if (requestResult.display !== 'granted') {
          console.warn('⚠️ [Notification] Permission denied or request blocked (app may be in background)');
          console.warn('   User needs to manually enable notifications in Settings → Apps → Call Monitor → Permissions');
          return;
        }
      } catch (requestError) {
        console.error('❌ [Notification] Permission request failed (likely app in background):', requestError);
        console.warn('   Notification blocked - enable in Settings → Apps → Call Monitor → Permissions → Notifications');
        return;
      }
    }

    const notification = getNotificationMessage(lookupResult);

    // Use a safe notification ID (Java int max: 2,147,483,647)
    // Fixed ID for lead notifications allows replacing previous notification
    const notificationId = 1001;
    
    console.log('📢 [Notification] Scheduling notification:', {
      id: notificationId,
      title: notification.title,
      body: notification.message,
      action: notification.action
    });

    // Schedule notification
    await LocalNotifications.schedule({
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

    // Listen for notification action
    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Notification action performed:', notification);
      const action = notification.notification.extra?.action;
      if (action) {
        onAction(action);
      }
    });

    console.log('✅ Notification shown:', notification.title);
  } catch (error) {
    console.error('❌ Error showing notification:', error);
    // Fallback to web notification
    showWebNotification(lookupResult, onAction);
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
