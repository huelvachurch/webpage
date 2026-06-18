import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * Checks if the application is running in a native environments (Android, iOS) via Capacitor.
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Gets the current notification permission state for both browser and native platforms.
 */
export const getNotificationPermission = async (): Promise<string> => {
  if (isNative()) {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      return permStatus.display;
    } catch (e) {
      console.error("Error checking native permissions:", e);
      return 'default';
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return (window as any).Notification.permission;
    }
    return 'default';
  }
};

/**
 * Requests notification permissions for both local and push alerts on browser and native platforms.
 */
export const requestNotificationPermission = async (): Promise<string> => {
  if (isNative()) {
    try {
      const localResult = await LocalNotifications.requestPermissions();
      const pushResult = await PushNotifications.requestPermissions();
      return localResult.display === 'granted' && pushResult.receive === 'granted' ? 'granted' : 'denied';
    } catch (e) {
      console.error("Error asking native permissions:", e);
      return 'denied';
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return await (window as any).Notification.requestPermission();
    }
    return 'denied';
  }
};

/**
 * Configures listeners and triggers registration for Native Push Notification service.
 */
export const registerNativePush = async (onToken: (token: string) => void): Promise<void> => {
  if (!isNative()) return;

  try {
    // Request permission to native system to receive notifications
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive === 'granted') {
      // Register with Apple / Google push services
      await PushNotifications.register();
    }
    
    // Listen for register token successfully created
    await PushNotifications.addListener('registration', (token) => {
      console.log('Native Push Registration token:', token.value);
      if (onToken) {
        onToken(token.value);
      }
    });

    // Listen for register token failing to create
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Native Push registration error:', error);
    });

    // Listen for push notifications arriving of active foreground app
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Foreground push notification received native side:', notification);
    });
    
    // Listen for action taken on notification clicks
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Action performed on native notification:', notification);
    });
  } catch (e) {
    console.error("Failed to run native push registration logic flow:", e);
  }
};

/**
 * Triggers a local/offline visual notification on the device.
 */
export const triggerLocalNotification = async (title: string, body: string): Promise<void> => {
  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000) + 1,
            schedule: { at: new Date(Date.now() + 500) }, // Trigger immediately
            sound: 'beep.wav',
            attachments: [],
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (e) {
      console.error("Error scheduling native local notification:", e);
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
      try {
        new (window as any).Notification(title, {
          body,
          icon: "/images/LogoPWA.png",
          tag: "local-notification-system"
        });
      } catch (err) {
        console.error("PWA Web notification failed, fallback console:", err);
      }
    }
  }
};
