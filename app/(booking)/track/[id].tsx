import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle,
  Phone,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/services/supabase/client';
import { listenToBookings } from '@/src/services/supabase/legacy';
import { LiveMap } from '@/src/components/features/LiveMap';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { Badge } from '@/src/components/ui/Badge';
import { colors } from '@/src/theme/tokens';
import { isRTL } from '@/src/i18n';

interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  date: string;
  timeSlot: string;
  address: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  totalPrice: number;
  basePrice: number;
  distanceKm: number;
  workerLocation?: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: string;
  };
  clientLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function LiveTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const rtl = isRTL();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveWorkerLocation, setLiveWorkerLocation] = useState<{
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: string;
  } | null>(null);

  const trackingChannelRef = useRef<any>(null);

  // Subscribe to Realtime tracking channel
  useEffect(() => {
    if (!id) return;
    const channelName = `tracking:${id}`;
    const channel = supabase.channel(channelName);
    trackingChannelRef.current = channel;

    channel.on('broadcast', { event: 'location' }, ({ payload }: any) => {
      if (!payload) return;
      if (payload.role === 'worker') {
        setLiveWorkerLocation({
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading || 0,
          speed: payload.speed || 0,
          timestamp: payload.timestamp || new Date().toISOString(),
        });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Subscribe to Booking state changes
  useEffect(() => {
    if (!id) return;
    const unsubscribe = listenToBookings('bookingId', id, (allBookings: any[]) => {
      const match = allBookings[0];
      if (match) {
        setBooking(match);
        setError(null);
      } else {
        setError('Booking not found or not accessible.');
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  const handleCall = () => {
    if (booking?.customerPhone) {
      Linking.openURL(`tel:${booking.customerPhone}`);
    }
  };

  const handleChat = () => {
    if (id) {
      router.push(`/chat?bookingId=${id}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-xs font-semibold text-gray-500">
          Connecting to live tracker...
        </Text>
      </View>
    );
  }

  const statusVariantMap: Record<string, any> = {
    pending: 'warning',
    confirmed: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };

  const currentStatus = booking?.status || 'pending';

  return (
    <View className="flex-1 bg-background">
      {/* Top Bar */}
      <View className="pt-12 pb-3 px-4 bg-white border-b border-border flex-row items-center justify-between shadow-xs">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
        >
          <ArrowLeft size={18} color="#1F2937" />
        </Pressable>
        <Text className="text-sm font-bold text-gray-900">Live Service Tracking</Text>
        <Badge
          label={currentStatus.replace('_', ' ').toUpperCase()}
          variant={statusVariantMap[currentStatus] || 'neutral'}
        />
      </View>

      {/* Map View */}
      <View className="flex-1">
        <LiveMap
          clientCoords={booking?.coordinates || null}
          workerCoords={liveWorkerLocation || (booking?.workerLocation as any) || null}
          isCompleted={currentStatus === 'completed'}
        />
      </View>

      {/* Bottom Sheet Card */}
      <View className="p-4 bg-white border-t border-border rounded-t-3xl shadow-lg">
        {/* Provider Profile & Actions */}
        <View className="flex-row items-center gap-3 mb-3">
          <Avatar
            name={booking?.providerName || 'Worker'}
            className="w-12 h-12 rounded-full border border-gray-200"
          />
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900">
              {booking?.providerName || 'Service Provider'}
            </Text>
            <Text className="text-xs text-gray-500">
              {booking?.providerCategory || 'Technician'}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Clock size={12} color={colors.primary} />
              <Text className="text-xs font-semibold text-primary">
                ETA ~ 15 mins
              </Text>
            </View>
          </View>

          {/* Quick Call & Chat */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleCall}
              className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center active:bg-emerald-100"
            >
              <Phone size={16} color="#059669" />
            </Pressable>
            <Pressable
              onPress={handleChat}
              className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 items-center justify-center active:bg-blue-100"
            >
              <MessageSquare size={16} color="#2563EB" />
            </Pressable>
          </View>
        </View>

        {/* Address and Price pill */}
        <View className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex-row items-center justify-between mb-3">
          <View className="flex-1 mr-3 flex-row items-center gap-1.5">
            <MapPin size={14} color="#6B7280" />
            <Text numberOfLines={1} className="text-xs text-gray-700 font-medium">
              {booking?.address || 'Service location'}
            </Text>
          </View>
          <Text className="text-xs font-bold text-primary">
            PKR {booking?.totalPrice || 0}
          </Text>
        </View>

        {/* Emergency SOS */}
        <Pressable
          onPress={() => Linking.openURL('tel:15')}
          className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200"
        >
          <ShieldAlert size={14} color="#DC2626" />
          <Text className="text-xs font-bold text-red-700">
            Khidmat Safety Shield (Emergency 15)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
