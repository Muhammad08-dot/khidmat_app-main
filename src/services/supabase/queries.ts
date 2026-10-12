import { supabase } from './client';
import { Database } from '../../types/database.types';
import { mapBookingRow, recomputeProviderRating } from './legacy';

export const getCategories = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data;
};

export const getProvidersByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from('providers')
    .select(`
      *,
      profiles:id ( name, city, location_lat, location_lng, photo_url )
    `)
    .eq('category', category)
    .eq('available', true);
  if (error) throw error;
  return data;
};

export const createBooking = async (
  customerId: string, 
  providerId: string, 
  category: string, 
  description: string, 
  urgency: string, 
  estimatedPrice: number
) => {
  const { data, error } = await supabase.from('bookings').insert({
    customer_id: customerId,
    provider_id: providerId,
    category,
    description,
    urgency,
    estimated_price: estimatedPrice,
    status: 'pending'
  }).select().single();
  
  if (error) throw error;
  return data;
};

export const getUserBookings = async (userId: string, role: 'customer' | 'provider') => {
  const column = role === 'customer' ? 'customer_id' : 'provider_id';
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(id, name),
      provider:providers!bookings_provider_id_fkey(base_price, profiles!providers_id_fkey(id, name))
    `)
    .eq(column, userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  // Screens consume the legacy camelCase booking view model.
  return (data ?? []).map(mapBookingRow);
};

export const getMessages = async (bookingId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(name)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  // Normalize to the ChatMessage shape the screens render.
  return (data ?? []).map((row: any) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(row.content);
    } catch {
      parsed = {};
    }
    return {
      id: row.id,
      bookingId: row.booking_id,
      senderId: row.sender_id,
      senderName: row.sender?.name ?? 'User',
      text: typeof parsed?.text === 'string' ? parsed.text : row.content,
      isSystem: parsed?.isSystemEvent === true,
      eventStatus: parsed?.eventStatus,
      createdAt: row.created_at,
      seenAt: row.seen_at ?? null,
    };
  });
};

import { sendPushToUser } from '../push';

export const sendMessage = async (bookingId: string, senderId: string, content: string) => {
  const { data, error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: senderId,
    content
  }).select().single();
  
  if (error) throw error;

  // Best-effort push notification
  try {
    const { data: booking } = await supabase.from('bookings').select('customer_id, provider_id').eq('id', bookingId).single();
    if (booking) {
      const receiverId = booking.customer_id === senderId ? booking.provider_id : booking.customer_id;
      sendPushToUser(receiverId, 'New Message', content, { bookingId });
    }
  } catch (err) {
    console.warn('Failed to send push notification', err);
  }

  return data;
};

/**
 * Mark the partner's messages in a thread as seen (the recipient calls this
 * while viewing). Only touches messages the *other* person sent that are not
 * already seen — one bulk UPDATE, no storage cost, drives the ✓✓ receipt.
 */
export const markMessagesSeen = async (bookingId: string, myUserId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ seen_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .neq('sender_id', myUserId)
    .is('seen_at', null);
  if (error) throw error;
};

// Individual reviews for a provider's public page, with the reviewer's name
// embedded from profiles (PostgREST FK: reviews.reviewer_id -> profiles.id).
export const getProviderReviews = async (providerId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer:profiles(name)')
    .eq('provider_id', providerId)
    .neq('is_hidden', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    rating: row.rating as number,
    comment: (row.comment as string | null) ?? null,
    name: (row.reviewer?.name as string | undefined) ?? 'Customer',
    date: row.created_at as string,
  }));
};

export const updateProviderLocation = async (providerId: string, bookingId: string, lat: number, lng: number) => {
  const { error } = await supabase.from('provider_locations').upsert({
    provider_id: providerId,
    booking_id: bookingId,
    lat,
    lng,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
};

export const getNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
};

export const markNotificationsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
};

/* ------------------------------------------------------------------ */
/* Admin / moderation (Play Store operational readiness)              */
/* ------------------------------------------------------------------ */

/**
 * Append an audit row to `admin_actions`. Best-effort: if the write is
 * rejected (non-admin RLS or transient failure) the primary mutation still
 * succeeded and should not be reversed. Never store PII in `meta`.
 */
const logAdminAction = async (
  action: string,
  targetType: 'profile' | 'review',
  targetId: string,
  meta: Record<string, unknown> = {},
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase.from('admin_actions').insert({
      actor_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      meta,
    });
  } catch {
    /* swallow: audit trail is best-effort */
  }
};

/** Providers awaiting KYC review (new signups default to 'pending'). */
export const getPendingProviders = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, city, role, verification_status, created_at')
    .eq('role', 'provider')
    .in('verification_status', ['pending', 'unverified'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  // Phone lives in profile_contacts (owner / admin / booking-counterparty RLS).
  // Admin passes the RLS check, so a batched lookup returns phones for the queue.
  const ids = rows.map((r) => r.id as string);
  const phoneById = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: contacts } = await supabase
      .from('profile_contacts')
      .select('user_id, phone')
      .in('user_id', ids);
    for (const c of (contacts ?? []) as any[]) phoneById.set(c.user_id as string, (c.phone as string | null) ?? null);
  }
  return rows.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    phone: phoneById.get(row.id as string) ?? null,
    city: (row.city as string | null) ?? null,
    status: row.verification_status as string,
    createdAt: row.created_at as string,
  }));
};

/** Approve / reject a provider's KYC by writing profiles.verification_status. */
export const setProviderVerification = async (profileId: string, status: 'verified' | 'rejected') => {
  const { error } = await supabase
    .from('profiles')
    .update({ verification_status: status })
    .eq('id', profileId);
  if (error) throw error;
  await logAdminAction(
    status === 'verified' ? 'provider.verified' : 'provider.rejected',
    'profile',
    profileId,
    { status },
  );
};

/** Latest reviews across all providers, for the moderation queue. */
export const getRecentReviews = async (limit = 50) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id, rating, comment, created_at, is_hidden, reviewer:profiles(name), provider:providers(id, profile:profiles(name))'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    rating: row.rating as number,
    comment: (row.comment as string | null) ?? null,
    date: row.created_at as string,
    hidden: row.is_hidden === true,
    reviewerName: (row.reviewer?.name as string | undefined) ?? 'Customer',
    providerId: (row.provider?.id as string | undefined) ?? null,
    providerName: (row.provider?.profile?.name as string | undefined) ?? 'Provider',
  }));
};

/** Soft-hide / unhide a review, then refresh the provider's average rating. */
export const setReviewHidden = async (reviewId: string, providerId: string | null, hidden: boolean) => {
  const { error } = await supabase.from('reviews').update({ is_hidden: hidden }).eq('id', reviewId);
  if (error) throw error;
  if (providerId) await recomputeProviderRating(providerId);
  await logAdminAction(hidden ? 'review.hidden' : 'review.unhidden', 'review', reviewId, {
    provider_id: providerId,
  });
};

/** Permanently delete a review, then refresh the provider's average rating. */
export const deleteReview = async (reviewId: string, providerId: string | null) => {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
  if (providerId) await recomputeProviderRating(providerId);
  await logAdminAction('review.deleted', 'review', reviewId, { provider_id: providerId });
};
