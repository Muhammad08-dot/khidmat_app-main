import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import * as Speech from "expo-speech";
import {
  Zap, Droplet, Hammer, Paintbrush, Snowflake, Sparkles,
  Settings, Car, Sprout, Truck, Bug, Eye, Flame, Layers, Wrench,
  Camera, Video, PartyPopper, Music, Utensils, UserCheck,
  Search, Mic, ShieldCheck, AlertCircle, Heart, Users,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import { getCurrentCoords } from "../../utils/geolocation";
import { Icon, type IconProps } from "../ui/Icon";

interface Category {
  name: string;
  icon: typeof Zap;
  color: string;
}

export const CATEGORIES: Category[] = [
  { name: "Electrician", icon: Zap, color: "text-accent-gold" },
  { name: "Plumber", icon: Droplet, color: "text-accent-sky" },
  { name: "Carpenter", icon: Hammer, color: "text-accent-sage" },
  { name: "Painter", icon: Paintbrush, color: "text-accent-gold" },
  { name: "AC Technician", icon: Snowflake, color: "text-accent-sky" },
  { name: "House Cleaner", icon: Sparkles, color: "text-accent-sage" },
  { name: "Appliance Repair", icon: Settings, color: "text-accent-gold" },
  { name: "Mechanic", icon: Car, color: "text-accent-sky" },
  { name: "Gardener", icon: Sprout, color: "text-accent-sage" },
  { name: "Movers & Packers", icon: Truck, color: "text-accent-gold" },
  { name: "Pest Control", icon: Bug, color: "text-accent-sky" },
  { name: "CCTV Technician", icon: Eye, color: "text-accent-sage" },
];

const DEMO_COMMANDS = [
  "I need an electrician for a short circuit",
  "My kitchen pipe is leaking",
  "Need painter for house renovation",
];

export const CustomerHome: React.FC = () => {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const gridCols = width >= 480 ? 3 : 2;
  const tileWidth = (width - 32 - (gridCols - 1) * 12 - 8) / gridCols;

  // Sync customer location once on mount (fire-and-forget, like web).
  useEffect(() => {
    (async () => {
      try {
        const coords = await getCurrentCoords();
        if (coords) await updateProfile({ location: coords });
      } catch (err) {
        console.warn("Failed to sync customer location:", err);
      }
    })();
  }, []);

  const submitSearch = (q?: string) => {
    const query = (q ?? searchQuery).trim();
    if (query) router.push(`/matching?q=${encodeURIComponent(query)}`);
  };

  const openCategory = (name: string) =>
    router.push(`/matching?category=${encodeURIComponent(name)}`);

  const startVoice = () => {
    // No web SpeechRecognition in RN — demo command shortcuts + TTS feedback.
    setVoiceError(
      "Microphone speech recognition isn't available on device yet — try a demo command instead."
    );
    setIsListening(false);
    setVoiceModal(true);
    void Speech.speak(
      "Please describe what job or worker you are searching for.",
      { language: "en-US" }
    );
  };

  const runCommand = (phrase: string) => {
    setVoiceModal(false);
    submitSearch(phrase);
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* HERO */}
        <View className="relative overflow-hidden rounded-2xl border border-border bg-primary/5 px-5 py-8">
          <View className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-gold/10" />
          <View className="absolute -bottom-14 -left-8 h-44 w-44 rounded-full bg-accent-sage/10" />
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500 }}
          >
            <Text className="font-display text-3xl font-semibold leading-tight text-primary">
              Professional Help,{"\n"}Right at Your Doorstep
            </Text>
            <Text className="mt-3 max-w-md font-sans text-sm text-ink/80">
              Trusted local experts for every home need. From fixing a leak to
              planning your next big event.
            </Text>
          </MotiView>

          {/* Search */}
          <View
            className={`mt-6 flex-row items-center rounded-xl border bg-surface-raised px-3 ${
              focused ? "border-accent-gold" : "border-border"
            }`}
          >
            <Icon icon={Search} color="#1F5D3F" size={18} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => submitSearch()}
              placeholder="Describe what service you need... (e.g. kitchen pipe leak)"
              placeholderTextColor="#1F5D3F66"
              className="ml-2 flex-1 py-3.5 text-sm font-medium text-ink"
              returnKeyType="search"
            />
            <Pressable onPress={startVoice} className="rounded-full p-2">
              <Icon icon={Mic} color="#1F5D3F" size={18} />
            </Pressable>
          </View>
        </View>

        {/* CATEGORY GRID */}
        <View className="mt-8">
          <Text className="font-display text-xl font-medium text-ink">
            Explore Categories
          </Text>
          <Text className="mt-1 text-xs text-ink/60">
            Verified professionals across 21 specialties
          </Text>

          <View
            className="mt-4 flex-row flex-wrap"
            style={{ gap: 12, columnGap: 12 }}
          >
            {CATEGORIES.map((cat, index) => {
              const IconCmp = cat.icon as React.ComponentType<IconProps>;
              return (
                <MotiView
                  key={cat.name}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 40, type: "timing", duration: 220 }}
                  style={{ width: tileWidth }}
                >
                  <Pressable
                    onPress={() => openCategory(cat.name)}
                    className="items-center rounded-xl border border-border bg-surface-raised px-2 py-4"
                  >
                    <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <IconCmp color={cat.color === "text-accent-gold" ? "#B8863B" : cat.color === "text-accent-sky" ? "#2C6E8F" : "#6B8F71"} size={22} />
                    </View>
                    <Text className="text-center text-xs font-medium text-ink">
                      {cat.name}
                    </Text>
                  </Pressable>
                </MotiView>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.push("/categories")}
            className="mt-6 self-center rounded-xl border border-primary px-8 py-3"
          >
            <Text className="text-sm font-bold text-primary">
              View More Categories
            </Text>
          </Pressable>
        </View>

        {/* VERIFICATION PITCH */}
        <View className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Icon icon={ShieldCheck} color="#fff" size={22} />
            </View>
            <Text className="flex-1 font-display text-lg font-semibold text-primary">
              Verified Khidmat PROs
            </Text>
          </View>
          <Text className="text-sm leading-relaxed text-ink/70">
            Every professional undergoes a 5-step background check and skill
            verification process to ensure your safety and satisfaction.
          </Text>
          <Pressable
            onPress={() => router.push("/safety")}
            className="mt-4 self-start rounded-xl bg-primary px-6 py-3"
          >
            <Text className="text-sm font-bold text-white">Learn about Safety</Text>
          </Pressable>
        </View>

        {/* WHY KHIDMAT */}
        <View className="mt-8">
          <View className="flex-row items-center gap-2">
            <Icon icon={Heart} color="#EF4444" size={14} />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Created with a Purpose
            </Text>
          </View>
          <Text className="mt-2 font-display text-xl font-semibold leading-tight text-ink">
            Why We Created Khidmat
          </Text>
          <Text className="mt-3 text-sm leading-relaxed text-ink/80">
            Khidmat was created for the DYLP Hackathon with a simple but
            powerful mission: to bridge the gap between skilled blue-collar
            service professionals and Pakistani households.
          </Text>
          <Text className="mt-3 text-sm leading-relaxed text-ink/80">
            We realized that finding trustworthy, verified help for home
            maintenance shouldn't require complex phone directories or unsafe
            third-party suggestions. By digitizing safety rules, identity
            validation, and fair-pricing estimations, Khidmat protects
            customers from arbitrary rate hikes while guaranteeing micro-task
            earners a reliable pipeline of local jobs.
          </Text>
        </View>

        {/* SAFETY */}
        <View className="mt-8">
          <View className="flex-row items-center gap-2">
            <Icon icon={Users} color="#1F5D3F" size={14} />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">
              A Safer Community
            </Text>
          </View>
          <Text className="mt-2 font-display text-xl font-semibold leading-tight text-ink">
            A Direct, Safe, &amp; Smart Marketplace
          </Text>
          <View className="mt-4 gap-4">
            {[
              {
                n: "1",
                t: "Government CNIC Verification",
                d: "Every provider is identity-mapped with validated CNIC databases for total security.",
              },
              {
                n: "2",
                t: "AI-Powered Worker Matching",
                d: "Our custom ranking system matches you with the closest, highest-rated specialists in your city.",
              },
              {
                n: "3",
                t: "Fair Invoice Rate Protection",
                d: "Automated pricing limits prevent overcharging by capping travel fees based on real-time distance calculations.",
              },
            ].map((item) => (
              <View key={item.n} className="flex-row gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Text className="font-mono text-xs font-bold text-primary">
                    {item.n}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">{item.t}</Text>
                  <Text className="mt-0.5 text-xs text-ink/70">{item.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* VOICE MODAL */}
      <Modal
        transparent
        visible={voiceModal}
        animationType="fade"
        onRequestClose={() => setVoiceModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-ink/50 p-4">
          <View className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-5">
            {isListening ? (
              <View className="items-center py-4">
                <View className="h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                  <View className="absolute inset-0 rounded-full bg-red-500/20" />
                  <Icon icon={Mic} color="#EF4444" size={32} />
                </View>
                <Text className="mt-4 font-display text-lg font-semibold text-ink">
                  Listening...
                </Text>
                <Text className="mt-1 text-xs text-ink/60">
                  Please describe what job or worker you are searching for.
                </Text>
                <View className="mt-6 h-12 flex-row items-end justify-center gap-1.5">
                  {[20, 48, 28, 40, 16, 32].map((h, i) => (
                    <View
                      key={i}
                      className="w-1.5 rounded-full bg-primary"
                      style={{ height: h, opacity: 0.8 }}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                  <Icon icon={AlertCircle} color="#D97706" size={26} />
                </View>
                <Text className="mt-3 font-display text-lg font-semibold text-ink">
                  Voice Search Status
                </Text>
                <Text className="mt-1 px-2 text-center text-xs leading-relaxed text-ink/60">
                  {voiceError ||
                    "Speech window closed. No audio was detected."}
                </Text>

                <View className="mt-4 w-full rounded-xl border border-border bg-surface p-3">
                  <Text className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                    Demo Command Shortcut
                  </Text>
                  <View className="gap-1.5">
                    {DEMO_COMMANDS.map((phrase) => (
                      <Pressable
                        key={phrase}
                        onPress={() => runCommand(phrase)}
                        className="rounded-lg border border-border bg-surface-raised p-2.5"
                      >
                        <Text className="text-xs font-semibold text-ink">
                          "{phrase}"
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => setVoiceModal(false)}
              className="mt-4 w-full rounded-xl border border-border bg-surface py-3.5"
            >
              <Text className="text-center text-sm font-bold text-ink">
                Close Voice Dialog
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CustomerHome;
