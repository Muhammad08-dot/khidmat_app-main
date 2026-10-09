/**
 * Lightweight product analytics.
 *
 * Without EXPO_PUBLIC_POSTHOG_KEY set this is a strict no-op (events are
 * dropped, not buffered). PII (names, emails, phone numbers, free-text
 * addresses) must NEVER be added to event properties.
 */
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function track(event: string, props: Record<string, string | number | boolean> = {}): void {
  if (!POSTHOG_KEY) return;
  try {
    fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        properties: { ...props, $lib: 'khidmat-mobile' },
      }),
    }).catch(() => {});
  } catch {
    // Analytics must never break a user flow.
  }
}

export const AnalyticsEvents = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CLOSED: 'booking_closed',
  BOOKING_STATUS_CHANGED: 'booking_status_changed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PROVIDER_CONTACT_NOTIFIED: 'provider_notified',
  PAYMENT_RECORDED: 'payment_recorded',
  LANGUAGE_SWITCHED: 'language_switched',
} as const;
