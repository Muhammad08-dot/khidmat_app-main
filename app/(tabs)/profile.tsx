
import React, { useState } from "react";
import { BRAND } from "@/src/theme/colors";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Briefcase,
  Shield,
  ArrowRightLeft,
  Mail,
  Phone,
  MapPin,
  LogOut,
  Star,
  TrendingUp,
  DollarSign,
  Award,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Languages,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Scale,
  ChevronRight,
  Lock,
} from "lucide-react-native";
import { useAuth } from "@/src/context/AuthContext";
import { uploadProfilePhoto } from "@/src/services/supabase/legacy";
import { getLang, setLang, type Lang, t } from "@/src/i18n";

import { Avatar } from "@/src/components/ui/Avatar";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { Select } from "@/src/components/ui/Select";
import { Icon } from "@/src/components/ui/Icon";

const SPECIALTIES = [
  "Electrician", "Plumber", "Carpenter", "Painter", "AC Technician",
  "House Cleaner", "Appliance Repair", "Mechanic", "Gardener", "Movers & Packers",
  "Pest Control", "CCTV Technician", "Welder", "Mason", "Handyman",
  "Photographer", "Videographer", "Event Decorator", "DJ", "Caterer", "Waiter/Server",
];

/** A navigable row used by the Legal & Support and Admin cards. */
function LinkRow({
  icon,
  label,
  onPress,
  accent = BRAND.primary,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3"
    >
      <View className="flex-row items-center gap-2.5">
        <Icon icon={icon} color={accent} size={16} />
        <Text className="text-sm font-semibold text-ink">{label}</Text>
      </View>
      <Icon icon={ChevronRight} color={BRAND.muted} size={16} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, logout, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [lang, setLangState] = useState<Lang>(getLang());

  const handleSwitchLang = (next: Lang) => {
    setLang(next);
    setLangState(next);
  };

  const [categoryInput, setCategoryInput] = useState("Electrician");
  const [bioInput, setBioInput] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("1500");
  const [registerError, setRegisterError] = useState<string | null>(null);

  // --- Saved addresses ------------------------------------------------
  const [addrModal, setAddrModal] = useState(false);
  const [addrEditingId, setAddrEditingId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrLine, setAddrLine] = useState("");
  const [addrSaving, setAddrSaving] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const handleEditPhoto = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission required",
        "Allow photo library access to upload a profile photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const url = await uploadProfilePhoto(user.id, result.assets[0].uri);
      await updateProfile({ photoURL: url });
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoError("Failed to upload profile photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRegisterWorker = async () => {
    if (!categoryInput) {
      setRegisterError("Please select a service category.");
      return;
    }
    if (!bioInput.trim()) {
      setRegisterError("Please write a brief bio about your skills.");
      return;
    }
    if (!basePriceInput || Number(basePriceInput) <= 0) {
      setRegisterError("Please enter a valid hourly rate (PKR/hr).");
      return;
    }
    try {
      setRegisterError(null);
      await updateProfile({
        role: "provider",
        current_mode: "worker",
        category: categoryInput,
        bio: bioInput,
        basePrice: Number(basePriceInput),
        rating: null,
        totalJobs: 0,
        tier: "Bronze",
        available: true,
        totalEarnings: 0,
        jobsHistory: [],
      });
      setShowRegisterModal(false);
    } catch (err) {
      console.error(err);
      setRegisterError("Failed to register worker profile. Please try again.");
    }
  };

  const handleModeSwitch = async () => {
    if (userProfile?.role === "provider") {
      const nextMode =
        userProfile.current_mode === "worker" ? "client" : "worker";
      await updateProfile({ current_mode: nextMode });
    } else {
      setShowRegisterModal(true);
    }
  };

  const addresses: any[] = (userProfile?.addresses as any[]) ?? [];

  const openAddAddr = () => {
    setAddrEditingId(null);
    setAddrLabel("Home");
    setAddrLine("");
    setAddrModal(true);
  };
  const openEditAddr = (a: any) => {
    setAddrEditingId(a.id);
    setAddrLabel(a.label ?? "Home");
    setAddrLine(a.line ?? "");
    setAddrModal(true);
  };
  const saveAddr = async () => {
    if (!addrLine.trim()) return;
    const base = [...addresses];
    const entry = {
      id: addrEditingId ?? `a_${Date.now()}`,
      label: addrLabel.trim() || "Home",
      line: addrLine.trim(),
    };
    if (addrEditingId) {
      const i = base.findIndex((x) => x.id === addrEditingId);
      if (i >= 0) base[i] = entry;
      else base.push(entry);
    } else {
      base.push(entry);
    }
    setAddrSaving(true);
    try {
      await updateProfile({ addresses: base });
      setAddrModal(false);
    } catch {
      Alert.alert("Could not save address", "Please try again.");
    } finally {
      setAddrSaving(false);
    }
  };
  const removeAddr = (id: string) => {
    Alert.alert("Remove address?", "This saved address will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await updateProfile({ addresses: addresses.filter((a) => a.id !== id) });
          } catch {
            /* ignore */
          }
        },
      },
    ]);
  };

  if (!userProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text className="mt-4 text-sm text-ink/50">Loading profile...</Text>
      </View>
    );
  }

  const isProvider = userProfile.role === "provider";
  const isWorkerMode = userProfile.current_mode === "worker";

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        <Text className="font-display text-2xl font-medium text-ink">Profile</Text>

        {/* Hero banner */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-raised p-5">
          <View className="items-center">
            <View>
              <Avatar
                src={userProfile.photoURL}
                name={userProfile.name}
                className="h-24 w-24 border-4 border-white shadow-md"
              />
              <Pressable
                onPress={handleEditPhoto}
                className="absolute inset-0 items-center justify-center rounded-full bg-black/40"
              >
                <Icon icon={Camera} color="#fff" size={20} />
                <Text className="text-[10px] font-semibold text-white">
                  {uploading ? "Uploading..." : "Edit"}
                </Text>
              </Pressable>
            </View>

            <View className="mt-4 items-center">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-semibold capitalize text-ink">
                  {userProfile.name}
                </Text>
                {isProvider && userProfile.tier && (
                  <TierBadge tier={userProfile.tier} />
                )}
              </View>
              <Text className="mt-1 flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                {isProvider ? (
                  <>
                    <Icon icon={Briefcase} color={BRAND.primary} size={12} /> Service
                    Provider — {userProfile.category}
                  </>
                ) : (
                  <>
                    <Icon icon={Shield} color={BRAND.primary} size={12} /> Client Account
                  </>
                )}
              </Text>

              {isProvider && userProfile.bio && (
                <Text className="mt-3 max-w-lg text-center text-sm italic text-ink/60">
                  "{userProfile.bio}"
                </Text>
              )}

              {photoError && (
                <Text className="mt-2 text-xs font-medium text-red-500">
                  {photoError}
                </Text>
              )}

              <View className="mt-4 items-center gap-3">
                <View
                  className={`rounded-full border px-3 py-1.5 ${
                    isWorkerMode
                      ? "border-primary/20 bg-primary/10"
                      : "border-accent-gold/20 bg-accent-gold/10"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isWorkerMode ? "text-primary" : "text-accent-gold"
                    }`}
                  >
                    {isWorkerMode ? "🔧 Worker Mode" : "👤 Client Mode"}
                  </Text>
                </View>
                <Pressable
                  onPress={handleModeSwitch}
                  className="flex-row items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5"
                >
                  <Icon icon={ArrowRightLeft} color="#fff" size={14} />
                  <Text className="text-xs font-bold text-white">
                    Switch to {isWorkerMode ? "Client" : "Worker"} Mode
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-5 gap-4">
          {/* Contact information */}
          <View className="rounded-2xl border border-border bg-surface-raised p-5">
            <Text className="mb-4 flex-row items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <Icon icon={Mail} color={BRAND.muted} size={14} /> Contact Information
            </Text>
            <View className="gap-4">
              {[
                {
                  icon: Mail,
                  color: BRAND.primary,
                  label: "Email",
                  value: userProfile.email,
                },
                {
                  icon: Phone,
                  color: BRAND.success,
                  label: "Phone",
                  value: userProfile.phone || "Not set",
                },
                {
                  icon: MapPin,
                  color: BRAND.caution,
                  label: "City / Region",
                  value: userProfile.city || "Not set",
                },
              ].map((row) => (
                <View key={row.label} className="flex-row items-start gap-3">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${row.color}14` }}
                  >
                    <Icon icon={row.icon} color={row.color} size={16} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                      {row.label}
                    </Text>
                    <Text className="text-sm font-semibold text-ink">
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mt-6 rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Icon icon={Languages} color={BRAND.primary} size={16} />
                <Text className="text-xs font-bold text-on-surface">Language / زبان</Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => handleSwitchLang("en")}
                  className={`flex-1 py-2 rounded-xl border items-center ${lang === "en" ? "bg-secondary border-secondary" : "border-outline-variant"}`}
                >
                  <Text className={`text-xs font-bold ${lang === "en" ? "text-white" : "text-on-surface-variant"}`}>English</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSwitchLang("ur")}
                  className={`flex-1 py-2 rounded-xl border items-center ${lang === "ur" ? "bg-secondary border-secondary" : "border-outline-variant"}`}
                >
                  <Text className={`text-xs font-bold ${lang === "ur" ? "text-white" : "text-on-surface-variant"}`}>اردو</Text>
                </Pressable>
              </View>
              {lang === "ur" && (
                <Text className="text-[10px] text-on-surface-variant mt-2">
                  Layout direction updates after restarting the app.
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleLogout}
              className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-xl border border-red-500/15 py-2.5"
            >
              <Icon icon={LogOut} color={BRAND.danger} size={14} />
              <Text className="text-xs font-bold text-red-500">Sign Out</Text>
            </Pressable>
          </View>

          {/* Legal & Support */}
          <View className="rounded-2xl border border-border bg-surface-raised p-5">
            <Text className="mb-1 flex-row items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <Icon icon={Shield} color={BRAND.muted} size={14} /> Legal &amp; Support
            </Text>
            <LinkRow icon={Shield} label={t("nav_safety")} onPress={() => router.push("/safety")} />
            <View className="h-px bg-border/60" />
            <LinkRow icon={FileText} label={t("nav_privacy")} onPress={() => router.push("/privacy")} />
            <View className="h-px bg-border/60" />
            <LinkRow icon={Scale} label={t("nav_terms")} onPress={() => router.push("/terms")} />
            {userProfile?.role === "admin" && (
              <>
                <View className="h-px bg-border/60" />
                <LinkRow icon={Lock} label={t("nav_admin")} onPress={() => router.push("/admin")} accent={BRAND.caution} />
              </>
            )}
          </View>

          {/* Saved addresses */}
          <View className="rounded-2xl border border-border bg-surface-raised p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="flex-row items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                <Icon icon={MapPin} color={BRAND.caution} size={14} /> Saved Addresses
              </Text>
              <Pressable
                onPress={openAddAddr}
                className="flex-row items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5"
              >
                <Icon icon={Plus} color="#fff" size={14} />
                <Text className="text-[11px] font-bold text-white">Add</Text>
              </Pressable>
            </View>

            {addresses.length === 0 ? (
              <Text className="py-2 text-center text-xs text-ink/50">
                No saved addresses yet. Add one to autofill while booking.
              </Text>
            ) : (
              <View className="gap-3">
                {addresses.map((a) => (
                  <View
                    key={a.id}
                    className="flex-row items-start gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-accent-terracotta/10">
                      <Icon icon={MapPin} color={BRAND.caution} size={15} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                        {a.label}
                      </Text>
                      <Text className="text-sm font-semibold text-ink">{a.line}</Text>
                    </View>
                    <Pressable onPress={() => openEditAddr(a)} className="p-1.5">
                      <Icon icon={Pencil} color={BRAND.primary} size={16} />
                    </Pressable>
                    <Pressable onPress={() => removeAddr(a.id)} className="p-1.5">
                      <Icon icon={Trash2} color={BRAND.danger} size={16} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Provider stats */}
          {isProvider && (
            <View className="flex-row flex-wrap gap-3 rounded-2xl">
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon icon={Briefcase} color={BRAND.primary} size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Specialty
                </Text>
                <Text className="mt-1 text-center font-display text-base font-semibold text-ink">
                  {userProfile.category}
                </Text>
              </View>
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Icon icon={Star} color={BRAND.warning} size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Rating
                </Text>
                <Text className="mt-1 font-display text-xl font-bold text-ink">
                  {userProfile.rating != null
                    ? userProfile.rating.toFixed(1)
                    : "New"}
                </Text>
                <Text className="text-[9px] font-medium text-ink/30">
                  out of 5.0
                </Text>
              </View>
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                  <Icon icon={TrendingUp} color="#0EA5E9" size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Jobs Done
                </Text>
                <Text className="mt-1 font-display text-xl font-bold text-ink">
                  {userProfile.totalJobs || 0}
                </Text>
                <Text className="text-[9px] font-medium text-ink/30">
                  completed
                </Text>
              </View>
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Icon icon={DollarSign} color={BRAND.success} size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Base Rate
                </Text>
                <Text className="mt-1 font-display text-xl font-bold text-primary">
                  Rs. {userProfile.basePrice}
                </Text>
                <Text className="text-[9px] font-medium text-ink/30">per hour</Text>
              </View>
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/10">
                  <Icon icon={Award} color={BRAND.gold} size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Earned
                </Text>
                <Text className="mt-1 font-display text-xl font-bold text-ink">
                  Rs. {userProfile.totalEarnings || 0}
                </Text>
                <Text className="text-[9px] font-medium text-ink/30">
                  total revenue
                </Text>
              </View>
              <View className="min-w-[45%] flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised p-5">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <Icon icon={Shield} color="#8B5CF6" size={20} />
                </View>
                <Text className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/40">
                  Tier
                </Text>
                <View className="mt-1">
                  <TierBadge tier={userProfile.tier || "Bronze"} />
                </View>
              </View>
            </View>
          )}

          {/* Client quick actions */}
          {!isProvider && (
            <View className="rounded-2xl border border-border bg-surface-raised p-5">
              <Text className="mb-4 flex-row items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                <Icon icon={Sparkles} color={BRAND.muted} size={14} /> Quick Actions
              </Text>
              <View className="gap-3">
                <Pressable
                  onPress={() => router.push("/")}
                  className="flex-row items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                    <Icon icon={Briefcase} color={BRAND.primary} size={16} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">
                      Find a Service
                    </Text>
                    <Text className="text-[10px] text-ink/50">
                      Search and book providers
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/bookings")}
                  className="flex-row items-center gap-3 rounded-xl border border-accent-gold/10 bg-accent-gold/5 p-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-gold/15">
                    <Icon icon={Clock} color={BRAND.gold} size={16} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">My Bookings</Text>
                    <Text className="text-[10px] text-ink/50">
                      Track your service requests
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={handleModeSwitch}
                  className="flex-row items-center gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Icon icon={Sparkles} color={BRAND.success} size={16} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">
                      Become a Worker
                    </Text>
                    <Text className="text-[10px] text-ink/50">
                      Start earning on Khidmat
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Worker registration modal */}
      <Modal
        transparent
        visible={showRegisterModal}
        animationType="fade"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6">
            <View className="mb-5 flex-row items-center justify-between border-b border-gray-100 pb-3">
              <Text className="flex-row items-center gap-2 font-display text-lg font-medium text-ink">
                <Icon icon={Sparkles} color={BRAND.gold} size={20} /> Become a
                Service Worker
              </Text>
              <Pressable
                onPress={() => setShowRegisterModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
              >
                <Icon icon={X} color="rgba(20,35,28,0.5)" size={16} />
              </Pressable>
            </View>

            {registerError && (
              <View className="mb-4 rounded-xl border border-red-200 bg-red-100 p-3">
                <Text className="text-xs font-semibold text-red-700">
                  {registerError}
                </Text>
              </View>
            )}

            <Text className="mb-1.5 text-xs font-semibold text-ink/50">
              Select Specialty / Skill Category
            </Text>
            <Select
              options={SPECIALTIES}
              value={categoryInput}
              onChange={setCategoryInput}
            />

            <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink/50">
              Worker Biography / Skills Summary
            </Text>
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="Briefly describe your years of experience, tooling certifications, or work style..."
              placeholderTextColor="rgba(20,35,28,0.3)"
              multiline
              style={{ minHeight: 96 }}
              className="w-full rounded-xl border border-border bg-slate-50 p-3 text-sm text-ink"
            />

            <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink/50">
              Base Hourly Rate (PKR / hr)
            </Text>
            <TextInput
              value={basePriceInput}
              onChangeText={setBasePriceInput}
              placeholder="1500"
              placeholderTextColor="rgba(20,35,28,0.3)"
              keyboardType="numeric"
              className="w-full rounded-xl border border-border bg-slate-50 p-3 text-sm text-ink"
            />

            <Pressable
              onPress={handleRegisterWorker}
              className="mt-5 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary py-3.5"
            >
              <Icon icon={Sparkles} color="#fff" size={20} />
              <Text className="text-sm font-bold text-white">
                Register &amp; Switch to Worker View
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add / edit saved address modal */}
      <Modal
        visible={addrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAddrModal(false)}
      >
        <Pressable className="flex-1 bg-black/50" onPress={() => setAddrModal(false)}>
          <View className="flex-1 justify-end">
            <Pressable
              className="bg-surface-raised rounded-t-3xl p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-lg font-bold text-ink">
                {addrEditingId ? "Edit address" : "Add saved address"}
              </Text>

              <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink/50">Label</Text>
              <View className="flex-row gap-2">
                {["Home", "Office", "Other"].map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setAddrLabel(l)}
                    className={`flex-1 rounded-xl border py-2.5 items-center ${
                      addrLabel === l ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${addrLabel === l ? "text-primary" : "text-ink/70"}`}>
                      {l}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-1.5 mt-4 text-xs font-semibold text-ink/50">Address</Text>
              <TextInput
                value={addrLine}
                onChangeText={setAddrLine}
                placeholder="House No, Street, Neighborhood, City..."
                placeholderTextColor="rgba(20,35,28,0.3)"
                multiline
                style={{ minHeight: 80 }}
                className="w-full rounded-xl border border-border bg-slate-50 p-3 text-sm text-ink"
              />

              <View className="flex-row gap-3 mt-6">
                <Pressable
                  onPress={() => setAddrModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-3.5 items-center"
                >
                  <Text className="text-sm font-bold text-ink">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveAddr}
                  disabled={!addrLine.trim() || addrSaving}
                  className="flex-1 rounded-xl bg-primary py-3.5 items-center"
                >
                  {addrSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Save</Text>
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