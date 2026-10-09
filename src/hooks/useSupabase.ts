import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCategories, 
  getProvidersByCategory, 
  getUserBookings, 
  getMessages, 
  sendMessage, 
  markMessagesSeen,
  getProviderReviews,
  createBooking,
  updateProviderLocation,
  getNotifications,
  markNotificationsRead
} from '../services/supabase/queries';
import { supabase } from '../services/supabase/client';
import { useEffect } from 'react';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
};

export const useProviderReviews = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: () => getProviderReviews(providerId as string),
    enabled: !!providerId,
  });
};

export const useProviders = (category: string) => {
  return useQuery({
    queryKey: ['providers', category],
    queryFn: () => getProvidersByCategory(category),
    enabled: !!category
  });
};

export const useBookings = (userId: string | undefined, role: 'customer' | 'provider' | undefined) => {
  return useQuery({
    queryKey: ['bookings', userId, role],
    queryFn: () => getUserBookings(userId!, role!),
    enabled: !!userId && !!role
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { customerId: string, providerId: string, category: string, description: string, urgency: string, estimatedPrice: number }) => 
      createBooking(params.customerId, params.providerId, params.category, params.description, params.urgency, params.estimatedPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useChatMessages = (bookingId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;

    // Supabase Realtime subscription for messages
    const channel = supabase
      .channel(`chat_${bookingId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `booking_id=eq.${bookingId}` 
      }, (payload) => {
        // Invalidate the query when a new message arrives
        queryClient.invalidateQueries({ queryKey: ['messages', bookingId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`
      }, () => {
        // Partner read-receipts (seen_at) land as UPDATEs — refresh the ticks.
        queryClient.invalidateQueries({ queryKey: ['messages', bookingId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);

  return useQuery({
    queryKey: ['messages', bookingId],
    queryFn: () => getMessages(bookingId),
    enabled: !!bookingId
  });
};

export const useSendMessage = () => {
  return useMutation({
    mutationFn: (params: { bookingId: string, senderId: string, content: string }) => 
      sendMessage(params.bookingId, params.senderId, params.content)
  });
};

export const useMarkMessagesSeen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { bookingId: string, myUserId: string }) =>
      markMessagesSeen(params.bookingId, params.myUserId),
    onSuccess: (_data, params) => {
      // Reflect our own ✓✓ immediately without waiting for the realtime echo.
      queryClient.invalidateQueries({ queryKey: ['messages', params.bookingId] });
    }
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { bookingId: string, status: string }) => {
      const { data, error } = await supabase.from('bookings').update({ status: params.status }).eq('id', params.bookingId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
  });
};

export const useNotifications = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    // Realtime bell: refresh the list whenever a notification row lands.
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(userId!),
    enabled: !!userId
  });
};

export const useMarkNotificationsRead = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markNotificationsRead(userId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
  });
};
