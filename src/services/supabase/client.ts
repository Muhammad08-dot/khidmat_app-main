import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { createMockSupabase } from './mockClient';

interface AuthStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// `expo-secure-store` is native-only and throws on web.
// Use SecureStore on native platforms. On web, sessionStorage is scoped to
// the tab and is cleared when the tab closes — a strictly better XSS blast
// radius than localStorage (which persists across tabs and reloads).
const getWebStore = (): Storage | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    // Private-browsing modes may throw on access; fall back to an in-memory map.
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
  }
};

const ExpoSecureStoreAdapter: AuthStorageAdapter = {
  getItem: async (key: string) => {
    const web = getWebStore();
    if (web) return web.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    const web = getWebStore();
    if (web) {
      web.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    const web = getWebStore();
    if (web) {
      web.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const defaultSupabaseUrl = 'https://sodxwchaqpqnwvnrnsaj.supabase.co';
const defaultAnonKey = 'sb_publishable_KYRYhqhTDJSohgptEx5GVg_GooKFAqw';

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey;

// Demo mode: Toggle EXPO_PUBLIC_DEMO_MODE in .env. Defaults to false when valid URL is present.
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export const supabase: SupabaseClient = DEMO_MODE
  ? (createMockSupabase() as unknown as SupabaseClient)
  : supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: ExpoSecureStoreAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : (createMockSupabase() as unknown as SupabaseClient);

// Manage auto-refresh based on app state
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh?.();
  } else {
    supabase.auth.stopAutoRefresh?.();
  }
});
