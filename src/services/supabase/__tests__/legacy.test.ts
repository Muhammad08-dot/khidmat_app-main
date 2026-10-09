/**
 * Unit tests for the legacy Firestore-bridge helpers.
 * Only the pure mapping/validation functions are covered here — DB-touching
 * helpers are exercised against Supabase in staging.
 */
// Jest globals aren't in the app tsconfig `types` (same convention as
// src/utils/__tests__/location.test.ts), so this file opts out of typecheck.
// @ts-nocheck

// Mock the Supabase client + push fan-out before importing legacy.ts, so no
// env validation or native module loads happen under jest.
jest.mock('../client', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));
jest.mock('../../push', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));

import {
  isUuid,
  generateUuid,
  mapBookingRow,
  mapProviderRow,
  profileColumnsFromCamel,
} from '../legacy';

describe('isUuid', () => {
  it('accepts a canonical v4 uuid', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-3906ee700bc1')).toBe(true);
  });
  it('rejects legacy document ids and non-strings', () => {
    expect(isUuid('booking_1700000000_abc')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe('generateUuid', () => {
  it('produces strings that pass isUuid', () => {
    for (let i = 0; i < 25; i++) {
      expect(isUuid(generateUuid())).toBe(true);
    }
  });
  it('does not repeat values', () => {
    const set = new Set(Array.from({ length: 100 }, generateUuid));
    expect(set.size).toBe(100);
  });
});

describe('mapBookingRow', () => {
  const joinedRow = {
    id: 'b1',
    customer_id: 'c1',
    provider_id: 'p1',
    category: 'Plumber',
    description: 'Leaky tap',
    status: 'confirmed',
    urgency: 'high',
    estimated_price: 2500,
    created_at: '2026-10-01T09:00:00Z',
    customer: { name: 'Ali', phone: '+923001111111' },
    provider: { base_price: 1500, profiles: { name: 'Bilal' } },
    meta: { timeSlot: '10:00-12:00', address: 'Gulberg', date: '2026-10-02' },
  };

  it('flattens joined rows into the camelCase view model', () => {
    const out = mapBookingRow(joinedRow);
    expect(out.bookingId).toBe('b1');
    expect(out.customerName).toBe('Ali');
    expect(out.providerName).toBe('Bilal');
    expect(out.totalPrice).toBe(2500);
    expect(out.timeSlot).toBe('10:00-12:00');
    expect(out.date).toBe('2026-10-02');
    expect(out.status).toBe('confirmed');
  });

  it('falls back to meta / defaults when joins are missing', () => {
    const out = mapBookingRow({
      id: 'b2',
      customer_id: 'c2',
      provider_id: null,
      status: 'pending',
      meta: { customerName: 'Sara', providerName: 'Imran', totalPrice: 900 },
    });
    expect(out.customerName).toBe('Sara');
    expect(out.providerName).toBe('Imran');
    expect(out.totalPrice).toBe(900);
    expect(out.customerPhone).toBe('');
    expect(out.tier).toBeUndefined();
  });
});

describe('mapProviderRow', () => {
  it('maps snake_case + profile join into camelCase and derives `verified`', () => {
    const out = mapProviderRow({
      id: 'p1',
      category: 'Electrician',
      base_price: 1200,
      rating: 4.6,
      total_jobs: 87,
      tier: 'Gold',
      available: true,
      profile: {
        name: 'Kashif',
        city: 'Lahore',
        location_lat: 31.52,
        location_lng: 74.35,
        verification_status: 'verified',
        photo_url: 'https://x/y.png',
      },
    });
    expect(out.userId).toBe('p1');
    expect(out.basePrice).toBe(1200);
    expect(out.totalJobs).toBe(87);
    expect(out.location).toEqual({ lat: 31.52, lng: 74.35 });
    expect(out.verified).toBe(true);
    expect(out.photoURL).toBe('https://x/y.png');
  });

  it('defaults missing provider fields safely', () => {
    const out = mapProviderRow({ id: 'p2', category: 'Mason', profile: null });
    expect(out.name).toBe('Provider');
    expect(out.tier).toBe('Bronze');
    expect(out.available).toBe(false);
    expect(out.verified).toBe(false);
  });
});

describe('profileColumnsFromCamel', () => {
  it('renames known keys and expands a location object', () => {
    const row = profileColumnsFromCamel({
      name: 'Zaid',
      photoURL: 'https://cdn/avatar.png',
      location: { lat: 24.86, lng: 67.01 },
      current_mode: 'customer',
    });
    expect(row).toEqual({
      name: 'Zaid',
      current_mode: 'customer',
      photo_url: 'https://cdn/avatar.png',
      location_lat: 24.86,
      location_lng: 67.01,
    });
    expect(row.photoURL).toBeUndefined();
    expect(row.location).toBeUndefined();
  });

  it('leaves unknown snake_case keys untouched', () => {
    expect(profileColumnsFromCamel({ phone: '+92333' })).toEqual({ phone: '+92333' });
  });
});
