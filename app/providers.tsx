import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  MapPin, Clock, AlertCircle, Sparkles, ArrowLeft, ChevronRight,
  Info, Compass,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import {
  getCollectionDocs,
  sendInvitationEmail,
  createInvitationNotification,
} from '@/src/services/firebase/firebase';
import {
  rankProvidersWithAI,
  estimateJobPriceWithAI,
  type PriceEstimateResult,
} from '@/src/services/api/agentClient';
import { getDistanceKm, estimateTravelTimeMinutes } from "../src/utils/location";
import { Card } from "../src/components/ui/Card";
import { EmptyState } from "../src/components/ui/EmptyState";
import { Avatar } from "../src/components/ui/Avatar";
import { TierBadge } from "../src/components/ui/TierBadge";
import { Icon } from "../src/components/ui/Icon";

interface Provider {
  id?: string;
  userId: string;
  name: string;
  category: string;
  city: string;
  location: { lat: number; lng: number };
  basePrice: number;
  rating: number;
  totalJobs: number;
  tier: string;
  bio: string;
  available?: boolean;
  photoURL?: string;
  email?: string;
}

export default function ProviderListScreen() {
  const router = useRouter();
  const { category: categoryParam, q, urgency: urgencyParam } = useLocalSearchParams<{
    category?: string;
    q?: string;
    urgency?: string;
  }>();
  const { user, userProfile } = useAuth();

  const category = typeof categoryParam === "string" ? categoryParam : "";
  const jobSummary =
    typeof q === "string" && q.trim()
      ? q
      : `Request for ${category} services.`;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [rankedReasons, setRankedReasons] = useState<Record<string, string>>({});
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrossCity, setIsCrossCity] = useState(false);

  const [notifiedWorkers, setNotifiedWorkers] = useState<Record<string, boolean>>({});
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<{
    visible: boolean;
    name: string;
  } | null>(null);

  const handleNotifyWorker = async (p: Provider) => {
    if (!userProfile) return;
    setNotifyingId(p.userId);
    try {
      await sendInvitationEmail(
        p.email || "worker@email.com",
        p.name,
        userProfile.name,
        user?.uid || "",
        userProfile.email || user?.email || "",
        p.category,
        p.city
      );
      await createInvitationNotification(
        p.userId,
        userProfile.name,
        user?.uid || "",
        userProfile.email || user?.email || "",
        p.category,
        p.city
      );
      setNotifiedWorkers((prev) => ({ ...prev, [p.userId]: true }));
      setShowSuccessToast({ visible: true, name: p.name });
      setTimeout(() => setShowSuccessToast(null), 4000);
    } catch (err) {
      console.error("Failed to notify worker:", err);
    } finally {
      setNotifyingId(null);
    }
  };

  useEffect(() => {
    const fetchAndRankProviders = async () => {
      if (!category) {
        setError("Invalid category selection.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const rawProviders = (await getCollectionDocs("providers")) as Provider[];
        const allProviders = rawProviders.filter(
          (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        const eligibleProviders = allProviders.filter((p) => p.userId !== user?.uid);

        const onlineProviders = eligibleProviders.filter((p) => p.available === true);
        const offlineProviders = eligibleProviders.filter((p) => p.available !== true);

        const userCity = userProfile?.city || "Lahore";
        const localOffline = offlineProviders.filter(
          (p) => p.city.toLowerCase() === userCity.toLowerCase()
        );

        if (onlineProviders.length === 0 && localOffline.length === 0) {
          setProviders([]);
          setLoading(false);
          return;
        }

        let matchedOnline = onlineProviders.filter(
          (p) => p.city.toLowerCase() === userCity.toLowerCase()
        );
        if (matchedOnline.length === 0 && onlineProviders.length > 0) {
          matchedOnline = onlineProviders;
          setIsCrossCity(true);
        } else {
          setIsCrossCity(false);
        }

        const userCoords = userProfile?.location || { lat: 31.5204, lng: 74.3587 };
        let minDistance = 2.0;
        const combinedForDistance = matchedOnline.length > 0 ? matchedOnline : localOffline;
        if (combinedForDistance.length > 0) {
          const distances = combinedForDistance.map((p) =>
            getDistanceKm(userCoords.lat, userCoords.lng, p.location.lat, p.location.lng)
          );
          minDistance = Math.min(...distances);
        }

        let rankedOnline: any[] = [];
        let priceResult: any = null;

        if (matchedOnline.length > 0) {
          const [rankedList, priceEstimation] = await Promise.all([
            rankProvidersWithAI(category, userCoords, matchedOnline),
            estimateJobPriceWithAI(category, jobSummary, minDistance),
          ]);
          rankedOnline = rankedList;
          priceResult = priceEstimation;
        } else {
          priceResult = await estimateJobPriceWithAI(category, jobSummary, minDistance);
        }

        const reasonsMap: Record<string, string> = {};
        rankedOnline.forEach((item) => {
          reasonsMap[item.userId] = item.reason;
        });
        localOffline.forEach((p) => {
          reasonsMap[p.userId] = `${p.name} is a local provider in ${p.city} who is currently offline. You can notify them by email/in-app alert to get online!`;
        });

        const rankedOnlineProviders = [...matchedOnline].sort((a, b) => {
          const indexA = rankedOnline.findIndex((item) => item.userId === a.userId);
          const indexB = rankedOnline.findIndex((item) => item.userId === b.userId);
          const scoreA = indexA === -1 ? 999 : indexA;
          const scoreB = indexB === -1 ? 999 : indexB;
          return scoreA - scoreB;
        });

        const finalProviders = [...rankedOnlineProviders, ...localOffline];
        setProviders(finalProviders);
        setRankedReasons(reasonsMap);
        setPriceEstimate(priceResult);
      } catch (err) {
        console.error("Error fetching/matching providers:", err);
        setError("Failed to query match recommendations. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) fetchAndRankProviders();
  }, [category, jobSummary, userProfile]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-4 text-sm font-medium text-ink/60">
          Finding the best matches in {userProfile?.city || "your city"}...
        </Text>
      </View>
    );
  }

  const userCoords = userProfile?.location || { lat: 31.5204, lng: 74.3587 };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* Header */}
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.replace("/")}
            className="h-10 w-10 items-center justify-center rounded-full border border-border"
          >
            <Icon icon={ArrowLeft} color="#14231C" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-lg font-medium text-ink">
              Matched Workers
            </Text>
            <Text className="text-xs text-ink/70">
              Ranked matches for "{category}"
            </Text>
          </View>
        </View>

        {error ? (
          <View className="mx-auto mb-6 max-w-md rounded-2xl border border-red-200 bg-red-100 p-6 text-center">
            <Text className="text-red-700">{error}</Text>
          </View>
        ) : providers.length === 0 ? (
          <Card className="mx-auto w-full max-w-md p-4">
            <EmptyState
              icon={AlertCircle}
              title="No Matching Workers Found"
              description={`We currently don't have any registered providers for "${category}". Check back soon or register a provider account to test!`}
              actionLabel="Go Back Home"
              onAction={() => router.replace("/")}
            />
          </Card>
        ) : (
          <>
            {isCrossCity && (
              <View className="mb-3 flex-row gap-3 rounded-xl border border-accent-terracotta/30 bg-accent-terracotta/10 p-3">
                <Icon icon={Info} color="#C2410C" size={20} />
                <Text className="flex-1 text-sm text-accent-terracotta">
                  <Text className="font-bold">Outside Local Area: </Text>
                  No direct workers found in {userProfile?.city}. Displaying nearby
                  specialists from other cities. Travel charges will apply.
                </Text>
              </View>
            )}

            <View className="gap-3">
              {providers.map((p, index) => {
                const distance = getDistanceKm(
                  userCoords.lat,
                  userCoords.lng,
                  p.location.lat,
                  p.location.lng
                );
                const travelTime = estimateTravelTimeMinutes(distance);
                const matchReason =
                  rankedReasons[p.userId] ||
                  `${p.name} is available in your city and highly experienced in ${p.category}.`;

                const getUrgencyStyles = () => {
                  if (urgencyParam === 'high') return 'border-red-500/60 bg-red-50/5';
                  if (urgencyParam === 'medium') return 'border-amber-500/60 bg-amber-50/5';
                  return 'border-border bg-surface-raised';
                };

                return (
                  <Pressable
                    key={p.userId}
                    onPress={() => router.push(`/provider/${p.userId}`)}
                    className={`gap-3 rounded-2xl border p-4 ${getUrgencyStyles()}`}
                  >
                    {/* Rank badge */}
                    <View
                      className={`absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full font-mono ${
                        index === 0
                          ? "border border-accent-gold/30 bg-accent-gold/15"
                          : "bg-primary/10"
                      }`}
                    >
                      <Text
                        className={`font-mono text-xs font-bold ${
                          index === 0 ? "text-accent-gold" : "text-primary"
                        }`}
                      >
                        #{index + 1}
                      </Text>
                    </View>

                    <View className="flex-row gap-3">
                      <Avatar
                        src={p.photoURL}
                        name={p.name}
                        className="h-16 w-16 rounded-2xl"
                      />
                      <View className="flex-1 pr-6">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-base font-bold text-ink">{p.name}</Text>
                          <TierBadge tier={p.tier} />
                          <View
                            className={`rounded-full border px-2 py-0.5 ${
                              p.available
                                ? "border-emerald-500/20 bg-emerald-500/10"
                                : "border-slate-500/20 bg-slate-500/10"
                            }`}
                          >
                            <View className="flex-row items-center gap-1">
                              <View
                                className={`h-1.5 w-1.5 rounded-full ${
                                  p.available ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              <Text
                                className={`text-[10px] font-bold ${
                                  p.available ? "text-emerald-600" : "text-slate-500"
                                }`}
                              >
                                {p.available ? "Online" : "Offline"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-1">
                          <Text className="flex-row items-center gap-1 text-xs font-medium text-ink/60">
                            <Icon icon={MapPin} color="#1F5D3F" size={14} />
                            {distance} km ({p.city})
                          </Text>
                          <Text className="flex-row items-center gap-1 text-xs font-medium text-ink/60">
                            <Icon icon={Clock} color="#1F5D3F" size={14} />
                            Travel: ~{travelTime} mins
                          </Text>
                          <Text className="flex-row items-center gap-1 font-bold text-primary">
                            Rs. {p.basePrice} / hr
                          </Text>
                        </View>

                        {/* AI reasoning */}
                        <View className="mt-2 flex-row gap-2 rounded-lg border border-primary/10 bg-primary/5 p-2.5">
                          <Icon icon={Sparkles} color="#1F5D3F" size={16} />
                          <Text className="flex-1 text-xs italic leading-relaxed text-ink/75">
                            {matchReason}
                          </Text>
                        </View>

                        {!p.available && (
                          <View className="mt-2.5 w-full flex-row justify-start">
                            <Pressable
                              onPress={() => handleNotifyWorker(p)}
                              disabled={notifyingId === p.userId || notifiedWorkers[p.userId]}
                              className={`flex-row items-center gap-1.5 rounded-xl border px-4 py-2 ${
                                notifiedWorkers[p.userId]
                                  ? "border-emerald-500/20 bg-emerald-500/10"
                                  : "border-primary bg-primary"
                              }`}
                            >
                              {notifyingId === p.userId ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Icon
                                  icon={Sparkles}
                                  color={notifiedWorkers[p.userId] ? "#059669" : "#fff"}
                                  size={14}
                                />
                              )}
                              <Text
                                className={`text-xs font-bold ${
                                  notifiedWorkers[p.userId] ? "text-emerald-600" : "text-white"
                                }`}
                              >
                                {notifiedWorkers[p.userId]
                                  ? "Worker Notified ✓"
                                  : "Notify to get Online"}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* AI Price Estimate */}
            {priceEstimate && (
              <Card className="mt-4 p-4">
                <Text className="mb-3 flex-row items-center gap-1.5 border-b border-border pb-2 text-base font-bold text-ink">
                  <Icon icon={Compass} color="#1F5D3F" size={20} /> AI Price Estimate
                </Text>
                <View className="overflow-hidden rounded-2xl bg-primary p-4 text-center">
                  <Text className="text-center font-mono text-[10px] uppercase tracking-widest text-white/70">
                    PKR Estimated Range
                  </Text>
                  <Text className="text-center text-2xl font-black text-white">
                    Rs. {priceEstimate.minPrice} - {priceEstimate.maxPrice}
                  </Text>
                  <Text className="mt-2 text-center text-[10px] text-white/80">
                    Cash on Delivery • No prepayments
                  </Text>
                </View>
                <View className="mt-3 gap-1.5">
                  <Text className="text-xs font-bold text-ink">
                    How this was calculated:
                  </Text>
                  <Text className="text-xs text-ink/70">
                    {priceEstimate.explanation}
                  </Text>
                </View>
                <View className="mt-3 flex-row gap-2 border-t border-border pt-3">
                  <Icon icon={Info} color="#1F5D3F" size={16} />
                  <Text className="flex-1 text-[10px] leading-relaxed text-ink/50">
                    Final prices can be negotiated directly with your worker in the
                    chat screen after booking.
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}
      </View>

      {/* Success toast */}
      {showSuccessToast && (
        <View className="mx-auto mt-4 w-full max-w-md flex-row items-center gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-xl">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
            <Text className="font-bold text-emerald-500">✓</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-ink">Notification Dispatched!</Text>
            <Text className="text-xs text-ink/75">
              {showSuccessToast.name} was sent an email &amp; in-app alert.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}