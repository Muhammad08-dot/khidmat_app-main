import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Thin AsyncStorage wrapper that mirrors the `localStorage` API used by the
 * web app (and its Mock Firebase fallback), so the ported service layer can
 * call getItem/setItem/removeItem interchangeably.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn("[storage] getItem failed:", key, e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("[storage] setItem failed:", key, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("[storage] removeItem failed:", key, e);
    }
  },
};
