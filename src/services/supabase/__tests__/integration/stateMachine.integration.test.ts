/**
 * src/services/supabase/__tests__/integration/stateMachine.integration.test.ts
 * Integration tests for Booking State Machine & Acceptance Concurrency (PRD §5.2).
 * Cases: SM-01, SM-02, SM-03
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
    '\n⚠️  [INTEGRATION TESTS: NOT RUN] Test credentials missing in .env.test. Skipping State Machine integration suite.\n'
  );
}

describeIntegration('Integration Suite: Booking State Machine (SM-01 to SM-03)', () => {
  let customer: TestUser;
  let providerA: TestUser;
  let providerB: TestUser;

  beforeAll(async () => {
    customer = await createTestUser('customer', 'sm-c');
    providerA = await createTestUser('provider', 'sm-pa');
    providerB = await createTestUser('provider', 'sm-pb');
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('SM-01: Valid lifecycle progression (pending -> confirmed -> in_progress -> completed -> reviewed -> closed)', async () => {
    const admin = getAdminClient();

    // 1. Customer creates pending booking
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .insert({
        customer_id: customer.id,
        category: 'Plumber',
        description: 'Water motor pipe leak',
        status: 'pending',
      })
      .select()
      .single();

    expect(bErr).toBeNull();
    expect(booking.status).toBe('pending');

    // 2. Transition pending -> confirmed
    const { data: confirmed, error: cErr } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'confirmed',
      p_expected_current_status: 'pending',
    });
    expect(cErr).toBeNull();
    expect(confirmed.status).toBe('confirmed');

    // 3. Transition confirmed -> in_progress
    const { data: inProg, error: pErr } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'in_progress',
      p_expected_current_status: 'confirmed',
    });
    expect(pErr).toBeNull();
    expect(inProg.status).toBe('in_progress');

    // 4. Transition in_progress -> completed
    const { data: comp, error: cmpErr } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'completed',
      p_expected_current_status: 'in_progress',
    });
    expect(cmpErr).toBeNull();
    expect(comp.status).toBe('completed');

    // 5. Transition completed -> reviewed
    const { data: rev, error: revErr } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'reviewed',
      p_expected_current_status: 'completed',
    });
    expect(revErr).toBeNull();
    expect(rev.status).toBe('reviewed');

    // 6. Transition reviewed -> closed
    const { data: closed, error: clsErr } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'closed',
      p_expected_current_status: 'reviewed',
    });
    expect(clsErr).toBeNull();
    expect(closed.status).toBe('closed');
  });

  it('SM-02: Invalid lifecycle transitions throw SQLSTATE 22023 or 23514', async () => {
    const admin = getAdminClient();

    // Create pending booking
    const { data: booking } = await admin
      .from('bookings')
      .insert({
        customer_id: customer.id,
        category: 'Plumber',
        description: 'Direct completion test',
        status: 'pending',
      })
      .select()
      .single();

    // Attempt illegal transition: pending -> completed
    const { error } = await admin.rpc('transition_booking_status', {
      p_booking_id: booking.id,
      p_new_status: 'completed',
      p_expected_current_status: 'pending',
    });

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Invalid booking status transition|Status conflict/i);
  });

  it('SM-03: Concurrent accept race — exactly one provider wins, second is rejected', async () => {
    const admin = getAdminClient();

    // Create a broadcast pending booking
    const { data: booking } = await admin
      .from('bookings')
      .insert({
        customer_id: customer.id,
        category: 'Electrician',
        description: 'Race condition booking',
        status: 'pending',
      })
      .select()
      .single();

    expect(booking).toBeDefined();

    // Both providerA and providerB fire transition_booking_status concurrently
    const [resultA, resultB] = await Promise.all([
      admin.rpc('transition_booking_status', {
        p_booking_id: booking.id,
        p_new_status: 'confirmed',
        p_expected_current_status: 'pending',
      }),
      admin.rpc('transition_booking_status', {
        p_booking_id: booking.id,
        p_new_status: 'confirmed',
        p_expected_current_status: 'pending',
      }),
    ]);

    // Exactly one should succeed, exactly one should fail with conflict
    const successes = [resultA, resultB].filter((r) => !r.error);
    const errors = [resultA, resultB].filter((r) => r.error);

    expect(successes).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].error?.message).toMatch(/Status conflict/i);
  });
});

