import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { REMINDER_HOUR, REMINDER_MINUTE } from './notificationLogic';

// ─────────────────────────────────────────────────────────────────────────────
// Local + remote push notifications (expo-notifications) — Phase 1 Batch B.
//
// What works where:
//  - LOCAL notifications (the daily step-goal reminder and the
//    goal-reached congratulation) work in Expo Go and in dev/production
//    builds alike.
//  - REMOTE push: this module only REGISTERS the device's Expo push
//    token (into the `user_push_tokens` Supabase table, see
//    supabase/schema.sql). Actually SENDING a remote push needs a
//    sender — a Supabase Edge Function or EAS-side job calling the Expo
//    Push Service — which is an owner infrastructure step, deliberately
//    not part of the app. In Expo Go, remote push is unavailable on
//    Android (SDK 53+) and unreliable on iOS, so token registration is
//    skipped entirely there.
//
// Every function in this module is failure-proof: notification problems
// must never crash or block the app, so everything is wrapped and
// errors are logged, never thrown.
// ─────────────────────────────────────────────────────────────────────────────

const REMINDER_ID_KEY = 'notif_daily_reminder_id_v1';
const PERMISSION_ASKED_KEY = 'notif_permission_asked_v1';

/** True when running inside Expo Go (limited notification support). */
export function isExpoGo(): boolean {
  try {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    return false;
  }
}

/**
 * How notifications behave while the app is in the foreground. Called
 * once at module scope of the root layout (the Notifications screen
 * sets an equivalent handler too — they agree by design).
 */
export function initNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log('Notification handler setup failed:', e);
  }
}

/** Current OS notification permission without prompting. */
export async function getNotificationPermission(): Promise<boolean> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch (e) {
    console.log('Notification permission check failed:', e);
    return false;
  }
}

/**
 * Ask the OS for notification permission (records that we asked, so the
 * automatic first-run prompt happens at most once — afterwards only the
 * Settings toggle asks again, as an explicit user gesture).
 * Returns whether permission is granted afterwards.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true').catch(() => {});
    return granted;
  } catch (e) {
    console.log('Notification permission request failed:', e);
    return false;
  }
}

/** Whether the automatic permission prompt has already been shown once. */
export async function hasAskedNotificationPermission(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) === 'true';
  } catch {
    return false;
  }
}

/**
 * (Re)schedule the single daily step-goal reminder at
 * REMINDER_HOUR:REMINDER_MINUTE local time. Any previously scheduled
 * reminder is cancelled first, so language/content changes and repeated
 * setup calls can never stack duplicates. Returns the identifier.
 */
export async function scheduleDailyReminder(content: {
  title: string;
  body: string;
}): Promise<string | null> {
  try {
    await cancelDailyReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { route: '/notifications' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id).catch(() => {});
    return id;
  } catch (e) {
    console.log('Scheduling daily reminder failed:', e);
    return null;
  }
}

/** Cancel the daily reminder if one is scheduled. */
export async function cancelDailyReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(REMINDER_ID_KEY).catch(() => {});
    }
  } catch (e) {
    console.log('Cancelling daily reminder failed:', e);
  }
}

/** Fire a one-off local notification right now (goal congratulation). */
export async function fireImmediateNotification(content: {
  title: string;
  body: string;
}): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { route: '/notifications' },
      },
      trigger: null,
    });
    return true;
  } catch (e) {
    console.log('Firing local notification failed:', e);
    return false;
  }
}

/**
 * Register this device's Expo push token for the signed-in user so a
 * future server-side sender can reach it. Upserts into
 * `user_push_tokens` on (user_id, token) — re-registering after a token
 * refresh just bumps updated_at. Skipped in Expo Go (no remote push)
 * and when Supabase is unconfigured or permission is not granted.
 * Never throws.
 */
export async function registerExpoPushToken(userId: string | null): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) return false;
  if (isExpoGo()) return false;
  try {
    if (!(await getNotificationPermission())) return false;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        token: token.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
    if (error) {
      console.log('Push token registration failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log('Push token registration failed:', e);
    return false;
  }
}

/**
 * Subscribe to Expo push-token changes (the OS/Expo can rotate the
 * token); the callback re-registers. No-op subscription in Expo Go.
 */
export function subscribeToPushTokenChanges(
  onToken: (token: string) => void
): { remove: () => void } {
  if (isExpoGo()) return { remove: () => {} };
  try {
    return Notifications.addPushTokenListener((token) => {
      try {
        onToken(token.data);
      } catch (e) {
        console.log('Push token listener failed:', e);
      }
    });
  } catch (e) {
    console.log('Push token subscription failed:', e);
    return { remove: () => {} };
  }
}

/** Extract the in-app route a notification payload asks to open. */
export function routeFromNotificationData(data: unknown): string | null {
  if (data && typeof data === 'object' && 'route' in data) {
    const route = (data as { route?: unknown }).route;
    if (typeof route === 'string' && route.startsWith('/')) return route;
  }
  return null;
}

/**
 * Listen for notification taps (warm start). Calls `onRoute` with the
 * payload's route when one is present.
 */
export function addNotificationTapListener(
  onRoute: (route: string) => void
): { remove: () => void } {
  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFromNotificationData(
        response.notification.request.content.data
      );
      if (route) onRoute(route);
    });
  } catch (e) {
    console.log('Notification tap listener failed:', e);
    return { remove: () => {} };
  }
}

/** Route requested by the notification that cold-started the app, if any. */
export async function getColdStartNotificationRoute(): Promise<string | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return routeFromNotificationData(response.notification.request.content.data);
  } catch (e) {
    console.log('Cold-start notification read failed:', e);
    return null;
  }
}
