
import React from "react";
import { BRAND } from "@/src/theme/colors";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  Zap, Droplet, Hammer, Paintbrush, Snowflake, Sparkles, Settings, Car,
  Sprout, Truck, Bug, Eye, Flame, Layers, Wrench, Camera, Video,
  PartyPopper, Music, Utensils, UserCheck,
} from "lucide-react-native";
import { Icon } from "@/src/components/ui/Icon";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ color?: string; size?: number }>> = {
  Electrician: Zap,
  Plumber: Droplet,
  Carpenter: Hammer,
  Painter: Paintbrush,
  "AC Technician": Snowflake,
  "House Cleaner": Sparkles,
  "Appliance Repair": Settings,
  Mechanic: Car,
  Gardener: Sprout,
  "Movers & Packers": Truck,
  "Pest Control": Bug,
  "CCTV Technician": Eye,
  Welder: Flame,
  Mason: Layers,
  Handyman: Wrench,
  Photographer: Camera,
  Videographer: Video,
  "Event Decorator": PartyPopper,
  DJ: Music,
  Caterer: Utensils,
  "Waiter/Server": UserCheck,
};

const CATEGORY_COLORS: Record<string, { text: string; iconBg: string }> = {
  gold: { text: BRAND.gold, iconBg: "bg-accent-gold/10" },
  sky: { text: BRAND.info, iconBg: "bg-accent-sky/10" },
  sage: { text: "#3D7A5F", iconBg: "bg-accent-sage/10" },
};

const CATEGORIES = [
  { name: "Electrician", colorKey: "gold" },
  { name: "Plumber", colorKey: "sky" },
  { name: "Carpenter", colorKey: "sage" },
  { name: "Painter", colorKey: "sage" },
  { name: "AC Technician", colorKey: "sky" },
  { name: "House Cleaner", colorKey: "sage" },
  { name: "Appliance Repair", colorKey: "gold" },
  { name: "Mechanic", colorKey: "sky" },
  { name: "Gardener", colorKey: "sage" },
  { name: "Movers & Packers", colorKey: "sky" },
  { name: "Pest Control", colorKey: "sky" },
  { name: "CCTV Technician", colorKey: "sky" },
  { name: "Welder", colorKey: "gold" },
  { name: "Mason", colorKey: "sage" },
  { name: "Handyman", colorKey: "sage" },
  { name: "Photographer", colorKey: "gold" },
  { name: "Videographer", colorKey: "sky" },
  { name: "Event Decorator", colorKey: "sage" },
  { name: "DJ", colorKey: "gold" },
  { name: "Caterer", colorKey: "sky" },
  { name: "Waiter/Server", colorKey: "sage" },
];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* Header */}
        <View className="mb-8 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-border"
          >
            <Icon icon={ChevronLeft} color={BRAND.ink} size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-2xl font-medium text-ink">
              All Specialties &amp; Categories
            </Text>
            <Text className="text-sm text-ink/60">
              Select a specialty to find verified pros across Pakistan
            </Text>
          </View>
        </View>

        {/* Categories grid */}
        <View className="flex-row flex-wrap gap-3">
          {CATEGORIES.map((cat) => {
            const IconComp = CATEGORY_ICONS[cat.name];
            const colors = CATEGORY_COLORS[cat.colorKey];
            return (
              <Pressable
                key={cat.name}
                onPress={() =>
                  router.push(`/matching?category=${encodeURIComponent(cat.name)}`)
                }
                className="w-[30%] min-w-[100px] items-center justify-center rounded-xl border border-border bg-surface-raised p-4"
              >
                <View
                  className={`mb-3 h-14 w-14 items-center justify-center rounded-2xl ${colors.iconBg}`}
                >
                  <Icon icon={IconComp as any} color={colors.text} size={28} />
                </View>
                <Text className="text-center text-xs font-bold text-ink">
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}