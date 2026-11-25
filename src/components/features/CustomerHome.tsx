import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Zap,
  Droplet,
  Hammer,
  Paintbrush,
  Snowflake,
  Sparkles,
  Settings,
  Car,
  Search,
  MapPin,
  Bell,
  ShieldCheck,
  ChevronRight,
  Clock,
  Bot,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { getCurrentCoords } from '@/src/utils/geolocation';
import { ProviderCard } from '@/src/components/ui/ProviderCard';
import { Badge } from '@/src/components/ui/Badge';
import { SiteAgentWidget } from '@/src/components/features/SiteAgentWidget';
import { colors } from '@/src/theme/tokens';
import { isRTL } from '@/src/i18n';

interface Category {
  name: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Category[] = [
  { name: 'Electrician', icon: Zap, color: '#D97706', bgColor: '#FEF3C7' },
  { name: 'Plumber', icon: Droplet, color: '#2563EB', bgColor: '#DBEAFE' },
  { name: 'Carpenter', icon: Hammer, color: '#7C3AED', bgColor: '#EDE9FE' },
  { name: 'Painter', icon: Paintbrush, color: '#DC2626', bgColor: '#FEE2E2' },
  { name: 'AC Technician', icon: Snowflake, color: '#0284C7', bgColor: '#E0F2FE' },
  { name: 'House Cleaner', icon: Sparkles, color: '#059669', bgColor: '#D1FAE5' },
  { name: 'Appliance Repair', icon: Settings, color: '#4B5563', bgColor: '#F3F4F6' },
  { name: 'Mechanic', icon: Car, color: '#EA580C', bgColor: '#FFEDD5' },
];

const TOP_RATED_PROVIDERS = [
  {
    id: 'prov-1',
    name: 'Muhammad Tariq',
    category: 'Master Electrician',
    rating: 4.9,
    totalJobs: 142,
    basePrice: 800,
    tier: 'Platinum' as const,
  },
  {
    id: 'prov-2',
    name: 'Kamran Ashraf',
    category: 'Expert Plumber',
    rating: 4.8,
    totalJobs: 98,
    basePrice: 700,
    tier: 'Gold' as const,
  },
  {
    id: 'prov-3',
    name: 'Nasir Iqbal',
    category: 'AC & Cooling Specialist',
    rating: 4.9,
    totalJobs: 116,
    basePrice: 1200,
    tier: 'Platinum' as const,
  },
];

export const CustomerHome: React.FC = () => {
  const router = useRouter();
  const { userProfile, updateProfile } = useAuth();
  const { isDark, scaled } = usePreferences();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rtl = isRTL();

  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const city = userProfile?.city || 'Lahore';
  const firstName = userProfile?.name?.split(' ')[0] || '';

  // Sync customer location once on mount
  useEffect(() => {
    (async () => {
      try {
        const coords = await getCurrentCoords();
        if (coords) await updateProfile({ location: coords });
      } catch (err) {
        console.warn('Failed to sync customer location:', err);
      }
    })();
  }, []);

  const submitSearch = (q?: string) => {
    const query = (q ?? searchQuery).trim();
    if (query) router.push(`/matching?q=${encodeURIComponent(query)}`);
  };

  const openCategory = (name: string) =>
    router.push(`/matching?category=${encodeURIComponent(name)}`);

  return (
    <View className="flex-1" style={{ backgroundColor: isDark ? '#121212' : '#FBFAF6' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 8, 16), paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          {/* ================= TOP BAR: BRAND + LOCATION PILL + ALERTS ================= */}
          <View
            className={`flex-row items-center justify-between mb-4 ${
              rtl ? 'flex-row-reverse' : ''
            }`}
          >
            <View>
              <Text
                testID="home-greeting"
                style={{ fontSize: scaled(22), color: isDark ? '#F9FAFB' : '#111827' }}
                className="font-bold"
              >
                Khidmat
              </Text>
            </View>

          <View className="flex-row items-center gap-2">
            {/* Location Pill */}
            <Pressable
              testID="home-location-pill"
              onPress={() => router.push('/profile')}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-xs"
            >
              <MapPin size={13} color={colors.primary} />
              <Text className="text-xs font-semibold text-gray-800">
                {city}
              </Text>
            </Pressable>

            {/* Notification Bell */}
            <Pressable
              testID="home-notifications-button"
              onPress={() => router.push('/notifications')}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center shadow-xs"
            >
              <Bell size={16} color="#4B5563" />
            </Pressable>
          </View>
        </View>

        {/* ================= SEARCH BAR (S-4) ================= */}
        <View
          className={`flex-row items-center rounded-xl bg-white px-3.5 border transition-all shadow-xs mb-6 ${
            focused ? 'border-primary ring-2 ring-primary/20' : 'border-border'
          }`}
        >
          <Search size={18} color={colors.primary} />
          <TextInput
            testID="home-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => submitSearch()}
            placeholder="Search electrician, plumber, AC repair..."
            placeholderTextColor="#9CA3AF"
            style={{ fontSize: scaled(14) }}
            className="ml-2.5 flex-1 py-3 text-gray-900"
            returnKeyType="search"
          />
        </View>

        {/* ================= AI CHATBOT ASSISTANT CARD ================= */}
        <Pressable
          testID="home-ai-chatbot-card"
          onPress={() => setAgentOpen(true)}
          className="mb-6 rounded-2xl border border-primary/20 bg-emerald-950 p-4 shadow-xs"
        >
          <View className={`flex-row items-center justify-between gap-3 ${rtl ? 'flex-row-reverse' : ''}`}>
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center">
                <Bot size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: scaled(13) }} className="font-bold text-white">
                  Assalamu Alaikum{firstName ? `, ${firstName}` : ''}!
                </Text>
                <Text style={{ fontSize: scaled(11) }} className="text-emerald-200 mt-0.5">
                  Khidmat AI Assistant — tap to chat &amp; get instant help
                </Text>
              </View>
            </View>
            <View className="rounded-xl bg-emerald-600 px-3 py-1.5">
              <Text style={{ fontSize: scaled(11) }} className="font-bold text-white">
                Ask AI
              </Text>
            </View>
          </View>
        </Pressable>

        {/* ================= RECENT BOOKING STRIP (S-4) ================= */}
        <View
          testID="home-recent-activity"
          className="mb-6 rounded-2xl bg-white border border-border p-4 shadow-xs"
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Clock size={15} color={colors.primary} />
              <Text className="text-xs font-bold text-gray-900">Recent Activity</Text>
            </View>
            <Badge label="In Progress" variant="warning" />
          </View>
          <Text className="text-sm font-semibold text-gray-800">
            Electrical Wiring & Switchboard Repair
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Provider on the way • ETA 18 mins
          </Text>
          <Pressable
            onPress={() => router.push('/bookings')}
            className="mt-3 pt-2.5 border-t border-gray-100 flex-row items-center justify-between"
          >
            <Text className="text-xs font-semibold text-primary">Track Live Status</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* ================= CATEGORIES (S-4) ================= */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">
              Popular Services
            </Text>
            <Pressable onPress={() => router.push('/categories')}>
              <Text className="text-xs font-semibold text-primary">See All</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => {
              const IconCmp = cat.icon;
              return (
                <Pressable
                  key={cat.name}
                  onPress={() => openCategory(cat.name)}
                  style={{ width: (width - 32 - 10) / 2 }}
                  className="p-3.5 rounded-2xl bg-white border border-border flex-row items-center gap-3 shadow-xs active:bg-gray-50 active:scale-[0.99]"
                >
                  <View
                    style={{ backgroundColor: cat.bgColor }}
                    className="w-10 h-10 rounded-xl items-center justify-center"
                  >
                    <IconCmp size={20} color={cat.color} />
                  </View>
                  <Text numberOfLines={1} className="text-xs font-bold text-gray-900 flex-1">
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ================= TOP RATED NEAR YOU (S-4) ================= */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-base font-bold text-gray-900">
                Top Rated Near You
              </Text>
              <Text className="text-xs text-gray-500">
                Verified pros available in {city}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/providers')}>
              <Text className="text-xs font-semibold text-primary">Explore</Text>
            </Pressable>
          </View>

          {TOP_RATED_PROVIDERS.map((prov) => (
            <ProviderCard
              key={prov.id}
              id={prov.id}
              name={prov.name}
              category={prov.category}
              rating={prov.rating}
              totalJobs={prov.totalJobs}
              basePrice={prov.basePrice}
              tier={prov.tier}
              onPress={() => router.push(`/provider/${prov.id}`)}
            />
          ))}
        </View>

        {/* ================= SAFETY & TRUST BANNER ================= */}
        <View className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 mb-6">
          <View className="flex-row items-center gap-2.5 mb-1.5">
            <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center">
              <ShieldCheck size={18} color="#FFFFFF" />
            </View>
            <Text className="text-sm font-bold text-emerald-900">
              100% Verified Professionals
            </Text>
          </View>
          <Text className="text-xs leading-relaxed text-emerald-800">
            Every Khidmat pro undergoes national CNIC background checks, technical skill audits, and fixed-rate verification.
          </Text>
          <Pressable
            onPress={() => router.push('/safety')}
            className="mt-3 self-start"
          >
            <Text className="text-xs font-bold text-emerald-800 underline">
              Learn how we protect you →
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
    <SiteAgentWidget externalOpen={agentOpen} onExternalOpenChange={setAgentOpen} />
  </View>
  );
};

export default CustomerHome;
