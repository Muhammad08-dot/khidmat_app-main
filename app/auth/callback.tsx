import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { BRAND } from "@/src/theme/colors";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session, userProfile, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Give auth listener up to 8 seconds to hydrate session
    const timer = setTimeout(() => {
      if (!session) {
        setTimedOut(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (loading) return;

    if (session) {
      if (userProfile && userProfile.role) {
        router.replace("/(tabs)");
      } else if (userProfile && !userProfile.role) {
        router.replace("/auth/complete-profile" as any);
      } else {
        // Fallback default to tabs if profile loads shortly
        router.replace("/(tabs)");
      }
    }
  }, [session, userProfile, loading, router]);

  if (timedOut) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="mb-2 text-lg font-bold text-ink">Sign-In Notice</Text>
        <Text className="mb-6 text-center text-sm text-ink/70 leading-relaxed">
          Authentication session took too long to complete. Please try signing in again.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/auth")}
          className="rounded-xl bg-primary px-6 py-3"
        >
          <Text className="text-sm font-semibold text-white">Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Image
        source={require("@/assets/logo.jpeg")}
        style={{ width: 72, height: 72, borderRadius: 18 }}
        className="mb-4"
        resizeMode="cover"
      />
      <ActivityIndicator size="large" color={BRAND.primary} className="mb-4" />
      <Text className="text-base font-semibold text-ink">Completing Sign-In...</Text>
      <Text className="mt-1 text-xs text-ink/50">Securing your session</Text>
    </View>
  );
}

