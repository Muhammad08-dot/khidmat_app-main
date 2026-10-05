import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, Star, MapPin, Briefcase, Calendar, ShieldCheck, Check,
  Compass, UserCheck, Info, Sparkles,
} from "lucide-react-native";
import { getDocument, sendInvitationEmail, createInvitationNotification } from '@/src/services/firebase/firebase';
import { useAuth } from '@/src/context/AuthContext';
import { TierBadge } from "../../src/components/ui/TierBadge";
import { Avatar } from "../../src/components/ui/Avatar";
import { Card } from "../../src/components/ui/Card";
import { Icon } from "../../src/components/ui/Icon";

interface Provider {
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
  available: boolean;
  phone?: string;
  email?: string;
  photoURL?: string;
}

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userProfile } = useAuth();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleNotifyWorker = async () => {
    if (!provider || !userProfile) return;
    setNotifying(true);
    try {
      await sendInvitationEmail(
        provider.email || "worker@email.com",
        provider.name,
        userProfile.name,
        user?.uid || "",
        userProfile.email || "",
        provider.category,
        provider.city
      );
      await createInvitationNotification(
        provider.userId,
        userProfile.name,
        user?.uid || "",
        userProfile.email || "",
        provider.category,
        provider.city
      );
      setNotified(true);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err) {
      console.error("Failed to notify worker:", err);
    } finally {
      setNotifying(false);
    }
  };

  useEffect(() => {
    const fetchProviderDetail = async () => {
      if (!id) {
        setError("Invalid profile link.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getDocument("providers", id);
        if (data) {
          setProvider(data as Provider);
        } else {
          setError("Provider profile could not be found in the database.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch provider detail.");
      } finally {
        setLoading(false);
      }
    };
    fetchProviderDetail();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#1F5D3F" />
        <Text className="mt-3 text-sm text-ink/60">Loading profile detail...</Text>
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <View className="mb-6 rounded-xl border border-red-200 bg-red-100 p-6 text-center">
          <Text className="text-red-600">{error || "Profile not found."}</Text>
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

  const verificationChecks = [
    "Government CNIC Verified",
    "Technical Background Verified",
    "Practical skill assessment passed",
    "Clean police background check",
    "Standard toolkits compliance",
    "Service quality contract signed",
  ];

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* Header */}
        <View className="mb-5 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-border"
          >
            <Icon icon={ArrowLeft} color="#14231C" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-lg font-medium text-ink">
              Worker Profile
            </Text>
            <Text className="text-xs text-ink/60">
              Professional credentials &amp; reviews
            </Text>
          </View>
        </View>

        {/* Profile card */}
        <Card className="mb-4 overflow-hidden p-4">
          <View className="items-center py-3">
            {/* Avatar */}
            <View className="mb-4">
              <Avatar
                src={provider.photoURL}
                name={provider.name}
                className="h-24 w-24 shadow-md"
              />
              {provider.available && (
                <View className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </View>

            <Text className="text-xl font-extrabold text-ink">
              {provider.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Icon icon={Briefcase} color="#1F5D3F" size={16} />
              <Text className="text-sm font-semibold text-primary">
                {provider.category}
              </Text>
            </View>

            <View className="mt-3">
              <TierBadge tier={provider.tier} />
            </View>

            {/* Stats */}
            <View className="my-4 w-full flex-row justify-around border-t border-b border-border py-4">
              <View className="items-center">
                <View className="flex-row items-center gap-1">
                  <Icon icon={Star} color="#B8863B" size={16} />
                  <Text className="text-base font-bold text-accent-gold">
                    {provider.rating != null ? provider.rating.toFixed(1) : "New"}
                  </Text>
                </View>
                <Text className="mt-0.5 text-[10px] text-ink/40">
                  Overall Rating
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-base font-bold text-ink">
                  {provider.totalJobs}
                </Text>
                <Text className="mt-0.5 text-[10px] text-ink/40">
                  Completed Jobs
                </Text>
              </View>
            </View>

            <Text className="text-sm text-ink/60">Base Hourly Rate</Text>
            <Text className="text-base font-bold text-primary">
              Rs. {provider.basePrice} / hr
            </Text>

            {/* Action buttons */}
            <View className="mt-5 w-full gap-2.5">
              {provider.available ? (
                <Pressable
                  onPress={() => router.push(`/booking?providerId=${provider.userId}`)}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
                >
                  <Icon icon={Calendar} color="#fff" size={20} />
                  <Text className="text-base font-bold text-white">
                    Book Service Now
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View className="flex-row gap-2 rounded-xl border border-slate-500/25 bg-slate-500/10 p-3">
                    <Icon icon={Info} color="#64748b" size={16} />
                    <Text className="flex-1 text-xs leading-relaxed text-ink/75">
                      This provider is currently offline. You can notify them to get
                      online and accept your job match immediately!
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleNotifyWorker}
                    disabled={notifying || notified}
                    className={`flex-row items-center justify-center gap-2 rounded-xl border py-3.5 ${
                      notified
                        ? "border-emerald-500/20 bg-emerald-500/10"
                        : "border-primary bg-primary"
                    }`}
                  >
                    {notifying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon
                        icon={Sparkles}
                        color={notified ? "#059669" : "#fff"}
                        size={18}
                      />
                    )}
                    <Text
                      className={`text-base font-bold ${
                        notified ? "text-emerald-600" : "text-white"
                      }`}
                    >
                      {notified ? "Worker Notified ✓" : "Notify to get Online"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/booking?providerId=${provider.userId}`)}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3"
                  >
                    <Icon icon={Calendar} color="#1F5D3F" size={16} />
                    <Text className="text-sm font-bold text-ink">
                      Schedule for Later
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Card>

        {/* Bio */}
        <Card className="mb-4 p-4">
          <Text className="mb-3 border-b border-border pb-2 text-base font-bold text-ink">
            Professional Biography
          </Text>
          <Text className="whitespace-pre-line text-sm leading-relaxed text-ink/70">
            {provider.bio}
          </Text>
        </Card>

        {/* Location */}
        <Card className="mb-4 p-4">
          <Text className="mb-3 border-b border-border pb-2 text-base font-bold text-ink">
            Location &amp; Service Region
          </Text>
          <View className="gap-2">
            <Text className="flex-row items-center gap-2 text-sm font-semibold text-ink">
              <Icon icon={MapPin} color="#1F5D3F" size={16} /> Base City:{" "}
              <Text className="text-primary">{provider.city}</Text>
            </Text>
            <Text className="flex-row items-center gap-2 text-sm text-ink/60">
              <Icon icon={Compass} color="#1F5D3F" size={16} /> GPS Pin Drop:{" "}
              <Text className="font-mono text-xs">
                {provider.location.lat.toFixed(5)}, {provider.location.lng.toFixed(5)}
              </Text>
            </Text>
          </View>

          <View className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3">
            <View className="flex-row items-center gap-1.5">
              <Icon icon={UserCheck} color="#059669" size={16} />
              <Text className="text-xs font-bold text-emerald-600">
                Ready to travel inside {provider.city}
              </Text>
            </View>
          </View>

          <View className="mt-4 h-36 items-center justify-center rounded-lg border border-dashed border-border bg-surface">
            <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon icon={MapPin} color="#1F5D3F" size={20} />
            </View>
            <Text className="text-xs font-bold text-ink">
              Active Dispatch Area
            </Text>
            <Text className="mt-0.5 text-center text-xs text-ink/50">
              Worker is dispatched from coordinates in {provider.city} directly
              to your pinned location.
            </Text>
          </View>
        </Card>

        {/* Verification checks */}
        <Card className="p-4">
          <Text className="mb-3 flex-row items-center gap-1.5 border-b border-border pb-2 text-base font-bold text-ink">
            <Icon icon={ShieldCheck} color="#1F5D3F" size={20} /> Khidmat
            Security &amp; Safety Checks
          </Text>
          <View className="gap-3">
            {verificationChecks.map((item, index) => (
              <View key={index} className="flex-row items-center gap-2">
                <View className="h-5 w-5 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                  <Icon icon={Check} color="#059669" size={12} />
                </View>
                <Text className="text-xs font-semibold text-ink/70">{item}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* Success toast */}
      {showSuccessToast && (
        <View className="mx-auto mt-4 w-full max-w-md flex-row items-center gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-xl">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
            <Text className="font-bold text-emerald-500">✓</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink">Notification Dispatched!</Text>
            <Text className="text-xs text-ink/75">
              {provider.name} was sent an email &amp; in-app alert.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}