import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';
import { getDocument, writeDocument } from '@/src/services/supabase/legacy';
import { track, AnalyticsEvents } from '@/src/services/analytics';
import {
  getDistanceKm,
  calculateTravelFeePKR,
  type LocationCoords,
} from '@/src/utils/location';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { TierBadge } from '@/src/components/ui/TierBadge';
import { StepIndicator } from '@/src/components/ui/StepIndicator';
import { colors } from '@/src/theme/tokens';
import { isRTL } from '@/src/i18n';

interface ProviderData {
  userId: string;
  name: string;
  category: string;
  city: string;
  location: LocationCoords;
  basePrice: number;
  rating: number;
  tier: string;
  photoURL?: string;
}

const TIME_SLOTS = [
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
];

function getDates() {
  const dates: { value: string; label: string; weekday: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dates.push({ value, label, weekday, isToday: i === 0 });
  }
  return dates;
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const { userProfile } = useAuth();
  const rtl = isRTL();

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0]);
  const [detailedAddress, setDetailedAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [jobCoordinates, setJobCoordinates] = useState<LocationCoords>({
    lat: userProfile?.location?.lat || 31.5204,
    lng: userProfile?.location?.lng || 74.3587,
  });

  const [distance, setDistance] = useState(0);
  const [travelFee, setTravelFee] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const dateOptions = getDates();

  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0].value);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    async function fetchProvider() {
      if (!providerId) {
        setError('No provider selected. Please select a provider first.');
        setLoading(false);
        return;
      }
      try {
        const doc = await getDocument('providers', providerId);
        if (doc) {
          setProvider({
            userId: doc.id || providerId,
            name: doc.name || 'Verified Provider',
            category: doc.category || 'General Services',
            city: doc.city || 'Lahore',
            location: doc.location || { lat: 31.5204, lng: 74.3587 },
            basePrice: doc.basePrice || 500,
            rating: doc.rating || 5.0,
            tier: doc.tier || 'Bronze',
            photoURL: doc.photoURL,
          });
        } else {
          setError('Provider not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Could not load provider profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchProvider();
  }, [providerId]);

  // Recalculate distance and price
  useEffect(() => {
    if (provider?.location && jobCoordinates) {
      const d = getDistanceKm(
        jobCoordinates.lat,
        jobCoordinates.lng,
        provider.location.lat,
        provider.location.lng
      );
      setDistance(d);
      const fee = calculateTravelFeePKR(d);
      setTravelFee(fee);
      const total = (provider.basePrice || 0) + fee;
      setTotalPrice(total);
    }
  }, [provider, jobCoordinates]);

  const handleBookingConfirm = async () => {
    setError(null);
    if (!detailedAddress.trim()) {
      setError('Please provide your complete street address.');
      return;
    }

    setBookingInProgress(true);
    try {
      const bookingId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        bookingId,
        providerId: provider?.userId,
        providerName: provider?.name,
        providerCategory: provider?.category,
        customerName: userProfile?.name || 'Customer',
        customerPhone: userProfile?.phone || '',
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        address: detailedAddress,
        notes,
        coordinates: jobCoordinates,
        status: 'pending',
        distanceKm: distance,
        basePrice: provider?.basePrice || 0,
        travelFee,
        totalPrice,
        createdAt: new Date().toISOString(),
      };
      const createdId = await writeDocument('bookings', bookingId, payload);
      track(AnalyticsEvents.BOOKING_CREATED, { totalPrice });
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace(`/chat?bookingId=${createdId}`);
      }, 2400);
    } catch (err: any) {
      console.error(err);
      setError('Failed to book service. Please check your network and try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-xs font-semibold text-gray-500">
          Loading booking details...
        </Text>
      </View>
    );
  }

  if (error && !provider) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <View className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5">
          <Text className="text-xs font-semibold text-red-700 text-center">{error}</Text>
        </View>
        <Button
          title="Back to Providers"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const bookingSteps = [
    { title: 'Schedule' },
    { title: 'Address' },
    { title: 'Confirm' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className={`flex-row items-center gap-3 mb-4 ${rtl ? 'flex-row-reverse' : ''}`}>
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center shadow-xs"
          >
            <ArrowLeft size={18} color="#1F2937" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Confirm Booking</Text>
            <Text className="text-xs text-gray-500">Lock your date, time and job location</Text>
          </View>
        </View>

        <StepIndicator steps={bookingSteps} currentStep={2} className="mb-4" />

        {error && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-xs font-semibold text-red-600">{error}</Text>
          </View>
        )}

        {/* Provider Profile Summary */}
        {provider && (
          <Card className="mb-4 p-4">
            <View className="flex-row items-center gap-3">
              <Avatar
                src={provider.photoURL}
                name={provider.name}
                className="w-12 h-12 rounded-full border border-gray-200"
              />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-gray-900">{provider.name}</Text>
                  <TierBadge tier={provider.tier as any} />
                </View>
                <Text className="text-xs text-gray-500">{provider.category}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text className="text-xs text-amber-500 font-bold">★ {provider.rating}</Text>
                  <Text className="text-xs text-gray-400">•</Text>
                  <Text className="text-xs font-semibold text-primary">PKR {provider.basePrice}/hr</Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Date Selection */}
        <Card className="mb-4 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Calendar size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-gray-800">Select Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {dateOptions.map((date) => {
              const isSelected = selectedDate === date.value;
              return (
                <Pressable
                  key={date.value}
                  onPress={() => setSelectedDate(date.value)}
                  className={`px-3 py-2.5 rounded-xl border items-center min-w-[70px] ${
                    isSelected
                      ? 'bg-emerald-50 border-primary'
                      : 'bg-white border-gray-200 active:bg-gray-50'
                  }`}
                >
                  <Text className={`text-[10px] font-bold ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                    {date.isToday ? 'Today' : date.weekday}
                  </Text>
                  <Text className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                    {date.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>

        {/* Time Slot Selection */}
        <Card className="mb-4 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Clock size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-gray-800">Preferred Time Slot</Text>
          </View>
          <View className="gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTimeSlot === slot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => setSelectedTimeSlot(slot)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 border-primary'
                      : 'bg-white border-gray-200 active:bg-gray-50'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                    {slot}
                  </Text>
                  <View
                    className={`w-4 h-4 rounded-full border items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Address Input */}
        <Card className="mb-4 p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <MapPin size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-gray-800">Job Address</Text>
          </View>
          <Input
            placeholder="House #, Street, Block, Area..."
            value={detailedAddress}
            onChangeText={setDetailedAddress}
            containerClassName="mb-3"
          />
          <Input
            placeholder="Special instructions or landmark (optional)..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* Price Breakdown */}
        <Card className="mb-6 p-4">
          <Text className="text-xs font-bold text-gray-800 mb-3">Price Breakdown</Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500">Service Base Rate</Text>
              <Text className="text-xs font-semibold text-gray-800">PKR {provider?.basePrice || 0}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500">Travel Distance ({distance.toFixed(1)} km)</Text>
              <Text className="text-xs font-semibold text-gray-800">PKR {travelFee}</Text>
            </View>
            <View className="h-px bg-gray-100 my-1" />
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-bold text-gray-900">Total Amount</Text>
                <Text className="text-[10px] text-gray-400">Cash on completion</Text>
              </View>
              <Text className="text-base font-bold text-primary">PKR {totalPrice}</Text>
            </View>
          </View>
        </Card>

        <Button
          title="Confirm & Book Service"
          onPress={handleBookingConfirm}
          loading={bookingInProgress}
          fullWidth
          className="mb-6"
        />

        {/* Success Modal */}
        <Modal transparent visible={showSuccessModal} animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-sm rounded-2xl bg-white p-6 items-center shadow-xl">
              <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                <CheckCircle size={32} color="#059669" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Booking Confirmed!</Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                Your request has been sent to {provider?.name}. Opening chat...
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
