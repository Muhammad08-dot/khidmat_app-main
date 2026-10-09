import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Shield, ChevronLeft } from "lucide-react-native";
import { BRAND } from "@/src/theme/colors";
import { Icon } from "@/src/components/ui/Icon";

const EFFECTIVE_DATE = "Effective date: 9 October 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who we are",
    body: [
      "Khidmat (\u201cwe\u201d, \u201cus\u201d) operates a home-services marketplace that connects customers with independent service professionals (\u201cproviders\u201d). This policy explains what personal data we collect, why, and the choices you have.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "Account data: your name, email address, phone number, city and password.",
      "Location data: approximate and, with your permission, precise device location used to match you with nearby providers and to share a provider's arrival progress during an active booking.",
      "Booking data: the service you request, your address, description, schedule, status and any text messages exchanged with a provider through in-app chat.",
      "Profile content: the photo you choose for your avatar and any saved addresses you add.",
      "Device & push data: a notification token so we can send booking and message alerts. You can revoke notifications at any time in your device settings.",
    ],
  },
  {
    title: "3. How we use your information",
    body: [
      "To create and manage your account, match requests to providers, process bookings and COD payments, and deliver in-app and push notifications.",
      "To display provider ratings and verification status so customers can make informed choices.",
      "To keep the service safe: to detect abuse and to let our team moderate reviews and verify providers.",
      "We do not sell your personal data. We do not post content to third parties on your behalf.",
    ],
  },
  {
    title: "4. Location sharing",
    body: [
      "Precise location is only accessed when you allow it. During an active booking a provider's live location may be shown to the matched customer for arrival tracking. You can stop sharing by revoking the location permission in your device settings.",
    ],
  },
  {
    title: "5. How we store & protect data",
    body: [
      "Data is stored in a Supabase (Postgres) backend with row-level security so each user can read and change only the rows they are authorised to. Access in transit is encrypted (HTTPS).",
      "In-app chat is text-only. No photos are uploaded or stored through chat.",
    ],
  },
  {
    title: "6. Retention",
    body: [
      "We keep account and booking records for as long as your account is active, and for legitimate business, legal and safety purposes thereafter. You may request deletion of your account.",
    ],
  },
  {
    title: "7. Your rights",
    body: [
      "You can access and update most of your data from the Profile screen (name, contact details, addresses, avatar, language).",
      "You can withdraw location and notification permissions any time from device settings.",
      "You can request a copy of your data or its deletion by contacting us below.",
    ],
  },
  {
    title: "8. Children",
    body: [
      "Khidmat is not directed at children under 13 (or the minimum age in your region). We do not knowingly collect their data.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about this policy, or requests to access or delete your data, can be sent to: privacy@khidmat.app.",
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        <View className="mb-6 flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-border"
          >
            <Icon icon={ChevronLeft} color={BRAND.ink} size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-3xl font-bold text-ink">
              Privacy Policy
            </Text>
            <Text className="mt-0.5 text-xs text-ink/60">{EFFECTIVE_DATE}</Text>
          </View>
        </View>

        <View className="mb-6 flex-row items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <Icon icon={Shield} color={BRAND.primary} size={22} />
          <Text className="flex-1 text-xs leading-relaxed text-ink/80">
            Short version: we collect only what we need to match you with a
            provider and keep bookings safe. We never sell your data.
          </Text>
        </View>

        <View className="gap-6">
          {SECTIONS.map((s) => (
            <View key={s.title} className="gap-2">
              <Text className="text-base font-bold text-ink">{s.title}</Text>
              {s.body.map((line, i) => (
                <Text key={i} className="text-sm leading-relaxed text-ink/75">
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View className="mt-8 border-t border-border pt-4">
          <Text className="text-xs text-ink/50">
            By continuing to use Khidmat you agree to this Privacy Policy and our
            Terms of Service.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
