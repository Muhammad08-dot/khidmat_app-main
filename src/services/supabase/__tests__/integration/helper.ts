/**
 * src/services/supabase/__tests__/integration/helper.ts
 * Cloud integration test helper against khidmat-test project (PRD §5.2).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Attempt to load .env.test if present
const envTestPath = path.resolve(__dirname, '../../../../../../.env.test');
if (fs.existsSync(envTestPath)) {
  try {
    const raw = fs.readFileSync(envTestPath, 'utf8');
    raw.split(/\r?\n/).forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  } catch {
    // Ignore read errors
  }
}

const TEST_URL = process.env.SUPABASE_TEST_URL || '';
const TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY || '';
const TEST_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY || '';
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export const hasTestCredentials = (): boolean => {
  return Boolean(TEST_URL && TEST_ANON_KEY && TEST_SERVICE_ROLE_KEY);
};

export function assertSafetyGuard() {
  if (!hasTestCredentials()) return;

  // Safety guard 1: Never target production
  if (PROD_URL && TEST_URL.trim().toLowerCase() === PROD_URL.trim().toLowerCase()) {
    throw new Error(
      'FATAL SAFETY VIOLATION: SUPABASE_TEST_URL matches production EXPO_PUBLIC_SUPABASE_URL. Destructive integration tests against production are strictly forbidden.'
    );
  }

  // Safety guard 2: URL must contain 'test' or explicit confirmation
  const isExplicitlyConfirmed = process.env.SUPABASE_TEST_CONFIRM === 'yes';
  const containsTest = TEST_URL.toLowerCase().includes('test');
  if (!containsTest && !isExplicitlyConfirmed) {
    throw new Error(
      'FATAL SAFETY VIOLATION: SUPABASE_TEST_URL does not contain "test" and SUPABASE_TEST_CONFIRM is not "yes". Destructive integration tests aborted.'
    );
  }
}

// Execute guard check immediately on load if credentials exist
if (hasTestCredentials()) {
  assertSafetyGuard();
}

export function getAdminClient(): SupabaseClient {
  assertSafetyGuard();
  if (!hasTestCredentials()) {
    throw new Error('Cannot instantiate integration admin client: missing test credentials.');
  }
  return createClient(TEST_URL, TEST_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAnonClient(): SupabaseClient {
  assertSafetyGuard();
  if (!hasTestCredentials()) {
    throw new Error('Cannot instantiate integration anon client: missing test credentials.');
  }
  return createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
  client: SupabaseClient;
  token: string;
}

const createdUserIds: string[] = [];

export async function createTestUser(
  role: 'customer' | 'provider' | 'admin',
  emailPrefix = 'int-test'
): Promise<TestUser> {
  assertSafetyGuard();
  const admin = getAdminClient();
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const email = `${emailPrefix}-${role}-${uniqueId}@khidmat-test.internal`;
  const password = `TestPass!123_${uniqueId}`;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: `Test ${role.toUpperCase()} ${uniqueId}`,
      role,
      city: 'Lahore',
      ...(role === 'provider' ? { category: 'Electrician', basePrice: 1500 } : {}),
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  const userId = authData.user.id;
  createdUserIds.push(userId);

  // Authenticate user to obtain real session access token
  const anon = getAnonClient();
  const { data: sessionData, error: sessionError } = await anon.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError || !sessionData.session) {
    throw new Error(`Failed to sign in test user: ${sessionError?.message}`);
  }

  // Create scoped client for this user
  const userClient = createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    },
  });

  return {
    id: userId,
    email,
    role,
    client: userClient,
    token: sessionData.session.access_token,
  };
}

export async function cleanupTestData() {
  if (!hasTestCredentials() || createdUserIds.length === 0) return;
  const admin = getAdminClient();
  while (createdUserIds.length > 0) {
    const id = createdUserIds.pop();
    if (id) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}
