import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  MessageSquare, ChevronRight, User, Calendar, MapPin, Briefcase,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import { listenToBookings } from '@/src/services/firebase/firebase';
import { Card } from "../../src/components/ui/Card";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Icon } from "../../src/components/ui/Icon";

interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  date: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "closed"
    | "cancelled";
  address: string;
}

export default function InboxScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const isWorker = userProfile?.current_mode === "worker";

  useEffect(() => {
    if (!user || !userProfile) return;
    setLoading(true);
    const fieldName = isWorker ? "providerId" : "customerId";
    const unsubscribe = listenToBookings(fieldName, user.uid, (data) => {
      setConversations(data as Booking[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userProfile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return { color: "#10B981", label: "Confirmed" };
      case "in_progress":
        return { color: "#F59E0B", label: "In Progress" };
      case "completed":
        return { color: "#3B82F6", label: "Completed" };
      case "closed":
        return { color: "#64748B", label: "Closed" };
      case "cancelled":
        return { color: "#EF4444", label: "Cancelled" };
      case "pending":
      default:
        return { color: "#F97316", label: "Pending" };
    }
  };

  if (loading) {
    return (
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 120,
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-4 text-sm font-medium text-ink/50">
          Loading your messages...
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        <Text className="font-display text-2xl font-medium text-ink">
          Messages
        </Text>
        <Text className="mt-1 text-sm text-ink/60">
          {isWorker
            ? "Chat with your customers about job details"
            : "Chat with your service providers and coordinate visits"}
        </Text>

        {conversations.length === 0 ? (
          <Card className="mt-6 p-4">
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description={
                isWorker
                  ? "No customer has booked your services yet. Go online and wait for a match!"
                  : "Book a home service to start chatting with a professional provider."
              }
              actionLabel={isWorker ? undefined : "Find a Provider"}
              onAction={isWorker ? undefined : () => router.push("/")}
            />
          </Card>
        ) : (
          <View className="mt-5 gap-3">
            {conversations.map((convo) => {
              const chatPartnerName = isWorker
                ? convo.customerName
                : convo.providerName;
              const roleSubtitle = isWorker ? "Client" : convo.providerCategory;
              const badge = getStatusBadge(convo.status);
              const initials = chatPartnerName
                ? chatPartnerName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?";

              return (
                <Pressable
                  key={convo.bookingId}
                  onPress={() => router.push(`/chat?bookingId=${convo.bookingId}`)}
                  className="rounded-2xl border border-border bg-surface-raised p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/15">
                      <Text className="text-sm font-bold text-primary">
                        {initials}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="truncate text-sm font-bold capitalize text-ink">
                          {chatPartnerName}
                        </Text>
                        <View
                          className="rounded-full border px-2 py-0.5"
                          style={{
                            backgroundColor: `${badge.color}0f`,
                            borderColor: `${badge.color}40`,
                          }}
                        >
                          <Text
                            className="text-[9px] font-bold"
                            style={{ color: badge.color }}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-0.5 flex-row items-center gap-1">
                        <Icon
                          icon={isWorker ? User : Briefcase}
                          color="rgba(20,35,28,0.4)"
                          size={12}
                        />
                        <Text className="text-xs font-medium text-ink/50">
                          {roleSubtitle}
                        </Text>
                      </View>

                      <View className="mt-1.5 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                        <Text className="flex-row items-center gap-1 text-[10px] font-medium text-ink/40">
                          <Icon icon={Calendar} color="#6b7280" size={12} />
                          {convo.date}
                        </Text>
                        <Text className="max-w-[180px] flex-row items-center gap-1 truncate text-[10px] font-medium text-ink/40">
                          <Icon icon={MapPin} color="#6b7280" size={12} />
                          {convo.address}
                        </Text>
                      </View>
                    </View>
                    <Icon icon={ChevronRight} color="rgba(20,35,28,0.2)" size={20} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}