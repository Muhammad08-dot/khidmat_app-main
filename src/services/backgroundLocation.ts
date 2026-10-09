/**
 * Background provider tracking while a job is in progress.
 *
 * Guarded behind EXPO_PUBLIC_BG_LOCATION_ENABLED ('false' by default) —
 * background location is a sensitive permission and should ship only once
 * store-review copy and privacy policy language are ready.
 *
 * Lifecycle:
 *  - startProviderTracking(bookingId)  → when a job moves to in_progress
 *  - stopProviderTracking()            → on completion/cancel
 * The task writes the latest fix straight to `provider_locations` so the
 * customer's live map (track/[id].tsx) updates even when the app is headless.
 */
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { defineTask } from 'expo-task-manager';
import { supabase } from './supabase/client';

const BG_LOCATION_ENABLED = process.env.EXPO_PUBLIC_BG_LOCATION_ENABLED === 'true';
export const TRACKING_TASK_NAME = 'khidmat-provider-tracking';

// Task payload contract persisted in AsyncStorage by start/stop helpers.
const BOOKING_KEY = 'khidmat.activeTrackingBooking';

let AsyncStorageRef: typeof import('@react-native-async-storage/async-storage').default | null = null;
const getAsyncStorage = async () => {
  if (!AsyncStorageRef) {
    AsyncStorageRef = (await import('@react-native-async-storage/async-storage')).default;
  }
  return AsyncStorageRef;
};

/** Headless task body — must be registered at module scope, before any start call. */
defineTask(TRACKING_TASK_NAME, async () => {
  try {
    const storage = await getAsyncStorage();
    const bookingId = await storage.getItem(BOOKING_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    if (!bookingId || !user) return { ok: false };

    const coords = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
    if (!coords) return { ok: false };

    await supabase.from('provider_locations').upsert({
      provider_id: user.id,
      booking_id: bookingId,
      lat: coords.coords.latitude,
      lng: coords.coords.longitude,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    console.warn('[bgLocation] task failed:', err);
    return { ok: false };
  }
});

export async function startProviderTracking(bookingId: string): Promise<boolean> {
  if (!BG_LOCATION_ENABLED || Platform.OS === 'web') return false;
  try {
    const granted = await Location.requestBackgroundPermissionsAsync();
    if (!granted.granted) return false;

    const storage = await getAsyncStorage();
    await storage.setItem(BOOKING_KEY, bookingId);

    const already = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
    if (!already) {
      await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15_000,
        distanceInterval: 100, // metres — enough for a live pin, frugal on battery
        foregroundService: {
          notificationTitle: 'Khidmat tracking active',
          notificationBody: 'Sharing your location with the customer for the active job.',
        },
      });
    }
    return true;
  } catch (err) {
    console.warn('[bgLocation] start failed:', err);
    return false;
  }
}

export async function stopProviderTracking(): Promise<void> {
  if (!BG_LOCATION_ENABLED || Platform.OS === 'web') return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
    if (running) {
      await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
    }
    const storage = await getAsyncStorage();
    await storage.removeItem(BOOKING_KEY);
  } catch (err) {
    console.warn('[bgLocation] stop failed:', err);
  }
}
