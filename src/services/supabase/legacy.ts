/**
 * Legacy Firestore-shaped data layer, re-implemented on top of Supabase.
 *
 * Screens were originally written against a denormalized camelCase document
 * model (`getDocument`, `writeDocument`, `listenToBookings`, ...). Instead of
 * rewriting every screen, this module adapts those call signatures to the
 * normalized Postgres schema (snake_case columns + a `bookings.meta` JSONB
 * column for extended, screen-only fields).
 */
import { supabase } from './client';
import { sendPushToUser } from '../push';
import { averageRating } from '../../utils/ratings';

export type Doc = Record<string, any>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** RFC4122 v4-ish uuid generator (no native crypto dependency). */
export const generateUuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/* ------------------------------------------------------------------ */
/* Bookings mapping                                                    */
/* ------------------------------------------------------------------ */

/** Columns that are persisted on `bookings` itself; everything else lives in `meta`. */
const BOOKING_COLUMN_KEYS: Record<string, string> = {
  customerId: 'customer_id',
  providerId: 'provider_id',
  providerCategory: 'category',
  category: 'category',
  description: 'description',
  status: 'status',
  urgency: 'urgency',
  totalPrice: 'estimated_price',
};

const BOOKING_SELECT = `
  *,
  customer:profiles!bookings_customer_id_fkey(name, phone),
  provider:providers!bookings_provider_id_fkey(base_price, profiles!providers_id_fkey(name))
`;

