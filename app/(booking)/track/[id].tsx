// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";

import { LiveMap } from "@/src/components/features/LiveMap";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { getDistanceKm, estimateTravelTimeMinutes } from "@/src/utils/location";
import { getCurrentCoords } from "@/src/utils/geolocation";

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
  status: "pending" | "confirmed" | "in_progress" | "completed" | "closed" | "cancelled";
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

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTopExpanded, setIsTopExpanded] = useState(false);
  const [isBottomExpanded, setIsBottomExpanded] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const simIntervalRef = useRef<any>(null);
  const previousCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    const unsubscribe = listenToBookings("bookingId", id, (data) => {
      if (data && data.length > 0) {
        const activeBooking = data[0] as Booking;
        if (
          activeBooking.customerId !== user.uid &&
          activeBooking.providerId !== user.uid
        ) {
          setError("Unauthorized: You do not have permission to track this service.");
          setLoading(false);
          return;
        }
        setBooking(activeBooking);
        setError(null);
      } else {
        setError("Booking tracking session not found.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, user]);

  // GPS location sharing — polled via getCurrentCoords (expo-location)
  useEffect(() => {
    if (!booking || !user) return;
    const isActive =
      booking.status === "confirmed" || booking.status === "in_progress";
    if (!isActive) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const coords = await getCurrentCoords();
      if (!coords || cancelled) return;

      const currentLat = coords.lat;
      const currentLng = coords.lng;
      const timestamp = new Date().toISOString();
      let heading = 0;
      if (previousCoordsRef.current) {
        const p1 = previousCoordsRef.current;
        const dy = currentLat - p1.lat;
        const dx = currentLng - p1.lng;
        if (dx !== 0 || dy !== 0)
          heading = Math.atan2(dy, dx) * (180 / Math.PI);
      }
      previousCoordsRef.current = { lat: currentLat, lng: currentLng };

      const isWorker = user.uid === booking.providerId;
      const payload = isWorker
        ? {
            workerLocation: {
              lat: currentLat,
              lng: currentLng,
              heading,
              speed: 0,
              timestamp,
            },
          }
        : { clientLocation: { lat: currentLat, lng: currentLng, timestamp } };

      writeDocument("bookings", booking.bookingId, {
        ...booking,
        ...payload,
      }).catch((err) => console.error("Error updating tracking coords:", err));
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [booking?.status, user]);

  const startSimulation = async () => {
    if (!booking) return;
    setIsSimulating(true);

    const clientPos = booking.coordinates || { lat: 31.5204, lng: 74.3587 };
    let currentLat = clientPos.lat - 0.012;
    let currentLng = clientPos.lng - 0.012;
    const totalSteps = 15;
    let stepNum = 0;

    await writeDocument("bookings", booking.bookingId, {
      ...booking,
      workerLocation: {
        lat: currentLat,
        lng: currentLng,
        heading: 45,
        speed: 9.5,
        timestamp: new Date().toISOString(),
      },
    });

    simIntervalRef.current = setInterval(async () => {
      stepNum++;
      if (stepNum > totalSteps) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setIsSimulating(false);
        return;
      }
      const fraction = stepNum / totalSteps;
      const nextLat = clientPos.lat - 0.012 + 0.012 * fraction;
      const nextLng = clientPos.lng - 0.012 + 0.012 * fraction;
      const dy = nextLat - currentLat;
      const dx = nextLng - currentLng;
      const heading = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      currentLat = nextLat;
      currentLng = nextLng;
      try {
        await writeDocument("bookings", booking.bookingId, {
          ...booking,
          workerLocation: {
            lat: nextLat,
            lng: nextLng,
            heading,
            speed: 9.5,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error("Simulation write error:", err);
      }
    }, 2500);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-4 text-sm text-ink/60">
          Initializing Live Map...
        </Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <View className="mb-6 flex-row items-center gap-2 rounded-xl border border-accent-terracotta/20 bg-accent-terracotta/10 p-4">
          <Icon icon={ShieldAlert} color="#C2410C" size={20} />
          <Text className="flex-1 text-accent-terracotta">
            {error || "Booking not found."}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 rounded-xl bg-primary px-6 py-3"
        >
          <Icon icon={ArrowLeft} color="#fff" size={18} />
          <Text className="font-semibold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isWorker = user?.uid === booking.providerId;
  const clientCoords = booking.coordinates || { lat: 31.5204, lng: 74.3587 };
  const workerCoords = booking.workerLocation || null;

  let distance = booking.distanceKm;
  let etaMinutes = estimateTravelTimeMinutes(distance);
  if (workerCoords) {
    const liveDistance = getDistanceKm(
      workerCoords.lat,
      workerCoords.lng,
      clientCoords.lat,
      clientCoords.lng
    );
    distance = Number(liveDistance.toFixed(2));
    etaMinutes = estimateTravelTimeMinutes(liveDistance);
  }

  const isCompleted =
    booking.status === "completed" || booking.status === "closed";

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
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
              Live Tracking
            </Text>
            <Text className="text-xs text-ink/60">
              {isCompleted
                ? "Service complete. Location sharing has stopped."
                : `Real-time location coordination for ${booking.providerCategory}`}
            </Text>
          </View>
        </View>

        {/* Map card */}
        <View className="overflow-hidden rounded-2xl border border-border">
          <View className="relative bg-surface">
            <LiveMap
              workerCoords={workerCoords}
              clientCoords={clientCoords}
              isCompleted={isCompleted}
              className="h-[50vh] w-full"
            />

            {/* Floating Destination card */}
            <View className="absolute left-3 right-3 top-3">
              <View className="overflow-hidden rounded-2xl bg-[#121E16] p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-row items-start gap-2">
                    <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-accent-terracotta/20">
                      <Icon icon={MapPin} color="#C2410C" size={16} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                        Destination
                      </Text>
                      <Text className="text-sm font-bold text-white">
                        {booking.address}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setIsTopExpanded(!isTopExpanded)}
                    className="p-1"
                  >
                    <Icon
                      icon={isTopExpanded ? ChevronDown : ChevronUp}
                      color="#ffffffbb"
                      size={16}
                    />
                  </Pressable>
                </View>
                {isTopExpanded && (
                  <View className="mt-3 border-t border-white/10 pt-2">
                    <Text className="text-xs text-white/70">
                      <Text className="font-bold">Customer:</Text>{" "}
                      {booking.customerName}
                    </Text>
                    <Text className="mt-1 text-xs text-white/70">
                      <Text className="font-bold">Scheduled Slot:</Text>{" "}
                      {booking.date} • {booking.timeSlot}
                    </Text>
                    <Text className="mt-1 text-xs text-white/70">
                      <Text className="font-bold">Service Type:</Text>{" "}
                      {booking.providerCategory}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Floating ETA card */}
            <View className="absolute bottom-3 left-3 right-3">
              <Card className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Icon icon={Clock} color="#1F5D3F" size={16} />
                    </View>
                    <View>
                      <Text className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                        ETA Estimate
                      </Text>
                      <Text className="text-base font-extrabold text-ink">
                        {isCompleted ? "Arrived" : `${etaMinutes} mins away`}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                      {distance} km
                    </Text>
                    <Pressable
                      onPress={() => setIsBottomExpanded(!isBottomExpanded)}
                      className="p-1"
                    >
                      <Icon
                        icon={isBottomExpanded ? ChevronDown : ChevronUp}
                        color="rgba(20,35,28,0.5)"
                        size={16}
                      />
                    </Pressable>
                  </View>
                </View>
                {isBottomExpanded && (
                  <View className="mt-3 border-t border-border pt-2">
                    <Text className="text-xs text-ink/70">
                      <Text className="font-bold">Assigned Pro:</Text>{" "}
                      {booking.providerName}
                    </Text>
                    <Text className="mt-1 text-xs text-ink/70">
                      <Text className="font-bold">Travel Charge:</Text> Rs.{" "}
                      {booking.totalPrice - booking.basePrice}
                    </Text>
                    <Text className="mt-1 text-[10px] italic text-ink/40">
                      ETA is computed based on relative coordinate spacing
                      assuming baseline driving parameters.
                    </Text>
                  </View>
                )}
              </Card>
            </View>
          </View>
        </View>

        {/* Tracking info sidebar */}
        <Card className="mt-4 p-5">
          <Text className="mb-3 border-b border-border pb-2 font-display text-lg font-medium text-ink">
            Live Location Tracking
          </Text>

          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-ink/75">
                Tracking Status:
              </Text>
              <View
                className={`rounded-full border px-2.5 py-0.5 ${
                  isCompleted
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-primary/20 bg-primary/10"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase ${
                    isCompleted ? "text-emerald-600" : "text-primary"
                  }`}
                >
                  {isCompleted ? "Closed" : "Active Tracking"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-ink/75">
                Worker Coordinates:
              </Text>
              <Text className="font-mono text-[10px] text-ink/70">
                {workerCoords
                  ? `${workerCoords.lat.toFixed(4)}, ${workerCoords.lng.toFixed(4)}`
                  : "Acquiring..."}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-ink/75">
                Your Location:
              </Text>
              <Text className="font-mono text-[10px] text-ink/70">
                {clientCoords
                  ? `${clientCoords.lat.toFixed(4)}, ${clientCoords.lng.toFixed(4)}`
                  : "Searching..."}
              </Text>
            </View>
          </View>

          <View className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
            <Text className="text-xs font-bold text-primary">
              Location Privacy Notice
            </Text>
            <Text className="mt-1 text-xs leading-relaxed text-ink/75">
              Bi-directional coordinate tracking is only enabled while the booking
              is active. Sharing stops immediately upon job completion or
              cancellation.
            </Text>
          </View>

          <View className="mt-4 gap-2.5">
            {!isCompleted && isWorker && (
              <Pressable
                onPress={startSimulation}
                disabled={isSimulating}
                className={`flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                  isSimulating
                    ? "border-amber-500/20 bg-amber-500/10"
                    : "border-primary bg-primary"
                }`}
              >
                <Icon
                  icon={Compass}
                  color={isSimulating ? "#D97706" : "#fff"}
                  size={16}
                />
                <Text
                  className={`text-sm font-bold ${
                    isSimulating ? "text-amber-600" : "text-white"
                  }`}
                >
                  {isSimulating
                    ? "Simulating Movement..."
                    : "Simulate Worker Movement"}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => router.push(`/chat?bookingId=${booking.bookingId}`)}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3"
            >
              <Icon icon={MessageSquare} color="#1F5D3F" size={16} />
              <Text className="text-sm font-bold text-ink">
                Open Booking Chat
              </Text>
            </Pressable>

            {!isWorker && booking.status === "completed" && (
              <Pressable
                onPress={() => router.push("/bookings")}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
              >
                <Icon icon={CheckCircle} color="#fff" size={16} />
                <Text className="text-sm font-bold text-white">
                  Confirm Job Completed
                </Text>
              </Pressable>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}