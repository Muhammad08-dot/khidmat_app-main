import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Star, MapPin, Calendar, MessageSquare, CheckCircle, DollarSign,
  Briefcase, Clock,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import {
  queryCollectionDocs,
  writeDocument,
} from '@/src/services/firebase/firebase';
import { getCurrentCoords } from "../../utils/geolocation";
import { Avatar } from "../ui/Avatar";
import { TierBadge } from "../ui/TierBadge";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

export const ProviderHome: React.FC = () => {
  const router = useRouter();
  const { user, userProfile, updateProfile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [toggling, setToggling] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const data = await queryCollectionDocs(
        "bookings",
        "providerId",
        "==",
        user.uid
      );
      setBookings(data);
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!userProfile) return null;

  const isOnline = userProfile.available === true;

  const toggleOnline = async () => {
    if (!user) return;
    setToggling(true);
    setLocationError(null);

    if (!isOnline) {
      const coords = await getCurrentCoords();
      if (!coords) {
        setLocationError(
          "Location access is required to go Online. Please enable location permissions."
        );
        setToggling(false);
        return;
      }
      try {
        await updateProfile({ available: true, location: coords });
      } catch (err) {
        console.error("Failed to update profile to online:", err);
        setLocationError(
          "Failed to update online status. Please check connection."
        );
      }
    } else {
      try {
        await updateProfile({ available: false });
      } catch (err) {
        console.error("Failed to update profile to offline:", err);
      }
    }
    setToggling(false);
  };

  const acceptBooking = async (booking: any) => {
    try {
      const updated = { ...booking, status: "confirmed" };
      await Promise.all([
        writeDocument("bookings", booking.bookingId, updated),
        writeDocument(
          `bookings/${booking.bookingId}/messages`,
          `sys_${Date.now()}`,
          {
            senderId: "system",
            senderName: "System",
            text: "The provider has accepted the request and confirmed the booking.",
            createdAt: new Date().toISOString(),
          }
        ),
      ]);
      fetchBookings();
    } catch (err) {
      console.error("Error accepting booking:", err);
      Alert.alert("Failed", "Failed to accept booking. Please try again.");
    }
  };

  const completeBooking = async (booking: any) => {
    try {
      const updated = { ...booking, status: "completed" };
      await Promise.all([
        writeDocument("bookings", booking.bookingId, updated),
        writeDocument(
          `bookings/${booking.bookingId}/messages`,
          `sys_${Date.now()}`,
          {
            senderId: "system",
            senderName: "System",
            text: "The provider has marked the service as completed. Pending client confirmation/rating review.",
            createdAt: new Date().toISOString(),
          }
        ),
      ]);
      fetchBookings();
    } catch (err) {
      console.error("Error completing booking:", err);
      Alert.alert("Failed", "Failed to update booking status. Please try again.");
    }
  };

  const openChat = (bookingId: string) =>
    router.push(`/chat?bookingId=${bookingId}`);

  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );
  const recentHistory = bookings
    .filter((b) => b.status === "completed" || b.status === "closed")
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* Header + availability */}
        <View className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent-sage/10 p-5">
          <View className="flex-row items-center gap-3">
            <Avatar
              src={userProfile.photoURL}
              name={userProfile.name}
              className="h-14 w-14 border-2 border-surface"
            />
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="font-display text-lg font-extrabold text-ink">
                  Welcome, {userProfile.name}!
                </Text>
                <TierBadge tier={userProfile.tier || "Bronze"} />
              </View>
              <Text className="mt-0.5 text-xs text-ink/60">
                Manage your services, track earnings, and respond to clients.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={toggleOnline}
            disabled={toggling}
            className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl border px-6 py-3.5 ${
              isOnline
                ? "border-primary bg-primary"
                : "border-border bg-surface"
            }`}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={isOnline ? "#fff" : "#1F5D3F"} />
            ) : (
              <View
                className={`h-3.5 w-3.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-white" : "bg-ink/40"
                }`}
              />
            )}
            <Text
              className={`text-sm font-bold ${
                isOnline ? "text-white" : "text-ink/50"
              }`}
            >
              {toggling
                ? "Updating location..."
                : isOnline
                ? "You are ONLINE"
                : "You are OFFLINE"}
            </Text>
          </Pressable>
          <Text className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-ink/40">
            {isOnline
              ? "Visible to customers searching for services"
              : "Hidden from customer search results"}
          </Text>
          {locationError && (
            <Text className="mt-2 rounded-xl border border-accent-terracotta/20 bg-accent-terracotta/10 p-3 text-xs text-accent-terracotta">
              {locationError}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
          {[
            {
              label: "Jobs Completed",
              icon: CheckCircle,
              color: "#1F5D3F" as string,
              value: String(userProfile.totalJobs || 0),
            },
            {
              label: "Total Earnings",
              icon: DollarSign,
              color: "#1F5D3F",
              value: `Rs. ${userProfile.totalEarnings || 0}`,
            },
            {
              label: "Overall Rating",
              icon: Star,
              color: "#B8863B",
              value:
                userProfile.rating != null
                  ? userProfile.rating.toFixed(1)
                  : "New",
            },
            {
              label: "Specialty",
              icon: Briefcase,
              color: "#1F5D3F",
              value: userProfile.category || "Specialist",
            },
          ].map((s) => (
            <View
              key={s.label}
              className="flex-1 rounded-xl border border-border bg-surface-raised p-4"
              style={{ minWidth: "45%" }}
            >
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                {s.label}
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <Icon icon={s.icon} color={s.color} size={20} />
                <Text className="text-lg font-extrabold text-ink">{s.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Active requests */}
        <View className="mt-6">
          <Text className="flex-row items-center gap-2 text-base font-bold text-ink">
            <Icon icon={Calendar} color="#1F5D3F" size={18} /> Active Service
            Requests ({activeBookings.length})
          </Text>

          {activeBookings.length === 0 ? (
            <Card className="mt-3 p-6">
              <Text className="text-center text-sm font-semibold text-ink">
                No Active Requests
              </Text>
              <Text className="mt-1 text-center text-xs text-ink/60">
                {isOnline
                  ? "You are online but haven't received any bookings yet. Service requests will appear here in real-time."
                  : "Go ONLINE above to start receiving service requests from nearby customers."}
              </Text>
            </Card>
          ) : (
            activeBookings.map((b) => (
              <Card key={b.bookingId} className="mt-3 p-4">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      b.status === "pending"
                        ? "bg-accent-terracotta/10 text-accent-terracotta"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {b.status}
                  </Text>
                  <Text className="font-mono text-xs font-bold text-ink/40">
                    #{String(b.bookingId || "").substring(8)}
                  </Text>
                </View>
                <Text className="mt-2 text-base font-bold text-ink">
                  {b.customerName}
                </Text>
                <View className="mt-1 flex-row flex-wrap gap-x-4 gap-y-1">
                  <Text className="flex-row items-center gap-1 text-xs font-medium text-ink/60">
                    <Icon icon={MapPin} color="#1F5D3F" size={13} /> {b.address}
                  </Text>
                  <Text className="flex-row items-center gap-1 text-xs font-medium text-ink/60">
                    <Icon icon={Clock} color="#1F5D3F" size={13} /> {b.timeSlot}{" "}
                    ({b.date})
                  </Text>
                </View>
                <Text className="mt-2 text-xs font-bold text-primary">
                  PKR Invoice: Rs. {b.totalPrice}{" "}
                  <Text className="text-[10px] font-normal text-ink/40">
                    (Rs. {b.basePrice} base + Rs. {b.travelFee} travel)
                  </Text>
                </Text>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => openChat(b.bookingId)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2.5"
                  >
                    <Icon icon={MessageSquare} color="#1F5D3F" size={15} />
                    <Text className="text-xs font-semibold text-ink">
                      Chat Client
                    </Text>
                  </Pressable>
                  {b.status === "pending" && (
                    <Pressable
                      onPress={() => acceptBooking(b)}
                      className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
                    >
                      <Icon icon={CheckCircle} color="#fff" size={15} />
                      <Text className="text-xs font-semibold text-white">
                        Accept Job
                      </Text>
                    </Pressable>
                  )}
                  {b.status === "confirmed" && (
                    <Pressable
                      onPress={() => completeBooking(b)}
                      className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
                    >
                      <Icon icon={CheckCircle} color="#fff" size={15} />
                      <Text className="text-xs font-semibold text-white">
                        Complete Job
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Recent earnings */}
        <View className="mt-6">
          <Text className="flex-row items-center gap-2 text-base font-bold text-ink">
            <Icon icon={DollarSign} color="#1F5D3F" size={18} /> Recent Earnings
            ({recentHistory.length})
          </Text>
          <Card className="mt-3 p-4">
            {recentHistory.length === 0 ? (
              <Text className="py-6 text-center text-xs text-ink/40">
                No completed jobs yet. Keep online and complete assignments to
                earn!
              </Text>
            ) : (
              recentHistory.map((h) => (
                <View
                  key={h.bookingId}
                  className="flex-row items-center justify-between border-b border-border py-3 last:border-b-0"
                >
                  <View>
                    <Text className="text-xs font-bold text-ink">
                      {h.customerName}
                    </Text>
                    <Text className="text-[10px] font-medium text-ink/40">
                      {h.date}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-extrabold text-primary">
                      +Rs. {h.totalPrice}
                    </Text>
                    <Text className="text-[9px] text-ink/40">Completed</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProviderHome;
