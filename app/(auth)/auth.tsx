import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Mail,
  Lock,
  User,
  Phone,
  Briefcase,
  Camera,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';
import { MapSelector } from '@/src/components/features/MapSelector';
import { Select } from '@/src/components/ui/Select';
import { PAKISTAN_CITIES, type LocationCoords } from '@/src/utils/location';
import { isDemoLoginEnabled } from '@/src/utils/demoAuth';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { GoogleButton } from '@/src/components/ui/GoogleButton';
import { StepIndicator } from '@/src/components/ui/StepIndicator';
import { Chip } from '@/src/components/ui/Chip';
import { isRTL } from '@/src/i18n';
import { PHONE_CONTAINER_STYLE, PHONE_TEXT_STYLE } from '@/src/i18n/direction';
import { BRAND } from '@/src/theme/colors';

const SPECIALTIES = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC Technician',
  'House Cleaner',
  'Appliance Repair',
  'Mechanic',
  'Gardener',
  'Movers & Packers',
  'Pest Control',
  'CCTV Technician',
  'Welder',
  'Mason',
  'Handyman',
];

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, sendPasswordReset, sendPhoneOtp, verifyPhoneOtp, signInWithGoogle } =
    useAuth();

  const rtl = isRTL();
  const showDemoLogin = isDemoLoginEnabled();
  const phoneAuthEnabled = process.env.EXPO_PUBLIC_PHONE_AUTH_ENABLED === 'true';

  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(0); // 0: Credentials, 1: Location/Trade, 2: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [coordinates, setCoordinates] = useState<LocationCoords>({
    lat: 31.5204,
    lng: 74.3587,
  });

  const [category, setCategory] = useState('Electrician');
  const [basePrice, setBasePrice] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // OTP State
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const PakistaniCities = Object.keys(PAKISTAN_CITIES);

  useEffect(() => {
    const coords = PAKISTAN_CITIES[city];
    if (coords) setCoordinates(coords);
  }, [city]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (!phone.trim() || phone.length < 9) {
      setError('Please enter a valid Pakistani phone number (e.g. 3001234567).');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (role === 'provider') {
      if (!basePrice.trim() || isNaN(Number(basePrice)) || Number(basePrice) <= 0) {
        setError('Please enter a valid hourly rate in PKR.');
        return false;
      }
      if (!bio.trim() || bio.length < 10) {
        setError('Please enter a professional bio (minimum 10 characters).');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleLoginSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: any) {
      const m = err.message || '';
      let friendly = err.message || 'An error occurred during authentication.';
      if (m.includes('Invalid login credentials')) {
        friendly = 'Invalid email or password. Please try again.';
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
      const formattedPhone = `+92${cleanPhone}`;

      let providerDetails = undefined;
      if (role === 'provider') {
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

      if (!result?.session) {
        setNotice('Account created! Check your email to confirm your account, then log in.');
        setIsLogin(true);
        setLoading(false);
        return;
      }

      router.replace('/');
    } catch (err: any) {
      const m = err.message || '';
      let friendly = err.message || 'An error occurred during sign up.';
      if (m.includes('User already registered')) {
        friendly = 'This email address is already registered.';
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res) return;
      if (Platform.OS === 'web') {
        router.replace('/');
      }
    } catch (err: any) {
      const msg =
        err.message ||
        'Could not sign in with Google. Ensure Google provider is configured in Supabase.';
      setError(msg);
      Alert.alert(
        'Google Sign-In',
        'Google login requires enabling the Google Provider with OAuth credentials in your Supabase dashboard.\n\nTip: You can use Email/Password to sign in or create an account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email address above first, then tap 'Forgot password?'.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setNotice('Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Could not send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signupSteps = [
    { title: 'Account' },
    { title: 'Location' },
    { title: 'Review' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 32,
          flexGrow: 1,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View className="mb-6 items-center">
          <Image
            source={require('@/assets/logo.jpeg')}
            style={{ width: 68, height: 68, borderRadius: 16 }}
            className="mb-2.5 shadow-sm"
            resizeMode="cover"
          />
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display text-2xl font-bold tracking-tight text-primary">
              Khidmat
            </Text>
            <Text className="text-base font-bold text-accent-gold">خدمت</Text>
          </View>
          <Text className="mt-1 text-center text-xs font-medium text-gray-500">
            Trusted doorstep services across Pakistan
          </Text>
        </View>

        {/* Global Notifications */}
        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-xs font-semibold text-red-600">{error}</Text>
          </View>
        ) : null}

        {notice ? (
          <View className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <Text className="text-xs font-semibold text-emerald-700">{notice}</Text>
          </View>
        ) : null}

        {/* Main Card (Single Surface, Modern Elevated Container) */}
        <View className="w-full rounded-2xl bg-white border border-border p-6 shadow-sm">
          {isLogin ? (
            /* ==================== LOGIN SCREEN (S-1) ==================== */
            <View>
              <Text
                className={`text-xl font-bold text-gray-900 mb-1 ${
                  rtl ? 'text-right' : 'text-left'
                }`}
              >
                Welcome Back
              </Text>
              <Text
                className={`text-xs text-gray-500 mb-5 ${
                  rtl ? 'text-right' : 'text-left'
                }`}
              >
                Sign in to manage bookings and request verified services.
              </Text>

              <Input
                label="Email Address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerClassName="mb-3.5"
                leadingIcon={<Mail size={16} color={BRAND.muted} />}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showLoginPassword}
                showPasswordToggle
                isPasswordVisible={showLoginPassword}
                onTogglePassword={() => setShowLoginPassword(!showLoginPassword)}
                containerClassName="mb-2"
                leadingIcon={<Lock size={16} color={BRAND.muted} />}
              />

              <Pressable
                onPress={handleForgotPassword}
                className={`mb-4 self-end`}
              >
                <Text className="text-xs font-semibold text-primary">
                  Forgot password?
                </Text>
              </Pressable>

              <Button
                title="Login to Account"
                onPress={handleLoginSubmit}
                loading={loading}
                fullWidth
                className="mb-4"
              />

              <View className="flex-row items-center my-3">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="mx-3 text-xs font-medium text-gray-400">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              <GoogleButton
                onPress={handleGoogleSignIn}
                label="Continue with Google"
                loading={loading}
                className="mb-3"
              />

              {showDemoLogin && (
                <Button
                  title="⚡ Quick Demo Login (Dev Mode)"
                  variant="outline"
                  onPress={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      try {
                        await signIn('testuser@khidmat.app', 'Test123456!');
                      } catch {
                        await signUp(
                          'testuser@khidmat.app',
                          'Test123456!',
                          'Test User',
                          '+923001234567',
                          'Lahore',
                          'customer',
                          { lat: 31.5204, lng: 74.3587 }
                        );
                      }
                      router.replace('/');
                    } catch (e: any) {
                      setError(e.message || 'Could not log in with test account.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  fullWidth
                  className="mt-1"
                />
              )}
            </View>
          ) : (
            /* ==================== MULTI-STEP SIGNUP SCREEN (S-2) ==================== */
            <View>
              <Text
                className={`text-xl font-bold text-gray-900 mb-1 ${
                  rtl ? 'text-right' : 'text-left'
                }`}
              >
                Create Account
              </Text>
              <Text
                className={`text-xs text-gray-500 mb-4 ${
                  rtl ? 'text-right' : 'text-left'
                }`}
              >
                Join Khidmat to hire verified pros or earn as a service provider.
              </Text>

              <StepIndicator
                steps={signupSteps}
                currentStep={signupStep}
                className="mb-5"
              />

              {/* STEP 0: Account Type & Credentials */}
              {signupStep === 0 && (
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                    Account Type
                  </Text>
                  <SegmentedControl
                    options={[
                      {
                        value: 'customer',
                        label: 'I need a service',
                        sublabel: 'Client Account',
                      },
                      {
                        value: 'provider',
                        label: 'I offer services',
                        sublabel: 'Verified Partner',
                      },
                    ]}
                    value={role}
                    onChange={(r) => setRole(r as 'customer' | 'provider')}
                    className="mb-4"
                  />

                  <Input
                    label="Full Name"
                    placeholder="e.g. Muhammad Bilal"
                    value={name}
                    onChangeText={setName}
                    containerClassName="mb-3"
                    leadingIcon={<User size={16} color={BRAND.muted} />}
                  />

                  <View className="mb-3">
                    <Text className="mb-1.5 text-xs font-medium text-gray-700">
                      Phone Number
                    </Text>
                    <View
                      style={PHONE_CONTAINER_STYLE}
                      className="min-h-[52px] flex-row items-center rounded-xl bg-white px-3.5 border border-border"
                    >
                      <Phone size={16} color={BRAND.muted} />
                      <Text
                        style={PHONE_TEXT_STYLE}
                        className="ml-2.5 mr-2 border-r border-gray-200 pr-2 text-xs font-bold text-gray-700"
                      >
                        +92
                      </Text>
                      <Input
                        placeholder="3001234567"
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={PHONE_TEXT_STYLE}
                        className="flex-1 py-3 text-sm text-gray-900 border-0"
                      />
                    </View>
                  </View>

                  <Input
                    label="Email Address"
                    placeholder="name@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerClassName="mb-3"
                    leadingIcon={<Mail size={16} color={BRAND.muted} />}
                  />

                  <Input
                    label="Password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showSignupPassword}
                    showPasswordToggle
                    isPasswordVisible={showSignupPassword}
                    onTogglePassword={() => setShowSignupPassword(!showSignupPassword)}
                    containerClassName="mb-5"
                    leadingIcon={<Lock size={16} color={BRAND.muted} />}
                  />

                  <Button
                    title="Continue to Location"
                    onPress={() => {
                      if (validateStep1()) setSignupStep(1);
                    }}
                    fullWidth
                  />
                </View>
              )}

              {/* STEP 1: Location & Service Details */}
              {signupStep === 1 && (
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                    City of Operation
                  </Text>
                  <View className="mb-4">
                    <Select options={PakistaniCities} value={city} onChange={setCity} />
                  </View>

                  {role === 'provider' ? (
                    <View className="mb-4">
                      <Text className="text-xs font-semibold text-gray-700 mb-2">
                        Select Your Trade Specialty
                      </Text>
                      <View className="flex-row flex-wrap gap-2 mb-4">
                        {SPECIALTIES.slice(0, 8).map((spec) => (
                          <Chip
                            key={spec}
                            label={spec}
                            selected={category === spec}
                            onPress={() => setCategory(spec)}
                          />
                        ))}
                      </View>

                      <Input
                        label="Hourly Base Rate (PKR)"
                        placeholder="e.g. 800"
                        value={basePrice}
                        onChangeText={setBasePrice}
                        keyboardType="numeric"
                        containerClassName="mb-3"
                        leadingIcon={<Text className="text-xs font-bold text-gray-500">Rs.</Text>}
                      />

                      <Input
                        label="Professional Bio"
                        placeholder="Highlight your trade experience and skills..."
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        containerClassName="mb-3"
                      />
                    </View>
                  ) : null}

                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                    Pin Location on Map
                  </Text>
                  <MapSelector
                    value={coordinates}
                    onChange={setCoordinates}
                    city={city}
                    className="mb-5"
                  />

                  <View className="flex-row gap-3">
                    <Button
                      title="Back"
                      variant="secondary"
                      onPress={() => setSignupStep(0)}
                      className="flex-1"
                    />
                    <Button
                      title="Next: Review"
                      onPress={() => {
                        if (validateStep2()) setSignupStep(2);
                      }}
                      className="flex-1"
                    />
                  </View>
                </View>
              )}

              {/* STEP 2: Profile Photo & Final Review */}
              {signupStep === 2 && (
                <View>
                  <View className="items-center mb-5">
                    <Pressable onPress={pickPhoto} className="relative">
                      {photoUri ? (
                        <Avatar
                          src={photoUri}
                          name={name || 'U'}
                          className="h-24 w-24 rounded-full border-2 border-primary"
                        />
                      ) : (
                        <View className="h-24 w-24 rounded-full items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50">
                          <Camera size={28} color={BRAND.muted} />
                        </View>
                      )}
                      <View className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary border-2 border-white">
                        <Sparkles size={12} color="#FFFFFF" />
                      </View>
                    </Pressable>
                    <Pressable onPress={pickPhoto} className="mt-2">
                      <Text className="text-xs font-semibold text-primary">
                        {photoUri ? 'Change Photo' : 'Add Profile Photo (Optional)'}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5">
                    <Text className="text-xs font-bold text-gray-800 mb-2">
                      Account Summary
                    </Text>
                    <View className="gap-1.5">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-gray-500">Account Type:</Text>
                        <Text className="text-xs font-semibold text-gray-900 capitalize">
                          {role === 'customer' ? 'Client' : 'Service Provider'}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-gray-500">Name:</Text>
                        <Text className="text-xs font-semibold text-gray-900">{name}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-gray-500">City:</Text>
                        <Text className="text-xs font-semibold text-gray-900">{city}</Text>
                      </View>
                      {role === 'provider' ? (
                        <>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">Specialty:</Text>
                            <Text className="text-xs font-semibold text-primary">{category}</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">Rate:</Text>
                            <Text className="text-xs font-semibold text-gray-900">PKR {basePrice}/hr</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <Button
                      title="Back"
                      variant="secondary"
                      onPress={() => setSignupStep(1)}
                      className="flex-1"
                    />
                    <Button
                      title="Complete Signup"
                      onPress={handleSignupSubmit}
                      loading={loading}
                      className="flex-1"
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Switch Login / Signup Footer */}
          <Pressable
            onPress={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSignupStep(0);
            }}
            className="mt-6 items-center pt-4 border-t border-gray-100"
          >
            <Text className="text-xs font-semibold text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <Text className="text-primary font-bold">
                {isLogin ? 'Sign Up' : 'Log In'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
