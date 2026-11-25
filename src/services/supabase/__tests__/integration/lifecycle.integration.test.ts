/**
 * src/services/supabase/__tests__/integration/lifecycle.integration.test.ts
 * Integration tests for Account Deletion (DEL-01), User Reports (REP-01),
 * and Push Notification registration (PUSH-01).
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
    '\n⚠️  [INTEGRATION TESTS: NOT RUN] Test credentials missing in .env.test. Skipping Lifecycle integration suite.\n'
  );
}

describeIntegration('Integration Suite: Account Deletion, Reports & Push (DEL-01, REP-01, PUSH-01)', () => {
  let user: TestUser;
  let adminUser: TestUser;

  beforeAll(async () => {
    user = await createTestUser('customer', 'lc-u');
    adminUser = await createTestUser('admin', 'lc-adm');
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('DEL-01: In-app account deletion cascades to private contacts, push tokens, and logs audit trail', async () => {
    const admin = getAdminClient();

    // Setup user records: contact, push token, notification
    await admin.from('profile_contacts').upsert({
      user_id: user.id,
      phone: '+923001234567',
    });

    await admin.from('push_tokens').upsert({
      user_id: user.id,
      token: 'ExponentPushToken[integration-test-token]',
    });

    await admin.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      message: 'Test notification prior to deletion',
    });

    // Execute account deletion as user
    const { data: delResult, error: delErr } = await user.client.rpc('delete_user_account', {
      p_user_id: user.id,
    });

    expect(delErr).toBeNull();
    expect(delResult).toBe(true);

    // Verify contact info is purged
    const { data: contacts } = await admin
      .from('profile_contacts')
      .select('*')
      .eq('user_id', user.id);
    expect(contacts).toHaveLength(0);

    // Verify push tokens are purged
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('*')
      .eq('user_id', user.id);
    expect(tokens).toHaveLength(0);

    // Verify notifications are purged
    const { data: notes } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);
    expect(notes).toHaveLength(0);

    // Verify audit log entry was appended
    const { data: auditEntries } = await admin
      .from('admin_actions')
      .select('*')
      .eq('target_id', user.id)
      .eq('action', 'account.deleted');

    expect(auditEntries).toBeDefined();
    expect(auditEntries?.length).toBeGreaterThanOrEqual(1);
  });

  it('REP-01: User abuse report submission (reporter_id = auth.uid()) and admin resolution', async () => {
    const freshUser = await createTestUser('customer', 'rep-u');

    // User submits an abuse report
    const { data: report, error: repErr } = await freshUser.client
      .from('user_reports')
      .insert({
        reporter_id: freshUser.id,
        reported_id: adminUser.id,
        reason: 'harassment',
        details: 'Integration test report submission',
      })
      .select()
      .single();

    expect(repErr).toBeNull();
    expect(report).toBeDefined();
    expect(report.status).toBe('pending');

    // Admin resolves report
    const { data: resolved, error: resErr } = await adminUser.client
      .from('user_reports')
      .update({
        status: 'resolved',
        resolution_notes: 'Reviewed and dismissed in automated test.',
      })
      .eq('id', report.id)
      .select()
      .single();

    expect(resErr).toBeNull();
    expect(resolved.status).toBe('resolved');
  });

  it('PUSH-01: User push token registration and read scoping', async () => {
    const testUser = await createTestUser('customer', 'push-u');

    // User registers device token
    const testToken = `ExponentPushToken[${Math.random().toString(36)}]`;
    const { error: insErr } = await testUser.client.from('push_tokens').upsert({
      user_id: testUser.id,
      token: testToken,
    });

    expect(insErr).toBeNull();

    // User can read own token
    const { data: ownTokens } = await testUser.client
      .from('push_tokens')
      .select('token')
      .eq('user_id', testUser.id);

    expect(ownTokens).toHaveLength(1);
    expect(ownTokens?.[0].token).toBe(testToken);
  });

  it('DEL-02: Account deletion anonymizes booking PII (description, coordinates, meta)', async () => {
    const admin = getAdminClient();
    const victim = await createTestUser('customer', 'del-pii');

    const { data: booking } = await admin
      .from('bookings')
      .insert({
        customer_id: victim.id,
        category: 'Plumber',
        description: 'Secret home address leak',
        location_lat: 31.5204,
        location_lng: 74.3587,
        meta: { address: 'House 12, Gulberg', notes: 'Gate code 1234', customerPhone: '+923001112223' },
        status: 'pending',
      })
      .select()
      .single();

    expect(booking).toBeDefined();

    const { error: delErr } = await victim.client.rpc('delete_user_account', {
      p_user_id: victim.id,
    });
    expect(delErr).toBeNull();

    const { data: anonymized } = await admin
      .from('bookings')
      .select('description, location_lat, location_lng, meta')
      .eq('id', booking.id)
      .single();

    expect(anonymized?.description).toBe('[Deleted User Booking]');
    expect(anonymized?.location_lat).toBeNull();
    expect(anonymized?.location_lng).toBeNull();
    expect((anonymized?.meta as Record<string, unknown>)?.address).toBeUndefined();
    expect((anonymized?.meta as Record<string, unknown>)?.notes).toBeUndefined();
    expect((anonymized?.meta as Record<string, unknown>)?.customerPhone).toBeUndefined();
  });
});

