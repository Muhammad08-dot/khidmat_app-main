import React, { useEffect } from "react";
import { BRAND } from "@/src/theme/colors";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Bell, BellOff, CalendarCheck, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useNotifications, useMarkNotificationsRead } from "@/src/hooks/useSupabase";
import { Icon } from "@/src/components/ui/Icon";
import { EmptyState } from "@/src/components/ui/EmptyState";

/** Relative "x min ago" stamp; notifications are informational, minute precision is enough. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** DB schema only carries `message`; titles are derived from the event type. */
const TYPE_TITLES: Record<string, string> = {
  job_accepted: "Booking accepted",
  job_completed: "Job completed",
  job_confirmed: "Booking update",
  booking_rescheduled: "Booking rescheduled",
  invitation: "New service request",
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications(user?.id);
  const markRead = useMarkNotificationsRead(user?.id);

  const unreadCount = (notifications ?? []).filter((n: any) => !n.read).length;

  // Opening the tab is the read-signal; fire once per visit when something is unread.
  useEffect(() => {
    if (unreadCount > 0) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount === 0, !!notifications]);

  const handlePress = (n: any) => {
    if (n.booking_id) {
      router.push(`/track/${n.booking_id}` as any);
    } else if (n.type === "invitation") {
      router.push("/(tabs)/bookings" as any);
    }
  };

  const iconFor = (type: string) => {
    if (type === "booking") return CalendarCheck;
    if (type === "safety" || type === "kyc") return ShieldCheck;
    return Bell;
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-5 pt-14 pb-3">
        <Text className="text-2xl font-bold text-on-surface">Notifications</Text>
        <Text className="text-sm text-on-surface-variant mt-1">
          Booking updates and account alerts
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={BRAND.primary} />
        }
      >
        {isLoading ? (
          <View className="mt-10 items-center">
            <Text className="text-on-surface-variant">Loading…</Text>
          </View>
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            description="Booking status changes and important updates will show up here."
          />
        ) : (
          notifications.map((n: any) => (
            <Pressable
              key={n.id}
              onPress={() => handlePress(n)}
              className={`flex-row items-start gap-3 rounded-2xl border p-4 mb-3 ${
                n.read ? "bg-surface-container-low border-outline-variant" : "bg-secondary-container/30 border-secondary"
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
                <Icon icon={iconFor(n.type)} color={BRAND.primary} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-on-surface">
                  {TYPE_TITLES[n.type] ?? "Notification"}
                </Text>
                <Text className="text-sm text-on-surface-variant mt-0.5">{n.message}</Text>
                <Text className="text-xs text-on-surface-variant/70 mt-1.5">{timeAgo(n.created_at)}</Text>
              </View>
              {!n.read && <View className="mt-1 h-2.5 w-2.5 rounded-full bg-secondary" />}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