export const mapBookingRow = (row: any): Doc => {
  const meta: Doc = row.meta ?? {};
  const providerProfile = row.provider?.profiles as any;
  return {
    bookingId: row.id,
    customerId: row.customer_id,
    customerName: row.customer?.name ?? meta.customerName ?? 'Customer',
    customerPhone: meta.customerPhone ?? row.customer?.phone ?? '',
    providerId: row.provider_id,
    providerName: providerProfile?.name ?? meta.providerName ?? 'Provider',
    providerCategory: row.category,
    description: row.description ?? '',
    date: meta.date ?? String(row.created_at ?? '').slice(0, 10),
    timeSlot: meta.timeSlot ?? '',
    address: meta.address ?? '',
    notes: meta.notes ?? '',
    status: row.status,
    urgency: row.urgency ?? 'medium',
    totalPrice: row.estimated_price ?? meta.totalPrice ?? 0,
    distanceKm: meta.distanceKm ?? 0,
    basePrice: meta.basePrice ?? row.provider?.base_price ?? 0,
    travelFee: meta.travelFee ?? 0,
    coordinates:
      meta.coordinates ??
      (row.location_lat != null ? { lat: row.location_lat, lng: row.location_lng } : undefined),
    workerLocation: meta.workerLocation,
    clientLocation: meta.clientLocation,
    customerRating: meta.customerRating,
    reviewedAt: meta.reviewedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const fetchBookingById = async (id: string): Promise<Doc | null> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBookingRow(data) : null;
};

/* ------------------------------------------------------------------ */
/* Providers mapping                                                   */
/* ------------------------------------------------------------------ */

const PROVIDER_SELECT = `
  *,
  profile:profiles!providers_id_fkey(name, phone, city, photo_url, location_lat, location_lng, verification_status)
`;

export const mapProviderRow = (row: any): Doc => ({
  userId: row.id,
  name: row.profile?.name ?? 'Provider',
  category: row.category,
  city: row.profile?.city ?? '',
  location: {
    lat: row.profile?.location_lat ?? 0,
    lng: row.profile?.location_lng ?? 0,
  },
  basePrice: row.base_price ?? 0,
  rating: row.rating ?? 0,
  totalJobs: row.total_jobs ?? 0,
  tier: row.tier ?? 'Bronze',
  bio: row.bio ?? '',
  available: row.available ?? false,
  verified: row.profile?.verification_status === 'verified',
  photoURL: row.profile?.photo_url,
  phone: row.profile?.phone,
});

/* ------------------------------------------------------------------ */
/* Firestore-style API used by the screens                             */
/* ------------------------------------------------------------------ */

export async function getDocument(collection: string, id: string): Promise<Doc | null> {
  if (collection === 'bookings') return fetchBookingById(id);

  if (collection === 'providers') {
    const { data, error } = await supabase
      .from('providers')
      .select(PROVIDER_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProviderRow(data) : null;
  }

  if (collection === 'profiles') {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  }

  throw new Error(`getDocument: unsupported collection "${collection}"`);
}

export async function getCollectionDocs(collection: string): Promise<Doc[]> {
  if (collection === 'providers') {
    const { data, error } = await supabase.from('providers').select(PROVIDER_SELECT);
    if (error) throw error;
    return (data ?? []).map(mapProviderRow);
  }
  throw new Error(`getCollectionDocs: unsupported collection "${collection}"`);
}

/**
 * Upserts a document and returns the canonical (uuid) id. When the caller
 * supplies a legacy non-uuid id (e.g. `booking_abc123`), a fresh uuid is
 * generated and returned so it can be used for navigation.
 */
export async function writeDocument(collection: string, id: string, data: Doc): Promise<string> {
  if (collection === 'bookings') {
    const row: Doc = {
      updated_at: new Date().toISOString(),
      status: data.status ?? 'pending',
    };
    if (isUuid(data.customerId)) row.customer_id = data.customerId;
    if (isUuid(data.providerId)) row.provider_id = data.providerId;
    row.category = data.providerCategory ?? data.category ?? 'General';
    row.description = data.description ?? data.notes ?? `${data.providerCategory ?? 'Service'} request`;
    if (data.urgency) row.urgency = data.urgency;
    if (typeof data.totalPrice === 'number') row.estimated_price = Math.round(data.totalPrice);
    if (data.coordinates) {
      row.location_lat = data.coordinates.lat;
      row.location_lng = data.coordinates.lng;
    }

    // Everything the schema has no column for is merged into `meta`.
    const meta: Doc = { ...(data.meta ?? {}) };
    Object.keys(data).forEach((key) => {
      if (!BOOKING_COLUMN_KEYS[key] && key !== 'meta' && key !== 'coordinates') {
        meta[key] = data[key];
      }
    });
    row.meta = meta;

    const docId = isUuid(id) ? id : generateUuid();
    const { error } = await supabase.from('bookings').upsert({ id: docId, ...row });
    if (error) throw error;
    return docId;
  }

  if (collection === 'profiles') {
    const row = profileColumnsFromCamel(data);
    const { error } = await supabase.from('profiles').update(row).eq('id', id);
    if (error) throw error;
    return id;
  }

  throw new Error(`writeDocument: unsupported collection "${collection}"`);
}

/* ------------------------------------------------------------------ */
/* Profiles helpers                                                    */
/* ------------------------------------------------------------------ */

const mapProfileRow = (row: any): Doc => ({
  ...row,
  photoURL: row.photo_url,
});

/** Translates the camelCase keys screens pass to `updateProfile` into columns. */
export function profileColumnsFromCamel(data: Doc): Doc {
  const { photoURL, basePrice, location, ...rest } = data;
  const row: Doc = { ...rest };
  if (photoURL !== undefined) row.photo_url = photoURL;
  if (basePrice !== undefined) row.base_price = basePrice;
  if (location && typeof location === 'object') {
    row.location_lat = location.lat;
    row.location_lng = location.lng;
  }
  return row;
}

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

/**
 * Streams bookings filtered by a camelCase field name ('bookingId' |
 * 'customerId' | 'providerId'), mapped into the legacy view model.
 * Returns an unsubscribe function.
 */
export function listenToBookings(
  fieldName: string,
  value: string,
  callback: (data: Doc[]) => void
): () => void {
  const column =
    fieldName === 'bookingId' ? 'id' : fieldName === 'customerId' ? 'customer_id' : 'provider_id';

  let closed = false;

  const fetchOnce = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq(column, value)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!closed) callback((data ?? []).map(mapBookingRow));
    } catch (err) {
      console.error('[legacy] listenToBookings fetch failed:', err);
    }
  };

  fetchOnce();

  const channel = supabase
    .channel(`bookings_${fieldName}_${value}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      () => void fetchOnce()
    )
    .subscribe();

  return () => {
    closed = true;
    supabase.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/* Notifications, reviews, media, email                                */
/* ------------------------------------------------------------------ */

const NOTIFICATION_TITLES: Record<string, string> = {
  job_accepted: 'Booking accepted',
  job_completed: 'Job completed',
  job_confirmed: 'Booking update',
  invitation: 'New service request',
};

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  bookingId?: string
): Promise<void> {
  try {
    if (!isUuid(userId)) return; // cannot notify without a real profile id
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      message,
      booking_id: isUuid(bookingId) ? bookingId : null,
    });
    if (error) throw error;
    // Best-effort push fan-out alongside the in-app notification row.
    void sendPushToUser(userId, NOTIFICATION_TITLES[type] ?? 'Khidmat', message, {
      type,
      bookingId: bookingId ?? null,
    });
  } catch (err) {
    // Notifications are best-effort; never block a booking workflow on them.
    console.warn('[legacy] createNotification skipped:', (err as Error).message);
  }
}

/** Read-modify-write merge into `bookings.meta` (JSONB) without touching columns. */
export async function mergeBookingMeta(bookingId: string, patch: Doc): Promise<void> {
  if (!isUuid(bookingId)) return;
  const { data, error } = await supabase
    .from('bookings')
    .select('meta')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  const merged = { ...(data?.meta ?? {}), ...patch };
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ meta: merged })
    .eq('id', bookingId);
  if (updateError) throw updateError;
}

/** Uploads before/after job proof photos; returns the public URL. */
export async function uploadJobMedia(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '') ? ext : 'jpg';
  const path = `${userId}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage
    .from('job_media')
    .upload(path, blob, {
      contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
      upsert: false,
    });
  if (error) throw error;

  return supabase.storage.from('job_media').getPublicUrl(path).data.publicUrl;
}

