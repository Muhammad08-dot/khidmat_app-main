import { supabase } from './client';
import { averageRating } from '../../utils/ratings';

export type Doc = Record<string, any>;

export const mapBookingRow = (row: any): Doc => {
  const meta: Doc = row.meta ?? {};
  const providerProfile = row.provider?.profiles as any;
  return {
    bookingId: row.id,
    customerId: row.customer_id,
    customerName: row.customer?.name ?? meta.customerName ?? 'Customer',
    customerPhone: meta.customerPhone ?? row.customer?.profile_contacts?.phone ?? '',
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

/** Translates the camelCase keys screens pass to `updateProfile` into columns. */
export function profileColumnsFromCamel(data: Doc): Doc {
  const { photoURL, basePrice, location, currentMode, ...rest } = data;
  const row: Doc = { ...rest };
  if (photoURL !== undefined) row.photo_url = photoURL;
  if (basePrice !== undefined) row.base_price = basePrice;
  if (currentMode !== undefined) row.current_mode = currentMode;
  if (location && typeof location === 'object') {
    row.location_lat = (location as any).lat;
    row.location_lng = (location as any).lng;
  }
  return row;
}

/** AVG(rating) over a provider's visible reviews -> providers.rating (1 decimal). */
export async function recomputeProviderRating(providerId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('provider_id', providerId)
    .neq('is_hidden', true);
  if (error || !data || data.length === 0) return;
  await supabase
    .from('providers')
    .update({ rating: averageRating(data.map((r) => r.rating)) })
    .eq('id', providerId);
}
