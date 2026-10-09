import React, { useState, useEffect, useRef } from "react";
import { BRAND } from "@/src/theme/colors";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Info,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  Shield,
} from "lucide-react-native";
import { useAuth } from "@/src/context/AuthContext";
import { getDocument } from "@/src/services/supabase/legacy";
import { sendPushToUser } from "@/src/services/push";
import { supabase, DEMO_MODE } from "@/src/services/supabase/client";
import { useChatMessages, useSendMessage, useMarkMessagesSeen } from '@/src/hooks/useSupabase';
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Icon } from "@/src/components/ui/Icon";

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
  createdAt?: string;
  updatedAt?: string;
}

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
  seenAt?: string | null;
}

const QUICK_REPLIES = [
  "I'm on the way",
  "Aa gaya hoon",
  "Please confirm the time",
  "Thank you!",
];

export default function ChatScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { user, userProfile } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [inputText, setInputText] = useState("");
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const typingChannel = useRef<any>(null);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTypedPing = useRef(0);
  const isWorker = userProfile?.current_mode === "worker";

  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(bookingId as string);
  const { mutateAsync: sendMessageMutation } = useSendMessage();
  const { mutate: markSeen } = useMarkMessagesSeen();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, partnerTyping]);

  // Ephemeral typing indicator over a Realtime broadcast channel (no DB, no
  // storage cost). Skipped on web/demo where broadcast isn't available.
  useEffect(() => {
    if (!bookingId || !user || DEMO_MODE || Platform.OS === "web") return;
    const ch = supabase
      .channel(`typing_${bookingId}`)
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload?.userId && payload.userId !== user.id) {
          setPartnerTyping(true);
          clearTimeout(typingHideTimer.current);
          typingHideTimer.current = setTimeout(() => setPartnerTyping(false), 3500);
        }
      })
      .subscribe();
    typingChannel.current = ch;
    return () => {
      clearTimeout(typingHideTimer.current);
      supabase.removeChannel(ch);
      typingChannel.current = null;
    };
  }, [bookingId, user?.id]);

  const broadcastTyping = () => {
    if (!typingChannel.current || !user) return;
    const now = Date.now();
    if (now - lastTypedPing.current < 1500) return; // throttle
    lastTypedPing.current = now;
    typingChannel.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  };

  useEffect(() => {
    if (!bookingId) {
      setError("No booking context provided.");
      setLoadingBooking(false);
      return;
    }
    const fetchBooking = async () => {
      try {
        const data = await getDocument("bookings", bookingId as string);
        if (data) {
          const next = data as Booking;
          // Only re-render when the booking actually changed. The 3s poll used
          // to hand a fresh object every tick, forcing a full-screen re-render
          // (and a scroll-position reset) even when nothing differed.
          setBooking((prev) =>
            prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBooking(false);
      }
    };
    fetchBooking();
    const interval = setInterval(fetchBooking, 3000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const loading = loadingBooking || loadingMessages;

  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || !user || !bookingId) return;
    setInputText("");
    try {
      await sendMessageMutation({
        bookingId: bookingId as string,
        senderId: user.id,
        content: text,
      });
      // Free, best-effort push to the chat partner so they get pinged even
      // when the app is backgrounded. No photos/storage cost — text only.
      const recipientId = isWorker ? booking?.customerId : booking?.providerId;
      if (recipientId && recipientId !== user.id) {
        const senderName = userProfile?.name?.trim();
        void sendPushToUser(
          recipientId,
          senderName ? `New message from ${senderName}` : "New message",
          text.length > 120 ? `${text.slice(0, 117)}...` : text,
          { type: "new_message", bookingId }
        );
      }
    } catch (err) {
      console.warn("Send fail:", err);
    }
  };

  const handleSendMessage = () => sendText(inputText);

  // Mark the partner's messages seen while this thread is open → drives our
  // own ✓✓ receipts (the recipient's read is what turns them blue-ish/✓✓).
  useEffect(() => {
    if (!bookingId || !user) return;
    const hasUnseenFromPartner = messages.some(
      (m) => !m.isSystem && m.senderId !== user.id && !m.seenAt
    );
    if (hasUnseenFromPartner) markSeen({ bookingId, myUserId: user.id });
  }, [bookingId, user?.id, messages, markSeen]);

  // Cancelled threads are always closed. Completed/closed jobs stay open for a
  // 24-hour grace window (payment/follow-up talk) then lock. Time math runs in
  // an effect (not render) so the component stays pure.
  const GRACE_MS = 24 * 60 * 60 * 1000;
  const [withinGrace, setWithinGrace] = useState(false);
  useEffect(() => {
    if (
      !booking ||
      !["completed", "closed"].includes(booking.status) ||
      !booking.updatedAt
    ) {
      setWithinGrace(false);
      return;
    }
    setWithinGrace(
      Date.now() - new Date(booking.updatedAt).getTime() < GRACE_MS
    );
  }, [booking]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={BRAND.primary} />
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

  // Cancelled → always locked. Completed/closed → locked only after the grace
  // window (computed in the effect above).
  const isCancelled = booking.status === "cancelled";
  const isTerminal = ["completed", "closed"].includes(booking.status);
  const isChatLocked = isCancelled || (isTerminal && !withinGrace);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return { color: BRAND.success, label: "Confirmed" };
      case "in_progress":
        return { color: BRAND.warning, label: "In Progress" };
      case "completed":
        return { color: BRAND.info, label: "Completed" };
      case "closed":
        return { color: BRAND.muted, label: "Closed" };
      case "cancelled":
        return { color: BRAND.danger, label: "Cancelled" };
      case "pending":
      default:
        return { color: BRAND.caution, label: "Pending" };
    }
  };

  const statusBadge = getStatusBadge(booking.status);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-[#F8F8F4]"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-surface-raised px-3 py-3">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push("/inbox")}
            className="h-9 w-9 items-center justify-center"
          >
            <Icon icon={ArrowLeft} color={BRAND.ink} size={20} />
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
              <Icon icon={Phone} color={BRAND.primary} size={16} />
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
        <View className="mb-4 self-center rounded-2xl border border-border bg-surface-raised p-3">
          <View className="mb-1 flex-row items-center justify-center gap-1.5">
            <Icon icon={Shield} color={BRAND.primary} size={12} />
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
            <Icon icon={MapPin} color={BRAND.primary} size={12} /> {booking.address}
          </Text>
        </View>

        {messages.map((msg, index) => {
          let isSystemMessage = msg.isSystem === true;
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
                  <Icon icon={Info} color={BRAND.info} size={12} />
                  <Text className="text-[10px] font-semibold text-sky-700">
                    {displayMsgText}
                  </Text>
                </View>
              </View>
            );
          }

          const isMe = msg.senderId === user?.id;
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
                    : "rounded-bl-md border border-border bg-surface-raised"
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
                <View className="mt-1 flex-row items-center justify-end gap-1">
                  <Text
                    className={`text-[9px] font-medium ${
                      isMe ? "text-white/50" : "text-ink/30"
                    }`}
                  >
                    {msgTime}
                  </Text>
                  {isMe && (
                    <Icon
                      icon={msg.seenAt ? CheckCheck : Check}
                      color={msg.seenAt ? "#BBF7D0" : "rgba(255,255,255,0.5)"}
                      size={12}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View className="border-t border-border bg-surface-raised px-3 py-3">
        {isChatLocked ? (
          <View className="flex-row items-center justify-center gap-2 py-2">
            <Icon icon={Clock} color={BRAND.muted} size={14} />
            <Text className="text-xs font-medium text-ink/40">
              This conversation is{" "}
              {isCancelled ? "cancelled" : "closed"}. Messaging is disabled.
            </Text>
          </View>
        ) : (
          <>
            {/* Typing indicator */}
            {partnerTyping && (
              <Text className="mb-1.5 px-1 text-[11px] italic text-ink/50">
                {chatPartnerName} is typing...
              </Text>
            )}
            {/* Quick replies — one-tap presets, handy for on-the-go workers */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
            >
              {QUICK_REPLIES.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => sendText(q)}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5"
                >
                  <Text className="text-[11px] font-semibold text-primary">{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="flex-row items-end gap-2">
            <TextInput
              value={inputText}
              onChangeText={(v) => {
                setInputText(v);
                if (v.trim()) broadcastTyping();
              }}
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
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}