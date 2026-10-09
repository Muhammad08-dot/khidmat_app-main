import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ShieldCheck, XCircle, Star, Eye, EyeOff, Trash2, Inbox,
} from "lucide-react-native";
import { BRAND } from "@/src/theme/colors";
import { Icon } from "@/src/components/ui/Icon";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/context/AuthContext";
import {
  getPendingProviders,
  setProviderVerification,
  getRecentReviews,
  setReviewHidden,
  deleteReview,
} from "@/src/services/supabase/queries";

type Section = "verification" | "reviews";

const day = (isoStr?: string) => String(isoStr ?? "").slice(0, 10);

function Stars({ n }: { n: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} icon={Star} size={12} color={i <= n ? BRAND.warning : BRAND.border} />
      ))}
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("verification");

  const isAdmin = userProfile?.role === "admin";

  const providersQ = useQuery({
    queryKey: ["pending-providers"],
    queryFn: getPendingProviders,
    enabled: isAdmin,
  });
  const reviewsQ = useQuery({
    queryKey: ["recent-reviews"],
    queryFn: () => getRecentReviews(50),
    enabled: isAdmin,
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "verified" | "rejected" }) =>
      setProviderVerification(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-providers"] }),
  });
  const hideMut = useMutation({
    mutationFn: ({ id, providerId, hidden }: { id: string; providerId: string | null; hidden: boolean }) =>
      setReviewHidden(id, providerId, hidden),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["provider-reviews"] });
    },
  });
  const delMut = useMutation({
    mutationFn: ({ id, providerId }: { id: string; providerId: string | null }) =>
      deleteReview(id, providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["provider-reviews"] });
    },
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={BRAND.primary} />
      </View>
    );
  }

  const Header = (
    <View className="mb-5 flex-row items-center gap-4">
      <Pressable
        onPress={() => router.back()}
        className="h-11 w-11 items-center justify-center rounded-full border border-border"
      >
        <Icon icon={ChevronLeft} color={BRAND.ink} size={20} />
      </Pressable>
      <View className="flex-1">
        <Text className="font-display text-2xl font-bold text-ink">Admin Console</Text>
        <Text className="mt-0.5 text-xs text-ink/60">Provider vetting & review moderation</Text>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        <View className="px-4">
          {Header}
          <Card className="items-center gap-3 border border-border p-8">
            <Icon icon={XCircle} color={BRAND.danger} size={30} />
            <Text className="text-center text-base font-bold text-ink">Restricted area</Text>
            <Text className="text-center text-sm text-ink/65">
              This console is for Khidmat staff accounts only. Ask an administrator to
              grant your account the admin role.
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  const TABS: { id: Section; label: string }[] = [
    { id: "verification", label: `Verifications (${providersQ.data?.length ?? 0})` },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      <View className="px-4">
        {Header}

        <View className="mb-5 flex-row gap-2">
          {TABS.map((tb) => (
            <Pressable
              key={tb.id}
              onPress={() => setSection(tb.id)}
              className={`flex-1 items-center rounded-xl border py-2.5 ${
                section === tb.id ? "border-primary bg-primary/10" : "border-border bg-surface-raised"
              }`}
            >
              <Text className={`text-xs font-bold ${section === tb.id ? "text-primary" : "text-ink/60"}`}>
                {tb.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {section === "verification" ? (
          providersQ.isLoading ? (
            <View className="items-center py-12"><ActivityIndicator color={BRAND.primary} /></View>
          ) : (providersQ.data?.length ?? 0) === 0 ? (
            <Card className="flex-row items-center gap-3 border border-border p-6">
              <Icon icon={ShieldCheck} color={BRAND.success} size={22} />
              <Text className="flex-1 text-sm text-ink/70">
                No providers are waiting for verification.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {providersQ.data!.map((p) => (
                <Card key={p.id} className="gap-3 border border-border p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-ink">{p.name}</Text>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                      {p.status}
                    </Text>
                  </View>
                  <Text className="text-xs text-ink/60">
                    {p.city ?? "—"} · {p.phone ?? "no phone"} · applied {day(p.createdAt)}
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => verifyMut.mutate({ id: p.id, status: "verified" })}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5"
                    >
                      <Icon icon={ShieldCheck} color="#fff" size={15} />
                      <Text className="text-xs font-bold text-white">Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => verifyMut.mutate({ id: p.id, status: "rejected" })}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-red-500/30 py-2.5"
                    >
                      <Icon icon={XCircle} color={BRAND.danger} size={15} />
                      <Text className="text-xs font-bold text-red-500">Reject</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )
        ) : reviewsQ.isLoading ? (
          <View className="items-center py-12"><ActivityIndicator color={BRAND.primary} /></View>
        ) : (reviewsQ.data?.length ?? 0) === 0 ? (
          <Card className="flex-row items-center gap-3 border border-border p-6">
            <Icon icon={Inbox} color={BRAND.muted} size={22} />
            <Text className="flex-1 text-sm text-ink/70">No reviews to moderate yet.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {reviewsQ.data!.map((r) => (
              <Card key={r.id} className={`gap-2 border p-4 ${r.hidden ? "border-ink/10 bg-ink/5" : "border-border"}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Stars n={r.rating} />
                    <Text className="text-[10px] text-ink/40">{day(r.date)}</Text>
                  </View>
                  {r.hidden && (
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-caution">Hidden</Text>
                  )}
                </View>
                <Text className="text-xs font-semibold text-ink">
                  {r.reviewerName} → {r.providerName}
                </Text>
                {r.comment ? (
                  <Text className="text-sm text-ink/75">{r.comment}</Text>
                ) : (
                  <Text className="text-xs italic text-ink/40">(no comment)</Text>
                )}
                <View className="mt-1 flex-row gap-2">
                  <Pressable
                    onPress={() => hideMut.mutate({ id: r.id, providerId: r.providerId, hidden: !r.hidden })}
                    className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5"
                  >
                    <Icon icon={r.hidden ? Eye : EyeOff} color={BRAND.ink} size={14} />
                    <Text className="text-[11px] font-bold text-ink">{r.hidden ? "Unhide" : "Hide"}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => delMut.mutate({ id: r.id, providerId: r.providerId })}
                    className="flex-row items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-1.5"
                  >
                    <Icon icon={Trash2} color={BRAND.danger} size={14} />
                    <Text className="text-[11px] font-bold text-red-500">Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
