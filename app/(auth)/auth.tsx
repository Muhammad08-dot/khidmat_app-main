import React, { useEffect, useState } from "react";
import { BRAND } from "@/src/theme/colors";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Mail, Lock, User, Phone, MapPin, ArrowRight, Loader,
  Briefcase, BookOpen, Map, Camera, CheckCircle2,
} from "lucide-react-native";
import { useAuth } from '@/src/context/AuthContext';
import { MapSelector } from "@/src/components/features/MapSelector";
import { Select } from "@/src/components/ui/Select";
import { Icon } from "@/src/components/ui/Icon";
import { PAKISTAN_CITIES, type LocationCoords } from "@/src/utils/location";
import { Avatar } from "@/src/components/ui/Avatar";

const SPECIALTIES = [
  "Electrician", "Plumber", "Carpenter", "Painter", "AC Technician",
  "House Cleaner", "Appliance Repair", "Mechanic", "Gardener", "Movers & Packers",
  "Pest Control", "CCTV Technician", "Welder", "Mason", "Handyman",
  "Photographer", "Videographer", "Event Decorator", "DJ", "Caterer", "Waiter/Server",
];

const inputClass =
  "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, sendPasswordReset, sendPhoneOtp, verifyPhoneOtp } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const phoneAuthEnabled = process.env.EXPO_PUBLIC_PHONE_AUTH_ENABLED === "true";
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Lahore");
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [coordinates, setCoordinates] = useState<LocationCoords>({
    lat: 31.5204,
    lng: 74.3587,
  });

  const [category, setCategory] = useState("Electrician");
  const [basePrice, setBasePrice] = useState("");
  const [bio, setBio] = useState("");

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const PakistaniCities = Object.keys(PAKISTAN_CITIES);

  useEffect(() => {
    const coords = PAKISTAN_CITIES[city];
    if (coords) setCoordinates(coords);
  }, [city]);

  const pickPhoto = async () => {
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
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {        if (!name.trim()) throw new Error("Please enter your full name.");
        if (!phone.trim()) throw new Error("Please enter your phone number.");
        if (phone.length < 9) throw new Error("Please enter a valid phone number.");

        const cleanPhone = phone.startsWith("0") ? phone.slice(1) : phone;
        const formattedPhone = `+92${cleanPhone}`;

        let providerDetails = undefined;
        if (role === "provider") {
          if (
            !basePrice.trim() ||
            isNaN(Number(basePrice)) ||
            Number(basePrice) <= 0
          ) {
            throw new Error("Please enter a valid hourly base rate in PKR.");
          }
          if (!bio.trim() || bio.length < 10) {
            throw new Error(
              "Please enter a professional bio (minimum 10 characters)."
            );
          }
          providerDetails = { category, bio, basePrice: Number(basePrice) };
        }

        const result = await signUp(
          email,
          password,
          name,
          formattedPhone,
          city,
          role,
          coordinates,
          providerDetails
        );
        // If "Confirm email" is enabled in Supabase, no session is returned —
        // the user must confirm before signing in.
        if (!result?.session) {
          setNotice(
            "Account created! Check your inbox to confirm your email, then log in."
          );
          setIsLogin(true);
          setLoading(false);
          return;
        }
      }
      router.replace("/");
    } catch (err: any) {
      console.error(err);
      let friendly = err.message || "An error occurred during authentication.";
      const m = err.message || "";
      if (m.includes("Invalid login credentials")) {
        friendly = "Invalid email or password. Please try again.";
      } else if (m.includes("User already registered")) {
        friendly = "This email address is already in use by another account.";
      } else if (m.includes("Password should be at least")) {
        friendly = "Password should be at least 6 characters long.";
      } else if (m.includes("invalid email")) {
        friendly = "Please enter a valid email address.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email above first, then tap 'Forgot password?'.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setNotice("Password reset link sent to your email. Open it on this device.");
    } catch (err: any) {
      setError(err.message || "Could not send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setNotice(null);
    if (otpPhone.length < 10) {
      setError("Enter a valid phone number (e.g. +923001234567).");
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(otpPhone);
      setOtpSent(true);
      setNotice("SMS code sent to your phone.");
    } catch (err: any) {
      setError(err.message || "Could not send the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (otpCode.length < 4) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(otpPhone, otpCode);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View className="mb-7 items-center">
          <View className="flex-row items-center rounded-2xl border border-border bg-surface-raised px-6 py-3 shadow-soft">
            <Text className="font-display text-xl font-bold tracking-tight text-primary">
              Khidmat
            </Text>
            <Text className="ml-1 text-sm font-semibold text-accent-gold">
              خدمت
            </Text>
          </View>
          <Text className="mt-3 text-center text-sm font-semibold leading-relaxed text-ink">
            Professional &amp; localized service providers at your doorstep.
          </Text>
        </View>

        <View className="w-full rounded-3xl border border-border bg-surface-raised p-6 shadow-soft">
          {error && (
            <View className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          )}
          {notice && (
            <View className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Text className="text-sm text-emerald-700">{notice}</Text>
            </View>
          )}

          {isLogin ? (
            /* LOGIN */
            <View>
              <Text className="mb-1 text-xl font-bold text-ink">Welcome Back</Text>
              <Text className="mb-5 text-xs leading-relaxed text-ink/50">
                Login with your credentials to search and book services.
              </Text>

              <Text className={labelClass}>Email Address</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={Mail} color={BRAND.muted} size={16} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="ml-3 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Text className={labelClass}>Password</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={Lock} color={BRAND.muted} size={16} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  secureTextEntry
                  className="ml-3 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Pressable onPress={handleForgotPassword} className="mb-1 self-start">
                <Text className="text-xs font-semibold text-primary">
                  Forgot password?
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 disabled:opacity-70"
              >
                {loading ? (
                  <View className="flex-row items-center gap-2">
                    <Loader size={16} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Processing...</Text>
                  </View>
                ) : (
                  <>
                    <Text className="text-sm font-semibold text-white">
                      Login to Account
                    </Text>
                    <Icon icon={ArrowRight} color="#fff" size={16} />
                  </>
                )}
              </Pressable>

              {phoneAuthEnabled && (
                <View className="mt-6 border-t border-border pt-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
                    Or login with phone (SMS code)
                  </Text>
                  <TextInput
                    value={otpPhone}
                    onChangeText={setOtpPhone}
                    placeholder="+923001234567"
                    placeholderTextColor="rgba(20,35,28,0.3)"
                    keyboardType="phone-pad"
                    editable={!otpSent}
                    className={`mb-3 ${inputClass}`}
                  />
                  {otpSent ? (
                    <View>
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder="6-digit code"
                        placeholderTextColor="rgba(20,35,28,0.3)"
                        keyboardType="number-pad"
                        className={`mb-3 ${inputClass}`}
                      />
                      <Pressable
                        onPress={handleVerifyOtp}
                        disabled={loading}
                        className="flex-row items-center justify-center rounded-xl bg-primary py-3 disabled:opacity-70"
                      >
                        <Text className="text-sm font-semibold text-white">
                          Verify & Login
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleSendOtp}
                      disabled={loading}
                      className="flex-row items-center justify-center rounded-xl border border-primary py-3 disabled:opacity-70"
                    >
                      <Text className="text-sm font-semibold text-primary">
                        Send SMS Code
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* SIGNUP */
            <View>
              <Text className="mb-1 text-xl font-bold text-ink">Create Account</Text>
              <Text className="mb-5 text-xs leading-relaxed text-ink/50">
                Sign up to register as a client or provide home services across
                Pakistan.
              </Text>

              {/* Photo + role */}
              <View className="mb-5 flex-row items-center gap-4">
                <Pressable onPress={pickPhoto}>
                  {photoUri ? (
                    <Avatar src={photoUri} name={name || "U"} className="h-20 w-20 border-2 border-dashed border-border" />
                  ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border bg-surface">
                      <Icon icon={Camera} color="rgba(20,35,28,0.3)" size={28} />
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={pickPhoto} className="flex-1">
                  <Text className="text-[11px] font-semibold text-primary">
                    {photoUri
                      ? "Change Profile Photo"
                      : "Upload Profile Photo (Optional)"}
                  </Text>
                </Pressable>
              </View>

              <Text className={labelClass}>Account Type</Text>
              <View className="mb-4 flex-row rounded-xl border border-border bg-surface p-1">
                {(["customer", "provider"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    className={`flex-1 rounded-lg py-2 ${
                      role === r ? "bg-surface-raised shadow-sm" : ""
                    }`}
                  >
                    <Text
                      className={`text-center text-xs font-semibold ${
                        role === r ? "text-primary" : "text-ink/50"
                      }`}
                    >
                      {r === "customer" ? "Hire (Client)" : "Provide (Worker)"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                1. Personal Information
              </Text>

              <Text className={labelClass}>Full Name</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={User} color={BRAND.muted} size={16} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Muhammad Bilal"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  className="ml-3 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Text className={labelClass}>Phone Number</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={Phone} color={BRAND.muted} size={16} />
                <Text className="ml-3 border-r border-border pr-2 text-xs font-semibold text-ink/70">
                  +92
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
                  placeholder="3001234567"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="ml-2 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Text className={labelClass}>Email Address</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={Mail} color={BRAND.muted} size={16} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="ml-3 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Text className={labelClass}>Password</Text>
              <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
                <Icon icon={Lock} color={BRAND.muted} size={16} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(20,35,28,0.3)"
                  secureTextEntry
                  className="ml-3 flex-1 py-3 text-sm text-ink"
                />
              </View>

              <Text className="mb-1.5 mt-2 text-xs font-bold uppercase tracking-wide text-primary">
                2. Service &amp; Location Details
              </Text>

              <Text className={labelClass}>City of Residence</Text>
              <View className="mb-4">
                <Select
                  options={PakistaniCities}
                  value={city}
                  onChange={setCity}
                />
              </View>

              <Text className={labelClass}>Pin Exact Location</Text>
              <MapSelector
                value={coordinates}
                onChange={setCoordinates}
                city={city}
                className="mb-2"
              />

              {role === "provider" && (
                <View className="mt-2 flex-col gap-4 border-t border-border pt-4">
                  <Text className="flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <Icon icon={Briefcase} color={BRAND.primary} size={14} /> Provider
                    Specialty info
                  </Text>

                  <Text className={labelClass}>Specialty category</Text>
                  <Select
                    options={SPECIALTIES}
                    value={category}
                    onChange={setCategory}
                  />

                  <Text className={labelClass}>Hourly Rate (PKR)</Text>
                  <View className="flex-row items-center rounded-xl border border-border bg-surface px-4">
                    <Text className="text-xs font-semibold text-ink/50">
                      Rs.
                    </Text>
                    <TextInput
                      value={basePrice}
                      onChangeText={setBasePrice}
                      placeholder="e.g. 800"
                      placeholderTextColor="rgba(20,35,28,0.3)"
                      keyboardType="numeric"
                      className="ml-2 flex-1 py-3 text-sm text-ink"
                    />
                  </View>

                  <Text className={labelClass}>Professional Bio</Text>
                  <View className="flex-row items-start rounded-xl border border-border bg-surface px-4">
                    <Icon icon={BookOpen} color={BRAND.muted} size={16} />
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Describe your skills, experience, and certifications..."
                      placeholderTextColor="rgba(20,35,28,0.3)"
                      multiline
                      style={{ minHeight: 80 }}
                      className="ml-3 flex-1 py-3 text-sm text-ink"
                    />
                  </View>
                </View>
              )}

              <View className="mt-6 flex-row justify-center">
                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  className="w-full max-w-[320px] flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 disabled:opacity-70"
                >
                  {loading ? (
                    <View className="flex-row items-center gap-2">
                      <Loader size={16} color="#fff" />
                      <Text className="text-sm font-semibold text-white">
                        Processing...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text className="text-sm font-semibold text-white">
                        Create Account
                      </Text>
                      <Icon icon={ArrowRight} color="#fff" size={16} />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          <Pressable onPress={() => { setIsLogin(!isLogin); setError(null); }} className="mt-6 items-center">
            <Text className="text-sm font-semibold text-primary">
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Login"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
