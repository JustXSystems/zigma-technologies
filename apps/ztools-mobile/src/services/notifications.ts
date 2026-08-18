import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

type NotificationsModule = typeof import('expo-notifications');

let handlerReady = false;

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  // Remote push APIs throw on import in Expo Go (SDK 53+). Skip them here.
  if (isExpoGo()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function ensureNotificationHandler(Notifications: NotificationsModule) {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function projectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

async function ensureNotificationPermissions() {
  const Notifications = await loadNotifications();
  if (!Notifications || !Device.isDevice) return false;

  await ensureNotificationHandler(Notifications);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getExpoPushToken() {
  const Notifications = await loadNotifications();
  if (!Notifications || !Device.isDevice) return null;
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  const id = projectId();
  if (!id) {
    console.warn('Missing EAS project ID — set extra.eas.projectId in app.json');
    return null;
  }

  await ensureNotificationHandler(Notifications);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ztools-default', {
      name: 'ZTools updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#ff6b1a',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return token.data;
}

export async function registerPushToken(authToken: string, expoPushToken: string) {
  await fetch(`${API_BASE_URL}/api/ztools/mobile/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      expoPushToken,
      platform: Platform.OS,
    }),
  });
}

export async function unregisterPushToken(authToken: string, expoPushToken?: string | null) {
  await fetch(`${API_BASE_URL}/api/ztools/mobile/push-token`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(expoPushToken ? { expoPushToken } : {}),
  });
}

export function addNotificationResponseListener(onNavigateDashboard: () => void) {
  let removed = false;
  let unsubscribe: (() => void) | undefined;

  void loadNotifications().then((Notifications) => {
    if (!Notifications || removed) return;
    void ensureNotificationHandler(Notifications).then(() => {
      if (removed) return;
      const sub = Notifications.addNotificationResponseReceivedListener(() => {
        onNavigateDashboard();
      });
      unsubscribe = () => sub.remove();
    });
  });

  return () => {
    removed = true;
    unsubscribe?.();
  };
}
