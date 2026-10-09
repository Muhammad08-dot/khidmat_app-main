import React, { useEffect, useState } from "react";
import { BRAND } from "@/src/theme/colors";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Calendar,
  Clock,
  User,
  MapPin,
  Star,
  X,
  CheckCircle,
  MessageSquare,
  Navigation,
  DollarSign,
  Sparkles,
  XCircle,
  Info,
} from "lucide-react-native";
import { useAuth } from "@/src/context/AuthContext";
import { createNotification, submitProviderReview, mergeBookingMeta } from "@/src/services/supabase/legacy";
import { recordCodSettlement } from "@/src/services/payments";
import { track, AnalyticsEvents } from "@/src/services/analytics";
import { startProviderTracking, stopProviderTracking } from "@/src/services/backgroundLocation";
import { useBookings, useUpdateBookingStatus, useSendMessage } from "@/src/hooks/useSupabase";

import { Card } from "@/src/components/ui/Card";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Icon } from "@/src/components/ui/Icon";

interface Booking {
  id?: string;
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
  customerRating?: number;
  reviewedAt?: string;
}

type Tab = "all" | "pending" | "confirmed" | "completed";

const TABS: Tab[] = ["all", "pending", "confirmed", "completed"];

export default function BookingsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const role = userProfile?.current_mode === "worker" ? "provider" : "customer";
  const { data: bookingsData, isLoading: loading, refetch, isRefetching } = useBookings(user?.id, role);
  const bookings = (bookingsData as Booking[]) || [];
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  const CANCEL_REASONS = [
    "Emergency / no longer needed",
    "Provider not responding",
    "Found a better option",
    "Wrong service or schedule",
    "Other",
  ];
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const requestCancel = (booking: Booking) => {
    setCancelReason(null);
    setCancelReasonText("");
    setCancellingBooking(booking);
  };

  const confirmCancel = async () => {
    if (!cancellingBooking || cancelling) return;
    if (!cancelReason) return;
    setCancelling(true);
    try {
      const reasonText =
        cancelReason === "Other"
          ? cancelReasonText.trim() || "Other"
          : cancelReason;
      await mergeBookingMeta(cancellingBooking.bookingId, {
        cancellationReason: reasonText,
        cancelledBy: isWorker ? "provider" : "customer",
      });
      await handleUpdateStatus(cancellingBooking, "cancelled");
      track(AnalyticsEvents.BOOKING_CANCELLED, { reason: cancelReason === "Other" ? "other" : "preset" });
      setCancellingBooking(null);
    } finally {
      setCancelling(false);
    }
  };

  const isWorker = userProfile?.current_mode === "worker";
  const { mutateAsync: updateStatus } = useUpdateBookingStatus();
  const { mutateAsync: sendMsg } = useSendMessage();

  // --- Reschedule ------------------------------------------------------
  const RESCHED_SLOTS = [
    "Morning (9am - 12pm)",
    "Afternoon (12pm - 3pm)",
    "Evening (3pm - 6pm)",
    "Night (6pm - 9pm)",
  ];
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [reschedDates, setReschedDates] = useState<string[]>([]);
  const [reschedDate, setReschedDate] = useState<string | null>(null);
  const [reschedSlot, setReschedSlot] = useState<string | null>(null);
  const [reschedSaving, setReschedSaving] = useState(false);

  // Built inside the tap handler (not render) so Date usage stays lint-clean.
  const requestReschedule = (booking: Booking) => {
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(`${dow[d.getDay()]}, ${d.getDate()} ${mon[d.getMonth()]}`);
    }
    setReschedDates(days);
    setReschedDate(days.includes(booking.date) ? booking.date : days[0]);
    setReschedSlot(RESCHED_SLOTS.find((s) => booking.timeSlot?.startsWith(s.split(" ")[0])) ?? booking.timeSlot ?? RESCHED_SLOTS[0]);
    setRescheduleBooking(booking);
  };

  const confirmReschedule = async () => {
    if (!rescheduleBooking || reschedSaving || !reschedDate || !reschedSlot) return;
    setReschedSaving(true);
    try {
      await mergeBookingMeta(rescheduleBooking.bookingId, {
        date: reschedDate,
        timeSlot: reschedSlot,
        rescheduledBy: isWorker ? "provider" : "customer",
        rescheduledAt: new Date().toISOString(),
      });
      const targetId = isWorker
        ? rescheduleBooking.customerId
        : rescheduleBooking.providerId;
      await createNotification(
        targetId,
        "booking_rescheduled",
        `A booking was rescheduled to ${reschedDate}, ${reschedSlot}.`,
        rescheduleBooking.bookingId
      );
      await refetch();
      setRescheduleBooking(null);
    } catch (err) {
      console.warn("Reschedule failed:", err);
    } finally {
      setReschedSaving(false);
    }
  };

  

  const handleUpdateStatus = async (
    booking: Booking,
    newStatus: "confirmed" | "in_progress" | "completed" | "closed" | "cancelled"
  ) => {
    try {
      const updatedBooking = { ...booking, status: newStatus };
      await updateStatus({ bookingId: booking.bookingId, status: newStatus });

      // Live job tracking lifecycle (flag-guarded; no-op when disabled).
      if (newStatus === "in_progress" && isWorker) {
        void startProviderTracking(booking.bookingId);
      } else if (
        newStatus === "completed" ||
        newStatus === "cancelled" ||
        newStatus === "closed"
      ) {
        void stopProviderTracking();
      }

      const statusTexts: Record<string, string> = {
        confirmed:
          "Worker accepted the booking request and has marked it as CONFIRMED.",
        in_progress:
          "Worker has started working on this booking. Status is now IN PROGRESS.",
        completed:
          "Worker completed the task successfully. Booking is marked as COMPLETED.",
        closed: "Booking was marked as CLOSED.",
        cancelled: `Booking was cancelled by the ${
          isWorker ? "worker" : "customer"
        }.`,
      };

      const tasks: Promise<any>[] = [];
      tasks.push(
        sendMsg({ bookingId: booking.bookingId, senderId: user?.id || "", content: JSON.stringify({
            text: statusTexts[newStatus],
            isSystemEvent: true,
            eventStatus: newStatus,
          }) })
      );

      if (newStatus === "confirmed") {
        tasks.push(
          createNotification(
            booking.customerId,
            "job_accepted",
            `Your booking request has been accepted by ${booking.providerName}!`,
            booking.bookingId
          )
        );
      } else if (newStatus === "in_progress") {
        tasks.push(
          createNotification(
            booking.customerId,
            "job_accepted",
            `Worker ${booking.providerName} has started working on your job request.`,
            booking.bookingId
          )
        );
      } else if (newStatus === "completed") {
        tasks.push(
          createNotification(
            booking.customerId,
            "job_completed",
            `Worker ${booking.providerName} has marked your job complete. Please review & confirm completion.`,
            booking.bookingId
          )
        );
      } else if (newStatus === "cancelled") {
        const targetUserId = isWorker
          ? booking.customerId
          : booking.providerId;
        tasks.push(
          createNotification(
            targetUserId,
            "job_confirmed",
            `Your booking request with ${
              isWorker ? booking.customerName : booking.providerName
            } has been cancelled.`,
            booking.bookingId
          )
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleRatingSubmit = async (booking: Booking) => {
    if (selectedRating < 1 || selectedRating > 5) return;
    try {
      setSubmittingRating(true);
      await submitProviderReview(booking.bookingId, booking.providerId, selectedRating);
      await sendMsg({ bookingId: booking.bookingId, senderId: user?.id || "", content: JSON.stringify({
          text: `Customer confirmed completion and rated the service ${selectedRating} stars.`,
          isSystemEvent: true,
          eventStatus: "closed",
        }) });
      await createNotification(
        booking.providerId,
        "job_confirmed",
        `Customer ${booking.customerName} confirmed completion and rated you ${selectedRating} stars.`,
        booking.bookingId
      );
      // COD settlement ledger entry + close the booking; never block the rating.
      try {
        await recordCodSettlement(booking.bookingId, booking.customerId, booking.totalPrice);
        await mergeBookingMeta(booking.bookingId, { paymentMethod: "cod" });
        await updateStatus({ bookingId: booking.bookingId, status: "closed" });
      } catch (payErr) {
        console.warn("COD settlement ledger entry failed:", payErr);
      }
      track(AnalyticsEvents.BOOKING_CLOSED, { category: booking.providerCategory });
      refetch();
      setRatingBookingId(null);
      setSelectedRating(5);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const isCompletedTab = (s: string) =>
    s === "completed" || s === "closed" || s === "in_progress";

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return isCompletedTab(b.status);
    return b.status === activeTab;
  });

  const getTabCount = (tab: Tab) => {
    if (tab === "all") return bookings.length;
    if (tab === "completed")
      return bookings.filter((b) => isCompletedTab(b.status)).length;
    return bookings.filter((b) => b.status === tab).length;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return { color: BRAND.gold, label: "Confirmed" };
      case "in_progress":
        return { color: BRAND.primary, label: "In Progress" };
      case "completed":
        return { color: BRAND.info, label: "Completed" };
      case "closed":
        return { color: BRAND.success, label: "Closed" };
      case "cancelled":
        return { color: BRAND.danger, label: "Cancelled" };
      case "pending":
      default:
        return { color: BRAND.caution, label: "Pending" };
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={!!isRefetching} onRefresh={() => void refetch()} tintColor={BRAND.primary} colors={[BRAND.primary]} />
      }
    >
      <View className="px-4">
        <Text className="font-display text-2xl font-medium text-ink">
          My Bookings
        </Text>
        <Text className="mt-1 text-sm text-ink/70">
          {isWorker
            ? "Manage jobs assigned to you by customers"
            : "Track your requested home service calls"}
        </Text>

        {/* Tabs */}
        <View className="mb-4 mt-4 flex-row gap-3 border-b border-border">
          {TABS.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} className="pb-3">
              <View className="flex-row items-center gap-1.5">
                <Text
                  className={`text-sm ${
                    activeTab === tab
                      ? "font-bold text-primary"
                      : "text-ink/60"
                  }`}
                >
                  {tab === "all" ? "All Bookings" : tab}
                </Text>
                <View className="rounded-full bg-ink/5 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-ink/50">
                    {getTabCount(tab)}
                  </Text>
                </View>
              </View>
              {activeTab === tab && (
                <View className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-primary" />
              )}
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View className="gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-36 justify-between p-4">
                <View className="w-full flex-row items-center justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </View>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-1 h-8 w-1/4" />
              </Card>
            ))}
          </View>
        ) : filteredBookings.length === 0 ? (
          <View className="items-center py-16">
            <Icon icon={AlertCircle} color="rgba(20,35,28,0.4)" size={48} />
            <Text className="mt-4 text-lg font-bold text-ink">
              No Bookings Found
            </Text>
            <Text className="mt-2 text-center text-sm text-ink/70">
              {activeTab === "all"
                ? "You don't have any bookings logged in this category yet."
                : `No bookings match your current "${activeTab}" filter.`}
            </Text>
            {!isWorker && activeTab === "all" && (
              <Pressable
                onPress={() => router.push("/")}
                className="mt-6 rounded-xl bg-primary px-6 py-3"
              >
                <Text className="font-semibold text-white">
                  Request Service Now
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="gap-4">
            {filteredBookings.map((b) => {
              const isCompleted = b.status === "completed";
              const isClosed = b.status === "closed";
              const isPending = b.status === "pending";
              const isConfirmed = b.status === "confirmed";
              const isInProgress = b.status === "in_progress";
              const clientView = !isWorker;
              const displayTitle = clientView
                ? b.providerCategory
                : "Incoming Job Request";
              const displayName = clientView ? b.providerName : b.customerName;
              const status = getStatusStyle(b.status);

              return (
                <Card key={b.bookingId} className="overflow-hidden p-4">
                  {/* Header */}
                  <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <View className="flex-row items-center gap-2">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Icon icon={Calendar} color={BRAND.primary} size={16} />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-ink">
                          {displayTitle}
                        </Text>
                        <Text className="mt-0.5 text-[10px] text-ink/50">
                          Booking ID:{" "}
                          <Text className="font-mono">
                            {b.bookingId.substring(0, 8)}
                          </Text>
                        </Text>
                      </View>
                    </View>
                    <View
                      className="rounded-full border px-3 py-1"
                      style={{
                        backgroundColor: `${status.color}0d`,
                        borderColor: `${status.color}40`,
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: status.color }}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View className="gap-3">
                    <View>
                      <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        Schedule Time
                      </Text>
                      <Text className="mt-0.5 flex-row items-center gap-1 text-xs font-semibold text-ink">
                        <Icon icon={Clock} color={BRAND.primary} size={14} />
                        {b.date} • {b.timeSlot}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        {clientView ? "Assigned Worker" : "Client Contact"}
                      </Text>
                      <Text className="mt-0.5 flex-row items-center gap-1 text-xs font-semibold capitalize text-ink">
                        <Icon icon={User} color={BRAND.primary} size={14} />
                        {displayName}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        Job Location Address
                      </Text>
                      <Text className="mt-0.5 flex-row items-center gap-1 truncate text-xs font-semibold text-ink">
                        <Icon icon={MapPin} color={BRAND.primary} size={14} />
                        {b.address}
                      </Text>
                    </View>
                  </View>

                  {/* Price */}
                  <View className="mt-3 flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
                    <Text className="text-xs font-bold text-ink/60">
                      Total Price Estimate
                    </Text>
                    <Text className="flex-row items-center gap-0.5 text-xs font-bold text-primary">
                      <Icon icon={DollarSign} color={BRAND.primary} size={14} />
                      Rs. {b.totalPrice}
                    </Text>
                  </View>

                  {/* Rating for completed client */}
                  {(isCompleted || isClosed) && clientView && (
                    <View className="mt-3 border-t border-border pt-3">
                      {b.customerRating ? (
                        <View className="flex-row items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3">
                          <Text className="flex-row items-center gap-1 text-xs font-bold text-emerald-700">
                            <Icon icon={CheckCircle} color={BRAND.success} size={16} />
                            Service Rated
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-lg border border-amber-500/20 bg-surface px-3 py-1">
                            <Icon icon={Star} color={BRAND.warning} size={16} />
                            <Text className="text-sm font-bold text-amber-500">
                              {b.customerRating.toFixed(1)} / 5.0
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View className="rounded-xl border border-accent-gold/20 bg-accent-gold/5 p-3">
                          <View className="flex-row items-start justify-between gap-2">
                            <View className="flex-1">
                              <Text className="flex-row items-center gap-1 text-xs font-bold text-ink">
                                <Icon icon={Sparkles} color={BRAND.primary} size={16} />
                                Rate {b.providerName}'s Work
                              </Text>
                              <Text className="mt-0.5 text-[10px] text-ink/50">
                                Your rating recalculates their tier and helps
                                maintain high quality standards!
                              </Text>
                            </View>
                            <View className="flex-row gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Pressable
                                  key={n}
                                  onPress={() => {
                                    setRatingBookingId(b.bookingId);
                                    setSelectedRating(n);
                                  }}
                                >
                                  <Icon
                                    icon={Star}
                                    color={
                                      selectedRating >= n ? BRAND.warning : BRAND.warning + "55"
                                    }
                                    size={22}
                                  />
                                </Pressable>
                              ))}
                            </View>
                          </View>
                          {ratingBookingId === b.bookingId && (
                            <View className="mt-2 flex-row justify-end">
                              <Pressable
                                onPress={() => handleRatingSubmit(b)}
                                disabled={submittingRating}
                                className="rounded-lg bg-primary px-4 py-2"
                              >
                                <Text className="text-[11px] font-bold text-white">
                                  {submittingRating
                                    ? "Submitting..."
                                    : "Submit Review Score"}
                                </Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                    {b.status === "cancelled" ? (
                      <Text className="flex-row items-center gap-1 text-[10px] font-bold text-accent-terracotta">
                        <Icon icon={XCircle} color={BRAND.caution} size={13} /> Booking
                        Cancelled
                      </Text>
                    ) : (
                      <Text className="flex-row items-center gap-1 text-[10px] font-bold text-ink/50">
                        <Icon icon={Info} color={BRAND.primary} size={13} /> Contact
                        details will unlock in Chat
                      </Text>
                    )}

                    <View className="flex-row flex-wrap gap-2">
                      {b.status !== "cancelled" && (
                        <Pressable
                          onPress={() => router.push(`/chat?bookingId=${b.bookingId}`)}
                          className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5"
                        >
                          <Icon icon={MessageSquare} color={BRAND.primary} size={16} />
                          <Text className="text-xs font-bold text-ink">
                            Live Chat
                          </Text>
                        </Pressable>
                      )}

                      {(b.status === "pending" || b.status === "confirmed") && (
                        <Pressable
                          onPress={() => requestReschedule(b)}
                          className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5"
                        >
                          <Icon icon={Calendar} color={BRAND.primary} size={16} />
                          <Text className="text-xs font-bold text-ink">
                            Reschedule
                          </Text>
                        </Pressable>
                      )}

                      {b.status !== "cancelled" &&
                        (isConfirmed || isInProgress) && (
                          <Pressable
                            onPress={() => router.push(`/track/${b.bookingId}`)}
                            className="flex-row items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5"
                          >
                            <Icon icon={Navigation} color="#fff" size={16} />
                            <Text className="text-xs font-bold text-white">
                              Track Map
                            </Text>
                          </Pressable>
                        )}

                      {clientView && isPending && (
                        <Pressable
                          onPress={() => requestCancel(b)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5"
                        >
                          <Text className="text-xs font-bold text-red-600">
                            Cancel Booking
                          </Text>
                        </Pressable>
                      )}

                      {!clientView && isPending && (
                        <>
                          <Pressable
                            onPress={() => requestCancel(b)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5"
                          >
                            <Text className="text-xs font-bold text-red-600">
                              Cancel Job
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleUpdateStatus(b, "confirmed")}
                            className="rounded-lg bg-emerald-500 px-4 py-2.5"
                          >
                            <Text className="text-xs font-bold text-white">
                              Accept &amp; Confirm Job
                            </Text>
                          </Pressable>
                        </>
                      )}

                      {!clientView && isConfirmed && (
                        <Pressable
                          onPress={() => handleUpdateStatus(b, "in_progress")}
                          className="rounded-lg bg-amber-500 px-4 py-2.5"
                        >
                          <Text className="text-xs font-bold text-white">
                            Start Work
                          </Text>
                        </Pressable>
                      )}

                      {!clientView && isInProgress && (
                        <Pressable
                          onPress={() => handleUpdateStatus(b, "completed")}
                          className="rounded-lg bg-blue-500 px-4 py-2.5"
                        >
                          <Text className="text-xs font-bold text-white">
                            Mark Completed &amp; Paid
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {/* Cancellation reason modal */}
      <Modal
        visible={!!cancellingBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellingBooking(null)}
      >
        <Pressable className="flex-1 bg-black/50" onPress={() => setCancellingBooking(null)}>
          <View className="flex-1 justify-end">
            <Pressable
              className="bg-surface-raised rounded-t-3xl p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-lg font-bold text-ink">
                {isWorker ? "Cancel this job?" : "Cancel this booking?"}
              </Text>
              <Text className="text-sm text-ink/60 mt-1">
                Tell us why so the other side understands and we can improve matching.
              </Text>

              <View className="mt-4 gap-2">
                {CANCEL_REASONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setCancelReason(r)}
                    className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                      cancelReason === r ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <View
                      className={`h-4 w-4 rounded-full border-2 ${
                        cancelReason === r ? "border-primary bg-primary" : "border-gray-300"
                      }`}
                    />
                    <Text className="text-sm font-semibold text-ink flex-1">{r}</Text>
                  </Pressable>
                ))}
              </View>

              {cancelReason === "Other" && (
                <TextInput
                  value={cancelReasonText}
                  onChangeText={setCancelReasonText}
                  placeholder="Brief reason (optional)"
                  className="mt-3 rounded-xl border border-gray-300 px-4 py-3 text-sm text-ink"
                  multiline
                />
              )}

              <View className="flex-row gap-3 mt-6">
                <Pressable
                  onPress={() => setCancellingBooking(null)}
                  className="flex-1 rounded-xl border border-gray-300 py-3.5 items-center"
                >
                  <Text className="text-sm font-bold text-ink">Keep Booking</Text>
                </Pressable>
                <Pressable
                  onPress={confirmCancel}
                  disabled={!cancelReason || cancelling}
                  className="flex-1 rounded-xl bg-red-500 py-3.5 items-center"
                >
                  {cancelling ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Confirm Cancel</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Reschedule modal */}
      <Modal
        visible={!!rescheduleBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleBooking(null)}
      >
        <Pressable className="flex-1 bg-black/50" onPress={() => setRescheduleBooking(null)}>
          <View className="flex-1 justify-end">
            <Pressable
              className="bg-surface-raised rounded-t-3xl p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-lg font-bold text-ink">Reschedule booking</Text>
              <Text className="text-sm text-ink/60 mt-1">
                Pick a new date and time. The other side gets a notification.
              </Text>

              <Text className="mt-4 mb-2 text-xs font-bold uppercase text-ink/50">Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {reschedDates.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setReschedDate(d)}
                    className={`rounded-xl border px-3.5 py-2.5 ${
                      reschedDate === d ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${reschedDate === d ? "text-primary" : "text-ink/70"}`}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="mt-4 mb-2 text-xs font-bold uppercase text-ink/50">Time slot</Text>
              <View className="gap-2">
                {RESCHED_SLOTS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setReschedSlot(s)}
                    className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                      reschedSlot === s ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <View
                      className={`h-4 w-4 rounded-full border-2 ${
                        reschedSlot === s ? "border-primary bg-primary" : "border-gray-300"
                      }`}
                    />
                    <Text className="text-sm font-semibold text-ink flex-1">{s}</Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row gap-3 mt-6">
                <Pressable
                  onPress={() => setRescheduleBooking(null)}
                  className="flex-1 rounded-xl border border-gray-300 py-3.5 items-center"
                >
                  <Text className="text-sm font-bold text-ink">Keep As Is</Text>
                </Pressable>
                <Pressable
                  onPress={confirmReschedule}
                  disabled={!reschedDate || !reschedSlot || reschedSaving}
                  className="flex-1 rounded-xl bg-primary py-3.5 items-center"
                >
                  {reschedSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Confirm New Time</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}