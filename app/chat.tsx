import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, Send, MessageSquare, Clock, MapPin, Phone, Info, Shield, Navigation,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import {
  getDocument,
  sendChatMessage,
  listenToChatMessages,
} from '@/src/services/firebase/firebase';
import { Card } from "../src/components/ui/Card";
import { EmptyState } from "../src/components/ui/EmptyState";
import { Icon } from "../src/components/ui/Icon";

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
  distanceKm: number;
}

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { user, userProfile } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const isWorker = userProfile?.current_mode === "worker";

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    if (!bookingId) {
      setError("No booking context provided for chat.");
      setLoading(false);
      return;
    }
    const fetchBooking = async () => {
      try {
        const data = await getDocument("bookings", bookingId);
        if (data) setBooking(data as Booking);
        else setError("Booking details not found.");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const unsubscribe = listenToChatMessages(bookingId, (newMessages) => {
      setMessages(newMessages);
    });
    return () => unsubscribe();
  }, [bookingId]);

  // Poll booking status updates (fire-and-forget like web interval)
  useEffect(() => {
    if (!bookingId) return;
    const interval = setInterval(async () => {
      try {
        const data = await getDocument("bookings", bookingId);
        if (data) {
          const fresh = data as Booking;
          setBooking((prev) =>
            prev?.status !== fresh.status ? fresh : prev
          );
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user || !bookingId) return;
    const textToSend = inputText;
    setInputText("");
    try {
      const senderName = userProfile?.name || user.email?.split("@")[0] || "User";
      await sendChatMessage(bookingId, user.uid, senderName, textToSend);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-4 text-sm text-ink/60">Loading chat...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Card className="w-full max-w-md p-4">
          <EmptyState
            icon={MessageSquare}
            title="Chat Context Missing"
            description={error || "No booking context was found for this discussion thread."}
            actionLabel="Back to Bookings"
            onAction={() => router.push("/bookings")}
          />
        </Card>
      </View>
    );
  }

  const chatPartnerName = isWorker ? booking.customerName : booking.providerName;
  const chatPartnerRole = isWorker ? "Client" : booking.providerCategory;
  const chatPartnerInitials = chatPartnerName
    ? chatPartnerName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isChatLocked = ["completed", "closed", "cancelled"].includes(booking.status);

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

  const statusBadge = getStatusBadge(booking.status);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-[#F8F8F4]"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-white px-3 py-3">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push("/inbox")}
            className="h-9 w-9 items-center justify-center"
          >
            <Icon icon={ArrowLeft} color="#14231C" size={20} />
          </Pressable>
          <View className="h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/15">
            <Text className="text-xs font-bold text-primary">
              {chatPartnerInitials}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold capitalize leading-tight text-ink">
              {chatPartnerName}
            </Text>
            <Text className="text-[10px] text-ink/50">
              {chatPartnerRole} • {booking.address.split(",")[0]}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <View
            className="rounded-full border px-2.5 py-1"
            style={{
              backgroundColor: `${statusBadge.color}0f`,
              borderColor: `${statusBadge.color}33`,
            }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: statusBadge.color }}
            >
              {statusBadge.label}
            </Text>
          </View>
          {(booking.status === "confirmed" || booking.status === "in_progress") && (
            <Pressable
              onPress={() => router.push(`/track/${booking.bookingId}`)}
              className="flex-row items-center gap-1 rounded-xl bg-primary px-3 py-1.5"
            >
              <Icon icon={Navigation} color="#fff" size={14} />
            </Pressable>
          )}
          {booking.customerPhone && isWorker && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)}
              className="h-9 w-9 items-center justify-center"
            >
              <Icon icon={Phone} color="#1F5D3F" size={16} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Service details banner */}
        <View className="mb-4 self-center rounded-2xl border border-border bg-white p-3">
          <View className="mb-1 flex-row items-center justify-center gap-1.5">
            <Icon icon={Shield} color="#1F5D3F" size={12} />
            <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
              Service Details
            </Text>
          </View>
          <Text className="text-center text-xs font-bold text-ink">
            {booking.providerCategory} • Rs. {booking.totalPrice}
          </Text>
          <Text className="mt-0.5 text-center text-[10px] text-ink/50">
            {booking.date} • {booking.timeSlot}
          </Text>
          <Text className="mt-1 flex-row items-center justify-center gap-1 text-[10px] text-ink/50">
            <Icon icon={MapPin} color="#1F5D3F" size={12} /> {booking.address}
          </Text>
        </View>

        {messages.map((msg, index) => {
          let isSystemMessage = false;
          let displayMsgText = msg.text;
          try {
            if (msg.text.startsWith("{") && msg.text.endsWith("}")) {
              const parsed = JSON.parse(msg.text);
              if (parsed.isSystemEvent) {
                isSystemMessage = true;
                displayMsgText = parsed.text;
              }
            }
          } catch (e) {}

          if (isSystemMessage) {
            return (
              <View key={msg.id || index} className="my-3 flex-row justify-center">
                <View className="flex-row items-center gap-1.5 rounded-full border border-sky-500/15 bg-sky-500/10 px-4 py-1.5">
                  <Icon icon={Info} color="#0369A1" size={12} />
                  <Text className="text-[10px] font-semibold text-sky-700">
                    {displayMsgText}
                  </Text>
                </View>
              </View>
            );
          }

          const isMe = msg.senderId === user?.uid;
          const msgTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <View
              key={msg.id || index}
              className={`mb-3 flex-row ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <View className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-lg border border-primary/10 bg-primary/10">
                  <Text className="text-[9px] font-bold text-primary">
                    {chatPartnerInitials}
                  </Text>
                </View>
              )}
              <View
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  isMe
                    ? "rounded-br-md bg-primary"
                    : "rounded-bl-md border border-border bg-white"
                }`}
              >
                {!isMe && (
                  <Text className="mb-0.5 block text-[10px] font-bold capitalize text-primary">
                    {msg.senderName}
                  </Text>
                )}
                <Text
                  className={`text-sm leading-relaxed ${
                    isMe ? "text-white" : "text-ink"
                  }`}
                >
                  {displayMsgText}
                </Text>
                <Text
                  className={`mt-1 block text-right text-[9px] font-medium ${
                    isMe ? "text-white/50" : "text-ink/30"
                  }`}
                >
                  {msgTime}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View className="border-t border-border bg-white px-3 py-3">
        {isChatLocked ? (
          <View className="flex-row items-center justify-center gap-2 py-2">
            <Icon icon={Clock} color="#64748B" size={14} />
            <Text className="text-xs font-medium text-ink/40">
              This conversation is{" "}
              {booking.status === "cancelled" ? "cancelled" : "closed"}. Messaging
              is disabled.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-end gap-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="rgba(20,35,28,0.3)"
              multiline
              className="flex-1 rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-ink"
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-primary disabled:opacity-40"
            >
              <Icon icon={Send} color="#fff" size={18} />
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}