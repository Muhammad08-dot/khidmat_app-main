import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { createMockSupabase } from '@/src/test-utils/mockClient';

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

export class ConfigError extends Error {
  constructor(message = 'Configuration error: Supabase URL or Anon Key is missing.') {
    super(message);
    this.name = 'ConfigError';
  }
}

// Explicit mock flag: only active when EXPO_PUBLIC_USE_MOCK=true (or legacy EXPO_PUBLIC_DEMO_MODE=true)
export const USE_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK === 'true' || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
export const DEMO_MODE = USE_MOCK;

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function createConfigErrorProxy(): SupabaseClient {
  return new Proxy((() => {}) as unknown as SupabaseClient, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      throw new ConfigError(
        'Configuration error: Missing Supabase URL or Anon Key. Please configure your environment variables.'
      );
    },
    apply() {
      throw new ConfigError(
        'Configuration error: Missing Supabase URL or Anon Key. Please configure your environment variables.'
      );
    },
  });
}

export function getSupabaseClient(
  customUrl?: string,
  customAnonKey?: string,
  forceMock?: boolean
): SupabaseClient {
  const shouldUseMock = forceMock !== undefined ? forceMock : USE_MOCK;
  if (shouldUseMock) {
    return createMockSupabase() as unknown as SupabaseClient;
  }

  const url = customUrl !== undefined ? customUrl : supabaseUrl;
  const anonKey = customAnonKey !== undefined ? customAnonKey : supabaseAnonKey;

  if (!url || !anonKey) {
    return createConfigErrorProxy();
  }

  return createClient(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase: SupabaseClient = getSupabaseClient();

// Manage auto-refresh based on app state
AppState.addEventListener('change', (state) => {
  try {
    if (state === 'active') {
      supabase.auth?.startAutoRefresh?.();
    } else {
      supabase.auth?.stopAutoRefresh?.();
    }
  } catch {
    // Suppress configuration errors on background refresh check
  }
});
