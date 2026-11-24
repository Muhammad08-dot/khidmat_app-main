import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { PAKISTAN_CITIES, type LocationCoords } from "@/src/utils/location";
import { Select } from "@/src/components/ui/Select";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Lahore");
  const [submitting, setSubmitting] = useState(false);

  const PakistaniCities = Object.keys(PAKISTAN_CITIES);

  const handleComplete = async () => {
    if (!phone.trim() || phone.length < 9) {
      Alert.alert("Validation", "Please enter a valid mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      const coords: LocationCoords = PAKISTAN_CITIES[city] ?? { lat: 31.5204, lng: 74.3587 };
      await updateProfile({
        phone: phone.startsWith("+92") ? phone : `+92${phone.replace(/\D/g, "")}`,
        city,
        role,
        coordinates: coords,
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface p-6 justify-center"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl border border-border bg-surface-raised p-6 shadow-soft">
          <Text className="text-xl font-bold text-ink text-start mb-1">Complete Your Profile</Text>
          <Text className="text-xs text-ink/60 text-start mb-6">
            Please choose your account type and city to finish setting up your account.
          </Text>

          <Text className="text-xs font-semibold uppercase text-ink/50 text-start mb-2">Account Type</Text>
          <View className="mb-4 flex-row rounded-xl border border-border bg-surface p-1">
            <Pressable
              onPress={() => setRole("customer")}
              className={`flex-1 rounded-lg py-2.5 ${role === "customer" ? "bg-primary" : ""}`}
            >
              <Text className={`text-center text-xs font-semibold ${role === "customer" ? "text-white" : "text-ink/60"}`}>
                I need a service (Client)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("provider")}
              className={`flex-1 rounded-lg py-2.5 ${role === "provider" ? "bg-primary" : ""}`}
            >
              <Text className={`text-center text-xs font-semibold ${role === "provider" ? "text-white" : "text-ink/60"}`}>
                I offer services (Provider)
              </Text>
            </Pressable>
          </View>

          <Text className="text-xs font-semibold uppercase text-ink/50 text-start mb-1.5">Phone Number</Text>
          <View className="mb-4 flex-row items-center rounded-xl border border-border bg-surface px-4">
            <Text className="border-r border-border pr-2 text-xs font-semibold text-ink/70">+92</Text>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
              placeholder="3001234567"
              placeholderTextColor="rgba(20,35,28,0.3)"
              keyboardType="phone-pad"
              maxLength={10}
              className="ml-2 flex-1 py-3 text-sm text-ink text-start"
            />
          </View>

          <Text className="text-xs font-semibold uppercase text-ink/50 text-start mb-1.5">City</Text>
          <View className="mb-6">
            <Select options={PakistaniCities} value={city} onChange={setCity} />
          </View>

          <Pressable
            onPress={handleComplete}
            disabled={submitting}
            className="rounded-xl bg-primary py-3.5 items-center disabled:opacity-60"
          >
            <Text className="text-sm font-semibold text-white">
              {submitting ? "Saving Profile..." : "Get Started"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

