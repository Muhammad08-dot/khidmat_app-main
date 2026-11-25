#!/usr/bin/env node
/**
 * M4-5 Replacement (since Firefox MCP is unavailable):
 * Node smoke test against khidmat-test using supabase-js:
 *  1. Signup customer + provider
 *  2. Create booking
 *  3. Provider confirm -> start -> complete
 *  4. Forbidden attempts:
 *     - Customer attempts to confirm booking (must reject)
 *     - Customer attempts role self-escalation to admin (must reject)
 *     - Signup with metadata role: 'admin' (must clamp to 'customer')
 *  5. Delete QA users via delete_user_account RPC + delete-account Edge Function
 *
 * Loads .env.test; never prints full keys/passwords.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvTest() {
  const envPath = path.resolve(__dirname, '..', '.env.test');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Missing .env.test. Cannot run smoke test.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvTest();

  const url = process.env.SUPABASE_TEST_URL;
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.error('❌ Missing SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, or SUPABASE_TEST_SERVICE_ROLE_KEY in .env.test.');
    process.exit(1);
  }
  if (!url.includes('test') && process.env.SUPABASE_TEST_CONFIRM !== 'yes') {
    console.error('❌ Safety abort: SUPABASE_TEST_URL does not contain "test" and SUPABASE_TEST_CONFIRM !== "yes".');
    process.exit(1);
  }

  const ts = Date.now();
  const password = `QaPass!${ts}`;
  const customerEmail = `qa-cust-${ts}@khidmat.test`;
  const providerEmail = `qa-prov-${ts}@khidmat.test`;
  const attackerEmail = `qa-atk-${ts}@khidmat.test`;

  const custClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const provClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const atkClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  const assert = (cond, label) => {
    if (!cond) throw new Error(`Assertion failed: ${label}`);
    console.log(`✅ PASS: ${label}`);
  };

  let custId, provId, atkId;

  try {
    // 1. Signup customer & provider
    const cRes = await custClient.auth.signUp({
      email: customerEmail,
      password,
      options: { data: { name: 'QA Customer', role: 'customer', city: 'Lahore' } },
    });
    assert(!cRes.error && cRes.data.user, 'Customer signup');
    custId = cRes.data.user.id;

    const pRes = await provClient.auth.signUp({
      email: providerEmail,
      password,
      options: { data: { name: 'QA Provider', role: 'provider', city: 'Lahore', category: 'Plumber', basePrice: 1000 } },
    });
    assert(!pRes.error && pRes.data.user, 'Provider signup');
    provId = pRes.data.user.id;

    // 2. Create booking as customer
    const bRes = await custClient
      .from('bookings')
      .insert({
        customer_id: custId,
        provider_id: provId,
        category: 'Plumber',
        description: 'Smoke test pipe repair',
        estimated_price: 1000,
        status: 'pending',
      })
      .select()
      .single();
    assert(!bRes.error && bRes.data?.id, 'Customer create booking');
    const bookingId = bRes.data.id;

    // 3a. Forbidden: customer attempts to confirm booking
    const custConfirm = await custClient.rpc('transition_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'confirmed',
      p_expected_current_status: 'pending',
    });
    assert(Boolean(custConfirm.error), 'Forbidden: customer cannot confirm booking');

    // 3b. Forbidden: customer attempts role self-escalation
    const escRes = await custClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', custId);
    assert(Boolean(escRes.error), 'Forbidden: customer cannot self-escalate role to admin');

    // 3c. Forbidden: signup with metadata role: 'admin' clamps to 'customer'
    const atkRes = await atkClient.auth.signUp({
      email: attackerEmail,
      password,
      options: { data: { name: 'QA Attacker', role: 'admin' } },
    });
    assert(!atkRes.error && atkRes.data.user, 'Attacker signup completed');
    atkId = atkRes.data.user.id;
    const atkProf = await adminClient.from('profiles').select('role').eq('id', atkId).single();
    assert(atkProf.data?.role === 'customer', 'Signup with role:admin clamped to customer');

    // 4. Provider confirm -> start -> complete
    const conf = await provClient.rpc('transition_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'confirmed',
      p_expected_current_status: 'pending',
    });
    assert(!conf.error && conf.data?.status === 'confirmed', 'Provider confirm booking');

    const start = await provClient.rpc('transition_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'in_progress',
      p_expected_current_status: 'confirmed',
    });
    assert(!start.error && start.data?.status === 'in_progress', 'Provider start booking');

    const comp = await provClient.rpc('transition_booking_status', {
      p_booking_id: bookingId,
      p_new_status: 'completed',
      p_expected_current_status: 'in_progress',
    });
    assert(!comp.error && comp.data?.status === 'completed', 'Provider complete booking');
  } finally {
    // 5. Cleanup QA users via RPC + delete-account Edge Function
    for (const [label, client, id] of [
      ['customer', custClient, custId],
      ['provider', provClient, provId],
      ['attacker', atkClient, atkId],
    ]) {
      if (!id) continue;
      await client.rpc('delete_user_account', { p_user_id: id });
      const fnRes = await client.functions.invoke('delete-account', { body: {} });
      if (fnRes.error) {
        console.warn(`⚠️ Edge delete-account fallback for ${label}:`, fnRes.error.message);
        await adminClient.auth.admin.deleteUser(id);
      } else {
        console.log(`✅ Deleted QA ${label} via delete-account edge function`);
      }
    }
  }

  console.log('\n🎉 Smoke test completed successfully.');
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
