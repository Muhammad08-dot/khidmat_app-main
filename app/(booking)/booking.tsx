import React, { useState, useEffect } from "react";

import {
  getDistanceKm,
  calculateTravelFeePKR,
  estimateTravelTimeMinutes,
  type LocationCoords,
} from "@/src/utils/location";
import { getCurrentCoords } from "@/src/utils/geolocation";
import { Card } from "@/src/components/ui/Card";
import { Avatar } from "@/src/components/ui/Avatar";
import { Icon } from "@/src/components/ui/Icon";

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
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
];

function getDates() {
  const dates: { value: string; label: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dates.push({ value, label, isToday: i === 0 });
  }
  return dates;
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const { user, userProfile, updateProfile } = useAuth();

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0]);
  const [detailedAddress, setDetailedAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

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
  }, []);

  // Request location access on mount (replaces navigator.geolocation)
  useEffect(() => {
    (async () => {
      const coords = await getCurrentCoords();
      if (coords) {
        setJobCoordinates(coords);
        setLocationError(null);
        try {
          await updateProfile({ location: coords });
        } catch {}
      } else {
        setLocationError(
          "Location access is required to book services. Please enable location permissions."
        );
      }
    })();
  }, []);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId) {
        setError("No provider selected for booking.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getDocument("providers", providerId);
        if (data) {
          setProvider(data as ProviderData);
        } else {
          setError("Selected provider profile could not be found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch provider details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [providerId]);

  useEffect(() => {
    if (!provider || !jobCoordinates) return;
    const dist = getDistanceKm(
      provider.location.lat,
      provider.location.lng,
      jobCoordinates.lat,
      jobCoordinates.lng
    );
    const fee = calculateTravelFeePKR(dist);
    setDistance(dist);
    setTravelFee(fee);
    setTotalPrice(provider.basePrice + fee);
  }, [provider, jobCoordinates]);

  const handleConfirm = async () => {
    if (locationError) {
      setError(locationError);
      return;
    }
    if (!selectedDate) {
      setError("Please select a booking date.");
      return;
    }
    if (!detailedAddress.trim()) {
      setError(
        "Please enter a detailed street address so the worker can find you."
      );
      return;
    }
    setBookingInProgress(true);
    setError(null);

    try {
      const bookingId = `booking_${Math.random().toString(36).substring(2, 11)}`;
      const payload = {
        bookingId,
        customerId: user?.uid || "anonymous",
        customerName: userProfile?.name || "Customer",
        customerPhone: userProfile?.phone || "",
        providerId: provider?.userId,
        providerName: provider?.name,
        providerCategory: provider?.category,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        address: detailedAddress,
        coordinates: jobCoordinates,
        notes,
        status: "pending",
        distanceKm: distance,
        basePrice: provider?.basePrice || 0,
        travelFee,
        totalPrice,
        createdAt: new Date().toISOString(),
      };
      await writeDocument("bookings", bookingId, payload);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace(`/chat?bookingId=${bookingId}`);
      }, 2600);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to book service. Please check your network and try again."
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-3 text-sm text-ink/60">
          Loading booking details...
        </Text>
      </View>
    );
  }

  if (error && !provider) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <View className="mb-6 rounded-xl border border-accent-terracotta/20 bg-accent-terracotta/10 p-6 text-center">
          <Text className="text-accent-terracotta">{error}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 rounded-xl bg-primary px-6 py-3"
        >
          <Icon icon={ArrowLeft} color="#fff" size={18} />
          <Text className="font-semibold text-white">Back to Providers</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          {/* Header */}
          <View className="mb-4 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full border border-border"
            >
              <Icon icon={ArrowLeft} color="#14231C" size={20} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-display text-lg font-medium text-ink">
                Confirm Booking
              </Text>
              <Text className="text-xs text-ink/60">
                Schedule &amp; pin your job location
              </Text>
            </View>
          </View>

          {/* Error banner */}
          {error && provider && (
            <View className="mb-4 rounded-xl border border-accent-terracotta/20 bg-accent-terracotta/10 p-4">
              <Text className="text-sm text-accent-terracotta">{error}</Text>
            </View>
          )}

          <View className="gap-4">
            {/* Date selection */}
            <Card className="p-4">
              <Text className="mb-3 flex-row items-center gap-1.5 text-sm font-bold text-ink/65">
                <Icon icon={Calendar} color="#1F5D3F" size={20} /> Select Date
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {dateOptions.map((date) => (
                  <Pressable
                    key={date.value}
                    onPress={() => setSelectedDate(date.value)}
                    className={`items-center rounded-lg border px-3 py-2 ${
                      selectedDate === date.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <Text
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        selectedDate === date.value
                          ? "text-primary"
                          : "text-ink/40"
                      }`}
                    >
                      {date.isToday ? "Today" : date.label.split(" ")[0]}
                    </Text>
                    <Text
                      className={`mt-0.5 text-lg font-bold ${
                        selectedDate === date.value
                          ? "text-primary"
                          : "text-ink"
                      }`}
                    >
                      {date.label.split(" ")[1]?.replace(",", "")}
                    </Text>
                    <Text className="text-[10px] text-ink/40">
                      {date.label.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Time slot */}
            <Card className="p-4">
              <Text className="mb-3 flex-row items-center gap-1.5 text-sm font-bold text-ink/65">
                <Icon icon={Clock} color="#1F5D3F" size={20} /> Preferred Time Slot
              </Text>
              <View className="gap-2">
                {TIME_SLOTS.map((slot) => (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedTimeSlot(slot)}
                    className={`rounded-lg border p-3 ${
                      selectedTimeSlot === slot
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        selectedTimeSlot === slot ? "text-primary" : "text-ink"
                      }`}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Address */}
            <Card className="p-4">
              <Text className="mb-2 flex-row items-center gap-1.5 text-sm font-bold text-ink/65">
                <Icon icon={MapPin} color="#1F5D3F" size={16} /> Detailed Street Address
              </Text>
              <TextInput
                value={detailedAddress}
                onChangeText={setDetailedAddress}
                placeholder="House No, Street Address, Neighborhood Name..."
                placeholderTextColor="rgba(20,35,28,0.3)"
                className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink"
              />
            </Card>

            {/* Notes */}
            <Card className="p-4">
              <Text className="mb-2 flex-row items-center gap-1.5 text-sm font-bold text-ink/65">
                <Icon icon={FileText} color="#1F5D3F" size={16} /> Special Instructions
                (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Detail what needs to be done, specific problems, tools needed..."
                placeholderTextColor="rgba(20,35,28,0.3)"
                multiline
                style={{ minHeight: 80 }}
                className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink"
              />
            </Card>

            {/* Price summary card */}
            <Card className="p-4">
              <Text className="mb-3 border-b border-border pb-2 text-lg font-medium text-ink">
                Booking Summary
              </Text>

              {provider && (
                <View className="mb-4 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-3">
                  <Avatar
                    src={provider.photoURL}
                    name={provider.name}
                    className="h-12 w-12 border-2 border-surface"
                  />
                  <View className="flex-1">
                    <Text className="font-bold text-ink">{provider.name}</Text>
                    <Text className="text-xs text-ink/70">
                      {provider.category} • {provider.city}
                    </Text>
                    <Text className="text-[10px] font-bold text-accent-gold">
                      ★{" "}
                      {provider.rating != null
                        ? provider.rating.toFixed(1)
                        : "New"}{" "}
                      ({provider.tier})
                    </Text>
                  </View>
                </View>
              )}

              <View className="gap-2 text-sm">
                <View className="flex-row justify-between">
                  <Text className="text-ink/75">Base Service Rate</Text>
                  <Text className="font-semibold text-ink">
                    Rs. {provider?.basePrice} / hr
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-ink/75">
                    Travel Fee ({distance.toFixed(1)} km)
                  </Text>
                  <Text className="font-semibold text-ink">Rs. {travelFee}</Text>
                </View>

                <View className="flex-row items-center gap-2 rounded bg-accent-sky/10 p-2">
                  <Icon icon={Truck} color="#2C6E8F" size={16} />
                  <Text className="text-[11px] font-medium text-accent-sky">
                    Travel time estimate: ~{estimateTravelTimeMinutes(distance)} mins
                    away
                  </Text>
                </View>

                <View className="mt-1 border-t border-dashed border-border pt-2">
                  <View className="flex-row justify-between text-base font-bold text-ink">
                    <Text>Estimated Total</Text>
                    <Text className="text-primary">Rs. {totalPrice}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 items-center rounded-xl bg-primary/5 p-3">
                <Text className="text-xs font-bold uppercase tracking-wider text-primary">
                  Cash on Delivery
                </Text>
                <Text className="mt-1 text-center text-[11px] text-ink/75">
                  No advanced payments required. Pay the worker in cash once the
                  service is successfully completed.
                </Text>
              </View>
            </Card>

            {/* Confirm button */}
            <Pressable
              onPress={handleConfirm}
              disabled={bookingInProgress}
              className="mb-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 disabled:opacity-75"
            >
              {bookingInProgress ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-base font-bold text-white">
                    Booking Worker...
                  </Text>
                </>
              ) : (
                <>
                  <Icon icon={CheckCircle} color="#fff" size={20} />
                  <Text className="text-base font-bold text-white">
                    Confirm Booking &amp; Message Worker
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Success overlay modal */}
      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-surface/90 p-6">
          {/* Gold flash */}
          <View className="absolute h-64 w-64 rounded-full bg-accent-gold opacity-20" />

          <View className="items-center">
            {/* Verified stamp */}
            <View className="mb-6 h-40 w-40 items-center justify-center rounded-full border-4 border-dashed border-accent-gold bg-surface-raised shadow-soft">
              <View className="h-32 w-32 items-center justify-center rounded-full border-2 border-accent-gold">
                <Text className="font-display text-[9px] uppercase tracking-widest text-accent-gold">
                  Verified
                </Text>
                <View className="my-1 h-px w-16 bg-accent-gold" />
                <Text className="font-display text-xl font-black tracking-tight text-accent-gold">
                  KHIDMAT
                </Text>
                <View className="my-1 h-px w-16 bg-accent-gold" />
                <Text className="font-sans text-[8px] font-bold tracking-wider text-accent-gold">
                  APPROVED
                </Text>
              </View>
            </View>

            <Text className="text-2xl font-semibold text-ink">
              Booking Confirmed!
            </Text>
            <Text className="mt-2 text-center text-sm text-ink/75">
              Redirecting you to chat with {provider?.name}...
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
