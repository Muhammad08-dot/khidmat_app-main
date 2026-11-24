import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as Speech from 'expo-speech';
import {
  Zap,
  Droplet,
  Hammer,
  Paintbrush,
  Snowflake,
  Sparkles,
  Settings,
  Car,
  Sprout,
  Truck,
  Bug,
  Eye,
  Search,
  Mic,
  MapPin,
  Bell,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';
import { getCurrentCoords } from '@/src/utils/geolocation';
import { ProviderCard } from '@/src/components/ui/ProviderCard';
import { Badge } from '@/src/components/ui/Badge';
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

const DEMO_COMMANDS = [
  'I need an electrician for a short circuit',
  'My kitchen pipe is leaking',
  'Need painter for house renovation',
];

export const CustomerHome: React.FC = () => {
  const router = useRouter();
  const { userProfile, updateProfile } = useAuth();
  const { width } = useWindowDimensions();
  const rtl = isRTL();

  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const city = userProfile?.city || 'Lahore';
  const userName = userProfile?.name?.split(' ')[0] || 'Guest';

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

  const startVoice = () => {
    setVoiceError(
      "Microphone speech recognition isn't available on device yet — try a demo command instead."
    );
    setVoiceModal(true);
    void Speech.speak('Please describe what job or worker you are searching for.', {
      language: 'en-US',
    });
  };

  const runCommand = (phrase: string) => {
    setVoiceModal(false);
    submitSearch(phrase);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* ================= TOP BAR: GREETING + LOCATION PILL (S-4) ================= */}
        <View
          className={`flex-row items-center justify-between mb-4 ${
            rtl ? 'flex-row-reverse' : ''
          }`}
        >
          <View>
            <Text className="text-xs text-gray-500 font-medium">
              Assalamu Alaikum
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {userName} 👋
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {/* Location Pill */}
            <Pressable
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
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => submitSearch()}
            placeholder="Search electrician, plumber, AC repair..."
            placeholderTextColor="#9CA3AF"
            className="ml-2.5 flex-1 py-3 text-sm text-gray-900"
            returnKeyType="search"
          />
          <Pressable onPress={startVoice} className="p-1.5 rounded-full bg-gray-50">
            <Mic size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* ================= RECENT BOOKING STRIP (S-4) ================= */}
        <View className="mb-6 rounded-2xl bg-white border border-border p-4 shadow-xs">
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

      {/* ================= VOICE COMMAND MODAL ================= */}
      <Modal
        transparent
        visible={voiceModal}
        animationType="fade"
        onRequestClose={() => setVoiceModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <View className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 mb-3">
                <AlertCircle size={24} color="#D97706" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Voice Search
              </Text>
              <Text className="mt-1 text-center text-xs text-gray-500">
                {voiceError || 'Select a demo query to try instant search:'}
              </Text>

              <View className="mt-4 w-full gap-2">
                {DEMO_COMMANDS.map((phrase) => (
                  <Pressable
                    key={phrase}
                    onPress={() => runCommand(phrase)}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-200 active:bg-gray-100"
                  >
                    <Text className="text-xs font-semibold text-gray-800">
                      "{phrase}"
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => setVoiceModal(false)}
              className="mt-5 w-full rounded-xl bg-gray-100 py-3"
            >
              <Text className="text-center text-xs font-bold text-gray-700">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CustomerHome;
