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
  Calendar, Clock, MapPin, MessageSquare, CheckCircle, XCircle, Star,
  AlertCircle, Sparkles, Info, DollarSign, User, Navigation,
} from "lucide-react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  writeDocument,
  submitProviderReview,
  sendChatMessage,
  listenToBookings,
  createNotification,
} from "../../src/services/firebase";
import { Card } from "../../src/components/ui/Card";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { Icon } from "../../src/components/ui/Icon";

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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  const isWorker = userProfile?.current_mode === "worker";

  useEffect(() => {
    if (!user || !userProfile) return;
    setLoading(true);
    const fieldName = isWorker ? "providerId" : "customerId";
    const unsubscribe = listenToBookings(fieldName, user.uid, (data) => {
      setBookings(data as Booking[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userProfile]);

  const handleUpdateStatus = async (
    booking: Booking,
    newStatus: "confirmed" | "in_progress" | "completed" | "closed" | "cancelled"
  ) => {
    try {
      const updatedBooking = { ...booking, status: newStatus };
      await writeDocument("bookings", booking.bookingId, updatedBooking);

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
        sendChatMessage(
          booking.bookingId,
          "system",
          "System Notification",
          JSON.stringify({
            text: statusTexts[newStatus],
            isSystemEvent: true,
            eventStatus: newStatus,
          })
        )
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
      await sendChatMessage(
        booking.bookingId,
        "system",
        "System Notification",
        JSON.stringify({
          text: `Customer confirmed completion and rated the service ${selectedRating} stars.`,
          isSystemEvent: true,
          eventStatus: "closed",
        })
      );
      await createNotification(
        booking.providerId,
        "job_confirmed",
        `Customer ${booking.customerName} confirmed completion and rated you ${selectedRating} stars.`,
        booking.bookingId
      );
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
        return { color: "#B8863B", label: "Confirmed" };
      case "in_progress":
        return { color: "#1F5D3F", label: "In Progress" };
      case "completed":
        return { color: "#2C6E8F", label: "Completed" };
      case "closed":
        return { color: "#059669", label: "Closed" };
      case "cancelled":
        return { color: "#EF4444", label: "Cancelled" };
      case "pending":
      default:
        return { color: "#C2410C", label: "Pending" };
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
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
                        <Icon icon={Calendar} color="#1F5D3F" size={16} />
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
                        <Icon icon={Clock} color="#1F5D3F" size={14} />
                        {b.date} • {b.timeSlot}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        {clientView ? "Assigned Worker" : "Client Contact"}
                      </Text>
                      <Text className="mt-0.5 flex-row items-center gap-1 text-xs font-semibold capitalize text-ink">
                        <Icon icon={User} color="#1F5D3F" size={14} />
                        {displayName}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        Job Location Address
                      </Text>
                      <Text className="mt-0.5 flex-row items-center gap-1 truncate text-xs font-semibold text-ink">
                        <Icon icon={MapPin} color="#1F5D3F" size={14} />
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
                      <Icon icon={DollarSign} color="#1F5D3F" size={14} />
                      Rs. {b.totalPrice}
                    </Text>
                  </View>

                  {/* Rating for completed client */}
                  {(isCompleted || isClosed) && clientView && (
                    <View className="mt-3 border-t border-border pt-3">
                      {b.customerRating ? (
                        <View className="flex-row items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3">
                          <Text className="flex-row items-center gap-1 text-xs font-bold text-emerald-700">
                            <Icon icon={CheckCircle} color="#059669" size={16} />
                            Service Rated
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-lg border border-amber-500/20 bg-surface px-3 py-1">
                            <Icon icon={Star} color="#F59E0B" size={16} />
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
                                <Icon icon={Sparkles} color="#1F5D3F" size={16} />
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
                                      selectedRating >= n ? "#F59E0B" : "#F59E0B55"
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
                        <Icon icon={XCircle} color="#C2410C" size={13} /> Booking
                        Cancelled
                      </Text>
                    ) : (
                      <Text className="flex-row items-center gap-1 text-[10px] font-bold text-ink/50">
                        <Icon icon={Info} color="#1F5D3F" size={13} /> Contact
                        details will unlock in Chat
                      </Text>
                    )}

                    <View className="flex-row flex-wrap gap-2">
                      {b.status !== "cancelled" && (
                        <Pressable
                          onPress={() => router.push(`/chat?bookingId=${b.bookingId}`)}
                          className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5"
                        >
                          <Icon icon={MessageSquare} color="#1F5D3F" size={16} />
                          <Text className="text-xs font-bold text-ink">
                            Live Chat
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
                          onPress={() => handleUpdateStatus(b, "cancelled")}
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
                            onPress={() => handleUpdateStatus(b, "cancelled")}
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
    </ScrollView>
  );
}