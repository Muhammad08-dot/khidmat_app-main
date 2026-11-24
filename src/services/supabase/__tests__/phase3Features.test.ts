// @ts-nocheck
process.env.EXPO_PUBLIC_DEMO_MODE = 'true';

import {
  submitUserReport,
  getPendingReports,
  resolveUserReport,
  deleteUserAccount,
  createBooking,
  sendMessage,
  clearAntiSpam,
} from '../queries';
import { createMockSupabase } from '@/src/test-utils/mockClient';

describe('Phase 3 Feature Suite: Account Deletion, Reporting, & Anti-Spam', () => {
  beforeEach(() => {
    clearAntiSpam();
  });

  it('submits a user report and displays it in admin pending reports', async () => {
    const report = await submitUserReport({
      reporterId: 'a1c00000-0000-4000-8000-000000000000',
      reportedId: 'b1a10000-0000-4000-8000-000000000000',
      targetType: 'provider',
      targetId: 'b1a10000-0000-4000-8000-000000000000',
      reason: 'Safety concern',
      details: 'Provider was hostile during chat',
    });

    expect(report).toBeDefined();
    expect(report.reason).toBe('Safety concern');

    const pending = await getPendingReports();
    expect(pending.length).toBeGreaterThan(0);
    const found = pending.find((r) => r.id === report.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');

    // Admin resolves report
    const resolved = await resolveUserReport(report.id, 'resolved');
    expect(resolved.status).toBe('resolved');
  });

  it('enforces anti-spam rate limiting on rapid booking creation', async () => {
    const customerId = 'a1c00000-0000-4000-8000-000000000000';
    const providerId = 'b1a10000-0000-4000-8000-000000000000';

    // First booking succeeds
    await createBooking(customerId, providerId, 'Electrician', 'Switch repair', 'low', 1200);

    // Immediate second booking is throttled
    await expect(
      createBooking(customerId, providerId, 'Electrician', 'Switch repair duplicate', 'low', 1200)
    ).rejects.toThrow(/Please wait a moment/);
  });

  it('enforces anti-spam rate limiting on rapid chat messages', async () => {
    const senderId = 'sender-spam-test';
    const bookingId = 'b0010000-0000-4000-8000-000000000000';

    await sendMessage(bookingId, senderId, 'Hello!');

    // Immediate consecutive message throws anti-spam error
    await expect(sendMessage(bookingId, senderId, 'Hello again right now!')).rejects.toThrow(
      /You are sending messages too fast/
    );
  });

  it('successfully executes account deletion and anonymization', async () => {
    const tempUserId = 'delete-me-user-id';
    const { supabase } = require('../client');

    // Insert user data on the active supabase instance
    await supabase
      .from('profiles')
      .insert({ id: tempUserId, name: 'Doomed User', role: 'customer' });
    await supabase.from('push_tokens').insert({ user_id: tempUserId, token: 'fake-token' });

    const result = await deleteUserAccount(tempUserId);
    expect(result).toBe(true);

    // Verify user profile is deleted
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', tempUserId)
      .maybeSingle();
    expect(profile).toBeNull();
  });
});
