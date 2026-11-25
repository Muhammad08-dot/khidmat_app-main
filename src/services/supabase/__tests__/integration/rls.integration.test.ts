/**
 * src/services/supabase/__tests__/integration/rls.integration.test.ts
 * Integration tests for Row Level Security policies (PRD §5.2).
 * Cases: RLS-01, RLS-02, RLS-03, RLS-04
 */

import {
  hasTestCredentials,
  createTestUser,
  cleanupTestData,
  getAdminClient,
  TestUser,
} from './helper';

const describeIntegration = hasTestCredentials() ? describe : describe.skip;

if (!hasTestCredentials()) {
  console.log(
    '\n⚠️  [INTEGRATION TESTS: NOT RUN] Test credentials missing in .env.test. Skipping RLS integration suite.\n'
  );
}

describeIntegration('Integration Suite: Row Level Security (RLS-01 to RLS-04)', () => {
  let customer1: TestUser;
  let customer2: TestUser;
  let provider: TestUser;

  beforeAll(async () => {
    customer1 = await createTestUser('customer', 'rls-c1');
    customer2 = await createTestUser('customer', 'rls-c2');
    provider = await createTestUser('provider', 'rls-p');
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('RLS-01: Customer cannot read another customer’s private contacts or unassociated bookings', async () => {
    const admin = getAdminClient();

    // Create a booking owned exclusively by customer2
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .insert({
        customer_id: customer2.id,
        category: 'Electrician',
        description: 'Customer 2 private repair',
        status: 'pending',
      })
      .select()
      .single();

    expect(bErr).toBeNull();
    expect(booking).toBeDefined();

    // Customer 1 queries bookings
    const { data: c1Bookings } = await customer1.client
      .from('bookings')
      .select('*')
      .eq('id', booking.id);

    // Cross-user read must return empty set
    expect(c1Bookings).toHaveLength(0);

    // Customer 1 queries customer 2's contact info
    const { data: c1Contacts } = await customer1.client
      .from('profile_contacts')
      .select('*')
      .eq('user_id', customer2.id);

    expect(c1Contacts).toHaveLength(0);
  });

  it('RLS-02: User cannot escalate own role to admin in profiles table', async () => {
    // Customer 1 attempts to escalate role to admin
    const { error } = await customer1.client
      .from('profiles')
      .update({ role: 'admin' as any })
      .eq('id', customer1.id);

    // Migration 0014 trigger must reject with SQLSTATE 42501
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Unauthorized|Only platform administrators/i);

    // Confirm role remains customer
    const { data: profile } = await customer1.client
      .from('profiles')
      .select('role')
      .eq('id', customer1.id)
      .single();

    expect(profile?.role).toBe('customer');
  });

  it('RLS-03: Price cannot be altered after booking confirmation/acceptance', async () => {
    const admin = getAdminClient();

    // Create a confirmed booking
    const { data: booking } = await admin
      .from('bookings')
      .insert({
        customer_id: customer1.id,
        provider_id: provider.id,
        category: 'Electrician',
        description: 'Fixed price job',
        estimated_price: 2500,
        status: 'confirmed',
      })
      .select()
      .single();

    expect(booking).toBeDefined();

    // Attempt to tamper with price as customer
    const { error: customerTamper } = await customer1.client
      .from('bookings')
      .update({ estimated_price: 500 })
      .eq('id', booking.id);

    expect(customerTamper).toBeDefined();
    expect(customerTamper?.message).toMatch(/Price tampering forbidden/i);
  });

  it('RLS-04: admin_actions audit trail is strictly append-only (UPDATE and DELETE prohibited)', async () => {
    const admin = getAdminClient();

    // Insert an audit row
    const { data: auditRow, error: insErr } = await admin
      .from('admin_actions')
      .insert({
        actor_id: provider.id,
        action: 'test.verification',
        target_type: 'profile',
        target_id: customer1.id,
        meta: { test: true },
      })
      .select()
      .single();

    expect(insErr).toBeNull();
    expect(auditRow).toBeDefined();

    // Attempt to UPDATE audit row
    const { error: updErr } = await admin
      .from('admin_actions')
      .update({ action: 'tampered.action' })
      .eq('id', auditRow.id);

    expect(updErr).toBeDefined();
    expect(updErr?.message).toMatch(/strictly append-only/i);

    // Attempt to DELETE audit row
    const { error: delErr } = await admin
      .from('admin_actions')
      .delete()
      .eq('id', auditRow.id);

    expect(delErr).toBeDefined();
    expect(delErr?.message).toMatch(/strictly append-only/i);
  });

  it('RLS-05: customer <-> provider switching is allowed, while signup/insert/update role=admin is blocked', async () => {
    const admin = getAdminClient();

    // Customer can switch to provider (complete-profile flow)
    const { error: switchErr } = await customer1.client
      .from('profiles')
      .update({ role: 'provider' })
      .eq('id', customer1.id);
    expect(switchErr).toBeNull();

    // Switch back to customer
    const { error: backErr } = await customer1.client
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', customer1.id);
    expect(backErr).toBeNull();

    // Signup with metadata role: 'admin' must clamp to 'customer'
    const email = `qa-admin-attempt-${Date.now()}@khidmat.test`;
    const { data: signUpData } = await customer1.client.auth.signUp({
      email,
      password: 'Password123!',
      options: { data: { name: 'Attacker', role: 'admin' } },
    });

    if (signUpData.user) {
      const { data: createdProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', signUpData.user.id)
        .single();
      expect(createdProfile?.role).toBe('customer');
      await admin.auth.admin.deleteUser(signUpData.user.id);
    }
  });

  it('RLS-06: total_price can be set once upon completion and is locked thereafter', async () => {
    const admin = getAdminClient();
    const { data: booking } = await admin
      .from('bookings')
      .insert({
        customer_id: customer1.id,
        provider_id: provider.id,
        category: 'Electrician',
        description: 'Completion price lock test',
        estimated_price: 2000,
        status: 'in_progress',
      })
      .select()
      .single();

    expect(booking).toBeDefined();

    // First write to total_price succeeds
    const { error: firstSetErr } = await provider.client
      .from('bookings')
      .update({ total_price: 2200, status: 'completed' })
      .eq('id', booking.id);
    expect(firstSetErr).toBeNull();

    // Second write to total_price is rejected
    const { error: secondSetErr } = await provider.client
      .from('bookings')
      .update({ total_price: 5000 })
      .eq('id', booking.id);
    expect(secondSetErr).toBeDefined();
    expect(secondSetErr?.message).toMatch(/Price tampering forbidden/i);
  });

  it('RLS-07: kyc-documents bucket is private and blocks cross-user reads', async () => {
    const admin = getAdminClient();
    const { data: bucket } = await admin.storage.getBucket('kyc-documents');
    expect(bucket?.public).toBe(false);

    const { data: crossList } = await customer1.client.storage
      .from('kyc-documents')
      .list(customer2.id);
    expect(crossList ?? []).toHaveLength(0);
  });
});

