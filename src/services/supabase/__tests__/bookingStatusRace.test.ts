// @ts-nocheck
process.env.EXPO_PUBLIC_DEMO_MODE = 'true';

import {
  isValidStatusTransition,
  transitionBookingStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from '../queries';
import { createMockSupabase } from '@/src/test-utils/mockClient';

describe('Booking Status State Machine & Race Condition Handling', () => {
  it('correctly defines allowed transitions according to the lifecycle PRD', () => {
    // Valid transitions
    expect(isValidStatusTransition('pending', 'confirmed')).toBe(true);
    expect(isValidStatusTransition('pending', 'rejected')).toBe(true);
    expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('confirmed', 'in_progress')).toBe(true);
    expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('in_progress', 'completed')).toBe(true);
    expect(isValidStatusTransition('completed', 'reviewed')).toBe(true);
    expect(isValidStatusTransition('completed', 'closed')).toBe(true);
    expect(isValidStatusTransition('reviewed', 'closed')).toBe(true);

    // Invalid transitions
    expect(isValidStatusTransition('pending', 'completed')).toBe(false);
    expect(isValidStatusTransition('cancelled', 'confirmed')).toBe(false);
    expect(isValidStatusTransition('rejected', 'confirmed')).toBe(false);
    expect(isValidStatusTransition('closed', 'in_progress')).toBe(false);
  });

  it('rejects an invalid status transition attempt', async () => {
    await expect(
      transitionBookingStatus({
        bookingId: 'test-id',
        status: 'completed',
        expectedCurrentStatus: 'pending',
      })
    ).rejects.toThrow(/Cannot transition booking/);
  });

  it('handles race conditions: simultaneous accept and cancel results in exactly one winner', async () => {
    const client = createMockSupabase();
    // Insert a pending booking into mock DB
    const bookingId = 'race-booking-001';
    await client.from('bookings').insert({
      id: bookingId,
      customer_id: 'cust-1',
      provider_id: 'prov-1',
      status: 'pending',
    });

    // Simulate concurrent actions:
    // 1. Customer cancels (pending -> cancelled)
    // 2. Provider accepts (pending -> confirmed)
    const cancelPromise = client
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select();

    const acceptPromise = client
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select();

    const [cancelResult, acceptResult] = await Promise.all([cancelPromise, acceptPromise]);

    const cancelUpdated = cancelResult.data && cancelResult.data.length > 0;
    const acceptUpdated = acceptResult.data && acceptResult.data.length > 0;

    // Exactly one operation succeeded in updating the row!
    expect(cancelUpdated !== acceptUpdated).toBe(true);

    // Final state is whichever won, never corrupted or in an impossible state
    const { data: finalBooking } = await client
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();

    expect(['cancelled', 'confirmed']).toContain(finalBooking.status);
  });
});
