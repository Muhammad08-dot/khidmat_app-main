/**
 * Expo push notifications: token registration + best-effort delivery.
 *
 * Tokens are stored in the `push_tokens` table (RLS: owner-managed).
 * Delivery posts directly to the Expo push service, which requires no
 * server secrets for basic sends; token rows are only readable by their
 * owner under RLS, so clients send to tokens they can legitimately see.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase/client';

// Show alerts while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Requests permission (if needed), obtains the Expo push token for this
 * device and upserts it against the user's `push_tokens` row.
 * Safe to call on every sign-in; all failures are non-fatal.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return; // Expo push targets iOS/Android only
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const { error } = await supabase.from('push_tokens').upsert({
      user_id: userId,
      token: tokenResponse.data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (err) {
    // Push is best-effort; never block auth flows on it.
    console.warn('[push] token registration skipped:', (err as Error).message);
  }
}

/** Best-effort fan-out of a notification to a user's registered devices. */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);
    if (error) throw error;
    const tokens = (rows ?? []).map((r: { token: string }) => r.token);
    if (tokens.length === 0) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'expo-html-insertion': 'false',
        'expo-priority': 'normal',
      },
      body: JSON.stringify(
        tokens.map((token) => ({ to: token, title, body, data, sound: 'default' }))
      ),
    });
  } catch (err) {
    console.warn('[push] send skipped:', (err as Error).message);
  }
}
