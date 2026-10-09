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
// Use SecureStore on native platforms and fall back to window.localStorage on web.
const ExpoSecureStoreAdapter: AuthStorageAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Demo mode: everything runs against the in-memory mock DB (no network, no
// Supabase project needed). Toggle EXPO_PUBLIC_DEMO_MODE in .env.
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

// Fail fast with an actionable message instead of opaque runtime request errors.
if (!DEMO_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the root .env file (see .env.example), or set EXPO_PUBLIC_DEMO_MODE=true to run against the built-in mock data.'
  );
}

export const supabase: SupabaseClient = DEMO_MODE
  ? (createMockSupabase() as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

// Manage auto-refresh based on app state
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh?.();
  } else {
    supabase.auth.stopAutoRefresh?.();
  }
});