export async function submitProviderReview(
  bookingId: string,
  providerId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('reviews').insert({
    booking_id: bookingId,
    provider_id: providerId,
    reviewer_id: user.id,
    rating,
    comment: comment ?? null,
  });
  if (error) throw error;

  // Recompute the provider's aggregate rating from ALL their reviews so the
  // star on cards/detail actually reflects new feedback (the write-only bug).
  await recomputeProviderRating(providerId);
}

/** AVG(rating) over a provider's visible reviews -> providers.rating (1 decimal). */
export async function recomputeProviderRating(providerId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('provider_id', providerId)
    .neq('is_hidden', true);
  if (error || !data || data.length === 0) return;
  await supabase.from('providers').update({ rating: averageRating(data.map((r) => r.rating)) }).eq('id', providerId);
}

export async function uploadProfilePhoto(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '') ? ext : 'jpg';
  const path = `${userId}/avatar.${safeExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`, upsert: true });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/**
 * Mock-safe invitation email. PII (addresses, names) is never logged or sent
 * from the client. Real delivery is gated behind EXPO_PUBLIC_EMAIL_ENABLED
 * and must be routed through a trusted server, never the mobile bundle.
 */
export async function sendInvitationEmail(
  _to: string,
  _providerName: string,
  _customerName: string,
  _customerId: string,
  _customerEmail: string,
  _category: string,
  _city: string
): Promise<void> {
  const enabled = process.env.EXPO_PUBLIC_EMAIL_ENABLED === 'true';
  if (!enabled) {
    console.log('[email] Invitation skipped (EXPO_PUBLIC_EMAIL_ENABLED is not set).');
    return;
  }
  throw new Error('Email delivery must be routed through a server-side provider.');
}

/** In-app notification for a provider when a customer requests their service. */
export async function createInvitationNotification(
  providerUserId: string,
  customerName: string,
  _customerId: string,
  _customerEmail: string,
  category: string,
  city: string
): Promise<void> {
  await createNotification(
    providerUserId,
    'invitation',
    `${customerName} in ${city} requested ${category} services.`
  );
}
