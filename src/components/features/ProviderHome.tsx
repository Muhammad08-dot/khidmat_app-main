import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import { useBookings, useUpdateBookingStatus, useSendMessage } from '@/src/hooks/useSupabase';
import { uploadJobMedia, mergeBookingMeta } from '@/src/services/supabase/legacy';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  MessageSquare,
  Camera,
  ShieldCheck,
  TrendingUp,
  Star,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { getCurrentCoords } from '@/src/utils/geolocation';
import { Avatar } from '@/src/components/ui/Avatar';
import { TierBadge } from '@/src/components/ui/TierBadge';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { colors } from '@/src/theme/tokens';
import { isRTL } from '@/src/i18n';

export const ProviderHome: React.FC = () => {
  const router = useRouter();
  const { user, userProfile, updateProfile } = useAuth();
  const { data: bookings = [], isLoading, refetch } = useBookings(user?.id, 'provider');
  const { mutateAsync: updateStatus } = useUpdateBookingStatus();
  const { mutateAsync: sendSystemMessage } = useSendMessage();

  const rtl = isRTL();
  const [toggling, setToggling] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [completingBooking, setCompletingBooking] = useState<any | null>(null);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [codCashReceived, setCodCashReceived] = useState(true);
  const [finishing, setFinishing] = useState(false);

  if (!userProfile) return null;

  const isOnline = userProfile.available === true;
  const isKycVerified = userProfile.kycVerified === true;

  const toggleOnline = async () => {
    if (!user) return;
    setToggling(true);
    setLocationError(null);

    if (!isOnline) {
      const coords = await getCurrentCoords();
      if (!coords) {
        setLocationError('Location access is required to go Online.');
        setToggling(false);
        return;
      }
      try {
        await updateProfile({ available: true, location: coords });
      } catch (err) {
        console.error('Failed to update online status:', err);
        setLocationError('Failed to update status. Please check your network.');
      }
    } else {
      try {
        await updateProfile({ available: false });
      } catch (err) {
        console.error('Failed to update offline status:', err);
      }
    }
    setToggling(false);
  };

  const acceptBooking = async (booking: any) => {
    try {
      await updateStatus({
        bookingId: booking.bookingId || booking.id,
        status: 'confirmed',
        expectedCurrentStatus: booking.status || 'pending',
      });
      refetch();
    } catch (err: any) {
      console.error('Error accepting booking:', err);
      Alert.alert('Action Failed', err?.message || 'Could not accept this booking.');
    }
  };

  const declineBooking = async (booking: any) => {
    try {
      await updateStatus({
        bookingId: booking.bookingId || booking.id,
        status: 'cancelled',
        expectedCurrentStatus: booking.status || 'pending',
      });
      refetch();
    } catch (err: any) {
      console.error('Error declining booking:', err);
    }
  };

  const completeBooking = async (booking: any) => {
    try {
      const bookingId = booking.bookingId || booking.id;
      await updateStatus({
        bookingId,
        status: 'completed',
        expectedCurrentStatus: booking.status || 'in_progress',
      });
      await sendSystemMessage({
        bookingId,
        senderId: user?.id || '',
        content: JSON.stringify({
          text: 'The provider has marked this job as completed.',
          isSystemEvent: true,
          eventStatus: 'completed',
        }),
      });
      refetch();
    } catch (err) {
      console.error('Error completing booking:', err);
      Alert.alert('Failed', 'Failed to update booking status.');
    }
  };

  const openCompleteModal = (booking: any) => {
    setCompletionPhotos([]);
    setCodCashReceived(true);
    setCompletingBooking(booking);
  };

  const pickCompletionPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required for completion proof.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCompletionPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 3));
    }
  };

  const confirmComplete = async () => {
    if (!completingBooking || finishing) return;
    setFinishing(true);
    try {
      const bookingId = completingBooking.bookingId || completingBooking.id;
      const metaPatch: Record<string, any> = {
        codReceived: codCashReceived,
        codReceivedAmount: completingBooking.totalPrice || completingBooking.estimated_price || 0,
        codMarkedAt: new Date().toISOString(),
      };
      if (completionPhotos.length > 0) {
        const paths: string[] = [];
        for (const uri of completionPhotos) {
          try {
            paths.push(await uploadJobMedia(bookingId, uri));
          } catch (e) {
            console.warn('Job photo upload failed:', e);
          }
        }
        if (paths.length > 0) {
          metaPatch.jobPhotos = [...(completingBooking.jobPhotos ?? []), ...paths];
        }
      }
      await mergeBookingMeta(bookingId, metaPatch);
      await completeBooking(completingBooking);
      setCompletingBooking(null);
    } finally {
      setFinishing(false);
    }
  };

  const openChat = (bookingId: string) => router.push(`/chat?bookingId=${bookingId}`);

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  const totalEarnings = userProfile.totalEarnings || 0;
  const completedJobs = userProfile.totalJobs || 0;

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          {/* Header Card with Availability Toggle (S-8) */}
          <Card className="p-5 mb-4">
            <View className="flex-row items-center gap-3.5 mb-4">
              <Avatar
                src={userProfile.photoURL}
                name={userProfile.name}
                className="w-14 h-14 rounded-full border border-gray-200"
              />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-gray-900">
                    {userProfile.name}
                  </Text>
                  <TierBadge tier={(userProfile.tier as any) || 'Bronze'} />
                </View>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {userProfile.category || 'Professional Partner'} • {userProfile.city || 'Pakistan'}
                </Text>
              </View>
            </View>

            {/* Prominent Availability Toggle Button */}
            <Pressable
              onPress={toggleOnline}
              disabled={toggling}
              className={`w-full py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2.5 transition-all ${
                isOnline
                  ? 'bg-emerald-600 border border-emerald-700 shadow-sm'
                  : 'bg-gray-100 border border-gray-200'
              }`}
            >
              {toggling ? (
                <ActivityIndicator size="small" color={isOnline ? '#FFFFFF' : colors.primary} />
              ) : (
                <View
                  className={`w-3.5 h-3.5 rounded-full ${
                    isOnline ? 'bg-white' : 'bg-gray-400'
                  }`}
                />
              )}
              <Text
                className={`text-sm font-bold ${
                  isOnline ? 'text-white' : 'text-gray-700'
                }`}
              >
                {toggling
                  ? 'Updating status...'
                  : isOnline
                  ? 'YOU ARE ONLINE • READY FOR JOBS'
                  : 'YOU ARE OFFLINE • GO ONLINE'}
              </Text>
            </Pressable>

            {locationError && (
              <Text className="mt-2 text-xs text-red-600 font-medium">
                {locationError}
              </Text>
            )}
          </Card>

          {/* KYC Status Banner (S-8) */}
          <View
            className={`p-4 rounded-2xl border mb-4 flex-row items-center gap-3 ${
              isKycVerified
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            {isKycVerified ? (
              <ShieldCheck size={22} color="#059669" />
            ) : (
              <AlertTriangle size={22} color="#D97706" />
            )}
            <View className="flex-1">
              <Text
                className={`text-xs font-bold ${
                  isKycVerified ? 'text-emerald-900' : 'text-amber-900'
                }`}
              >
                {isKycVerified
                  ? 'CNIC Identity Verified'
                  : 'KYC Document Verification Required'}
              </Text>
              <Text
                className={`text-[11px] mt-0.5 leading-tight ${
                  isKycVerified ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {isKycVerified
                  ? 'Your profile carries the verified badge for all customer searches.'
                  : 'Upload your CNIC images in Profile to unlock full customer job visibility.'}
              </Text>
            </View>
          </View>

          {/* Earnings & Stats Summary Cards (S-8) */}
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 p-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[11px] font-semibold text-gray-500 uppercase">
                  Total Earnings
                </Text>
                <TrendingUp size={14} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                PKR {totalEarnings}
              </Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                Cash settled jobs
              </Text>
            </Card>

            <Card className="flex-1 p-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[11px] font-semibold text-gray-500 uppercase">
                  Completed
                </Text>
                <CheckCircle size={14} color="#059669" />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                {completedJobs} Jobs
              </Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                ★ 5.0 Rating average
              </Text>
            </Card>
          </View>

          {/* Incoming Job Requests (S-8) */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">
                Incoming Requests ({pendingBookings.length})
              </Text>
              {pendingBookings.length > 0 && (
                <Badge label="Action Required" variant="warning" />
              )}
            </View>

            {pendingBookings.length === 0 ? (
              <Card className="p-6 items-center">
                <Clock size={28} color="#9CA3AF" />
                <Text className="text-xs font-semibold text-gray-600 mt-2">
                  No pending requests
                </Text>
                <Text className="text-[11px] text-gray-400 text-center mt-0.5">
                  Stay online to receive instant booking notifications from nearby clients.
                </Text>
              </Card>
            ) : (
              pendingBookings.map((b) => (
                <Card key={b.bookingId || b.id} className="p-4 mb-3">
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        {b.customerName || 'Customer Request'}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {b.providerCategory || 'Service'} • {b.date || 'Today'} ({b.timeSlot || 'Flexible'})
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-primary">
                      PKR {b.totalPrice || 0}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1.5 p-2 rounded-lg bg-gray-50 mb-3">
                    <MapPin size={13} color="#6B7280" />
                    <Text numberOfLines={1} className="text-xs text-gray-700 flex-1">
                      {b.address || 'Location provided upon accept'}
                    </Text>
                  </View>

                  <View className="flex-row gap-2.5">
                    <Button
                      title="Decline"
                      variant="ghost"
                      onPress={() => declineBooking(b)}
                      className="flex-1 py-2 min-h-[40px]"
                    />
                    <Button
                      title="Accept Job"
                      onPress={() => acceptBooking(b)}
                      className="flex-1 py-2 min-h-[40px]"
                    />
                  </View>
                </Card>
              ))
            )}
          </View>

          {/* Active Jobs in Progress */}
          {activeBookings.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Active Jobs ({activeBookings.length})
              </Text>
              {activeBookings.map((b) => (
                <Card key={b.bookingId || b.id} className="p-4 mb-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-bold text-gray-900">
                      {b.customerName || 'Active Job'}
                    </Text>
                    <Badge label="In Progress" variant="warning" />
                  </View>
                  <Text className="text-xs text-gray-600 mb-3">
                    {b.address}
                  </Text>
                  <View className="flex-row gap-2">
                    <Button
                      title="Chat with Client"
                      variant="outline"
                      onPress={() => openChat(b.bookingId || b.id)}
                      className="flex-1 py-2 min-h-[42px]"
                    />
                    <Button
                      title="Mark Completed"
                      onPress={() => openCompleteModal(b)}
                      className="flex-1 py-2 min-h-[42px]"
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Completion Modal */}
        <Modal
          visible={!!completingBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setCompletingBooking(null)}
        >
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <Text className="text-base font-bold text-gray-900 mb-1">
                Complete Service
              </Text>
              <Text className="text-xs text-gray-500 mb-4">
                Confirm cash received and take job photos before closing.
              </Text>

              <Pressable
                onPress={() => setCodCashReceived(!codCashReceived)}
                className="flex-row items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 mb-4"
              >
                <View
                  className={`w-5 h-5 rounded-md border items-center justify-center ${
                    codCashReceived ? 'bg-primary border-primary' : 'border-gray-400'
                  }`}
                >
                  {codCashReceived && <Text className="text-xs text-white font-bold">✓</Text>}
                </View>
                <Text className="text-xs font-semibold text-gray-800">
                  Cash Payment of PKR {completingBooking?.totalPrice || 0} Received
                </Text>
              </Pressable>

              <Pressable
                onPress={pickCompletionPhoto}
                className="w-full py-3 rounded-xl border border-dashed border-gray-300 items-center justify-center flex-row gap-2 mb-4"
              >
                <Camera size={16} color={colors.primary} />
                <Text className="text-xs font-semibold text-primary">
                  {completionPhotos.length > 0
                    ? `${completionPhotos.length} Photo(s) Attached`
                    : 'Attach Job Photo (Optional)'}
                </Text>
              </Pressable>

              <View className="flex-row gap-3">
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setCompletingBooking(null)}
                  className="flex-1"
                />
                <Button
                  title="Confirm"
                  onPress={confirmComplete}
                  loading={finishing}
                  className="flex-1"
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
};

export default ProviderHome;
