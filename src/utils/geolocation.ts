import * as Location from "expo-location";
import { type LocationCoords } from "./location";

export type { LocationCoords };

/**
 * Requests location permission and returns the current coordinates, or null if
 * denied/unavailable. Mirrors the web `navigator.geolocation.getCurrentPosition`
 * flow used across the app (Home sync, ProviderHome go-online).
 */
export async function getCurrentCoords(): Promise<LocationCoords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("[location] Permission not granted by user");
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: Math.round(pos.coords.latitude * 10000) / 10000,
      lng: Math.round(pos.coords.longitude * 10000) / 10000,
    };
  } catch (err) {
    console.error("[location] Failed to get current position:", err);
    return null;
  }
}

export default getCurrentCoords;
