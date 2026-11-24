// @ts-nocheck
import { createMockSupabase } from '@/src/test-utils/mockClient';

describe('Realtime Tracking Broadcast', () => {
  it('delivers location broadcast messages across channel subscribers without writing to DB', async () => {
    const client = createMockSupabase();
    const bookingId = 'test-booking-123';
    const channelName = `tracking:${bookingId}`;

    const subscriberChannel = client.channel(channelName);
    const publisherChannel = client.channel(channelName);

    const received: any[] = [];
    subscriberChannel.on('broadcast', { event: 'location' }, (payload: any) => {
      received.push(payload);
    });

    subscriberChannel.subscribe();
    publisherChannel.subscribe();

    const sampleLocation = {
      lat: 31.5204,
      lng: 74.3587,
      heading: 90,
      speed: 15,
      timestamp: new Date().toISOString(),
    };

    await publisherChannel.send({
      type: 'broadcast',
      event: 'location',
      payload: {
        role: 'worker',
        location: sampleLocation,
      },
    });

    expect(received.length).toBe(1);
    expect(received[0].payload.role).toBe('worker');
    expect(received[0].payload.location.lat).toBe(31.5204);
    expect(received[0].payload.location.lng).toBe(74.3587);

    // Unsubscribe cleans up channel listener
    subscriberChannel.unsubscribe();
    await publisherChannel.send({
      type: 'broadcast',
      event: 'location',
      payload: {
        role: 'worker',
        location: { ...sampleLocation, lat: 31.53 },
      },
    });

    // Should not receive further updates after unsubscribe
    expect(received.length).toBe(1);
  });
});
