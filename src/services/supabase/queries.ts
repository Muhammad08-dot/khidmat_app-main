import { supabase } from './client';
import { Database } from '../../types/database.types';

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
      profiles:id ( name, city, location_lat, location_lng, photo_url, phone )
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
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const getMessages = async (bookingId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const sendMessage = async (bookingId: string, senderId: string, content: string) => {
  const { data, error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: senderId,
    content
  }).select().single();
  
  if (error) throw error;
  return data;
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
