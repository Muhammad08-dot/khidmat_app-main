import React, { useEffect, useState } from "react";
import { BRAND } from "@/src/theme/colors";
import { View, Text, Pressable } from "react-native";
import { MotiView } from 'moti';
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Zap, Droplet, Hammer, Paintbrush, Snowflake, Sparkles, Settings, Car,
  Sprout, Truck, Bug, Eye, Flame, Layers, Wrench, Camera, Video,
  PartyPopper, Music, Utensils, UserCheck, Compass, AlertCircle,
  CheckCircle2, ArrowRight,
} from "lucide-react-native";
import { parseServiceIntent, type ParsedIntent } from '@/src/services/api/agentClient';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";

type LucideIcon = React.ComponentType<{ color?: string; size?: number }>;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Electrician: Zap, Plumber: Droplet, Carpenter: Hammer, Painter: Paintbrush,
  "AC Technician": Snowflake, "House Cleaner": Sparkles,
  "Appliance Repair": Settings, Mechanic: Car, Gardener: Sprout,
  "Movers & Packers": Truck, "Pest Control": Bug, "CCTV Technician": Eye,
  Welder: Flame, Mason: Layers, Handyman: Wrench, Photographer: Camera,
  Videographer: Video, "Event Decorator": PartyPopper, DJ: Music,
  Caterer: Utensils, "Waiter/Server": UserCheck,
};

export default function MatchingScreen() {
  const router = useRouter();
  const { q, category } = useLocalSearchParams<{ q?: string; category?: string }>();
  const { userProfile } = useAuth();

  const query = typeof q === "string" ? q : "";
  const categoryPreset = typeof category === "string" ? category : "";

  const [loading, setLoading] = useState(true);
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadingStatuses = [
    "Contacting Gemini AI Engine...",
    "Analyzing search request keywords...",
    "Interpreting work requirements and mapping coordinates...",
    "Optimizing matching categories across Pakistan...",
    "Sorting matching priority scores...",
  ];

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
    }, 1200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const parseIntent = async () => {
      setLoading(true);
      setError(null);

      if (categoryPreset) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setResult({
          category: categoryPreset,
          urgency: "medium",
          summary: `Request for ${categoryPreset} services.`,
        });
        setLoading(false);
        return;
      }

      if (!query.trim()) {
        setError(
          "Please enter a description of what you need on the home screen."
        );
        setLoading(false);
        return;
      }

      try {
        const parsed = await parseServiceIntent(query);
        setResult(parsed);
      } catch (err) {
        console.error(err);
        setError(
          "AI Matching service encountered an error. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    parseIntent();
  }, [query, categoryPreset]);

  const handleFindProviders = () => {
    if (!result) return;
    router.push(
      `/providers?category=${encodeURIComponent(result.category)}&urgency=${encodeURIComponent(result.urgency)}&q=${encodeURIComponent(result.summary)}`
    );
  };

  const MatchedIcon = result ? CATEGORY_ICONS[result.category] || Wrench : Wrench;

  const getUrgency = (urgency: string) => {
    switch (urgency) {
      case "high":
        return { color: BRAND.danger, label: "Critical / Emergency Action" };
      case "medium":
        return { color: BRAND.warning, label: "Standard Scheduled Repair" };
      default:
        return { color: BRAND.success, label: "Routine Maintenance" };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        {/* Animated Radar Scanner UI */}
        <View className="relative h-48 w-48 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <MotiView
              key={i}
              from={{ opacity: 0.8, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ type: 'timing', duration: 2500, loop: true, delay: i * 800 }}
              style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 100, borderWidth: 2, borderColor: 'rgba(31, 93, 63, 0.4)', backgroundColor: 'rgba(31, 93, 63, 0.05)' }}
            />
          ))}
          <View className="h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary shadow-xl">
            <Sparkles color="#ffffff" size={40} />
          </View>
        </View>
        <Text className="mt-10 font-display text-xl font-medium text-ink">
          Gemini AI Engine
        </Text>
        <View className="mt-4 h-6 justify-center">
          <Text className="text-center text-sm text-ink/60">
            {loadingStatuses[statusIndex]}
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Card className="w-full max-w-md p-6">
          <View className="items-center py-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Icon icon={AlertCircle} color={BRAND.danger} size={30} />
            </View>
            <Text className="mt-4 font-display text-lg font-semibold text-ink">
              Matching Failed
            </Text>
            <Text className="mt-2 text-center text-sm text-ink/60">{error}</Text>
            <Pressable
              onPress={() => router.replace("/")}
              className="mt-6 rounded-xl bg-primary px-8 py-3"
            >
              <Text className="text-sm font-bold text-white">Return Home</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    );
  }

  const urgencyInfo = result ? getUrgency(result.urgency) : getUrgency("medium");

  return (
    <View className="flex-1 bg-surface">
      <View className="px-4 py-6">
        {/* Header announcement */}
        <View className="items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-100">
            <Icon icon={CheckCircle2} color={BRAND.success} size={28} />
          </View>
          <Text className="mt-3 font-display text-xl font-medium text-ink">
            Request Analyzed!
          </Text>
          <Text className="mt-1 text-center text-sm text-ink/60">
            Our Gemini AI mapped your task to the best matching specialty.
          </Text>
        </View>

        {/* Result card */}
        <Card className="mt-6 overflow-hidden p-4">
          {query ? (
            <View className="mb-4 rounded-lg border border-border bg-surface p-3">
              <Text className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                Your Input Query
              </Text>
              <Text className="mt-1 text-sm font-medium italic text-ink">
                "{query}"
              </Text>
            </View>
          ) : null}

          <View className="mb-4">
            <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon icon={MatchedIcon as any} color={BRAND.primary} size={24} />
              </View>
              <View className="flex-1">
                <Text className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                  Identified Specialty
                </Text>
                <Text className="text-base font-bold text-ink">
                  {result?.category}
                </Text>
              </View>
            </View>

            {result && (
              <View
                className="flex-row items-center gap-3 rounded-xl border p-3"
                style={{
                  borderColor: `${urgencyInfo.color}40`,
                  backgroundColor: `${urgencyInfo.color}0a`,
                }}
              >
                <View className="h-12 w-12 items-center justify-center">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: urgencyInfo.color, opacity: 0.6 }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                    Urgency Status
                  </Text>
                  <Text className="text-sm font-bold capitalize text-ink">
                    {result.urgency} — {urgencyInfo.label}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Text className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink/40">
            AI Request Summary
          </Text>
          <Text className="border-l-4 border-primary py-1 pl-3 text-sm font-semibold text-ink">
            {result?.summary}
          </Text>

          <View className="mt-4 flex-row items-center gap-2 border-t border-border pt-3">
            <Icon icon={Compass} color={BRAND.primary} size={14} />
            <Text className="text-[11px] text-ink/60">
              Finding local {result?.category} workers registered in{" "}
              {userProfile?.city || "your city"}...
            </Text>
          </View>
        </Card>

        <Pressable
          onPress={handleFindProviders}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4"
        >
          <Text className="text-base font-bold text-white">
            Search Best Rated Workers
          </Text>
          <Icon icon={ArrowRight} color="#fff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}
