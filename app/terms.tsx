import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Scale, ChevronLeft } from "lucide-react-native";
import { BRAND } from "@/src/theme/colors";
import { Icon } from "@/src/components/ui/Icon";

const EFFECTIVE_DATE = "Effective date: 9 October 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. About these terms",
    body: [
      "These Terms of Service govern your use of the Khidmat app and marketplace. By creating an account or booking a service you agree to them.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You must provide accurate details and keep your password confidential. You are responsible for activity on your account. You must be at least 18 to book or provide services.",
    ],
  },
  {
    title: "3. Using the marketplace",
    body: [
      "Khidmat connects customers with independent service providers. Providers are independent contractors, not Khidmat employees. You are responsible for arranging access to the service location and treating providers with respect.",
    ],
  },
  {
    title: "4. Bookings, pricing & payment",
    body: [
      "A booking is an agreement between you and the provider. Estimated prices cover a base service charge plus any travel fee; the final amount is agreed in-app. Payments are handled through the provider (cash on delivery at this stage). Provider availability, ratings and verification status are shown to help you choose.",
    ],
  },
  {
    title: "5. Cancellations & rescheduling",
    body: [
      "You or the provider can cancel a booking with a reason, or reschedule within the available date and time slots from the booking screen. Please cancel early where possible to respect the other party's time.",
    ],
  },
  {
    title: "6. Reviews & content",
    body: [
      "You may post honest reviews of completed jobs. Reviews must relate to a real booking. We moderate reviews that are abusive, fraudulent or off-topic and may hide or remove them.",
    ],
  },
  {
    title: "7. Prohibited conduct",
    body: [
      "You may not misuse the platform: no harassment, illegal activity, false bookings, attempts to circumvent in-app communication for payment, or scraping/misusing other users' data.",
    ],
  },
  {
    title: "8. Safety & liability",
    body: [
      "Providers shown as verified have passed our review process, but you are responsible for your premises. Khidmat is a marketplace and is not liable for the services themselves or disputes between parties, except as required by law.",
    ],
  },
  {
    title: "9. Changes & termination",
    body: [
      "We may update these terms and the app; material changes will be noted here. You can stop using and delete your account at any time by contacting support.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these terms: support@khidmat.app.",
    ],
  },
];

export default function TermsScreen() {
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
              Terms of Service
            </Text>
            <Text className="mt-0.5 text-xs text-ink/60">{EFFECTIVE_DATE}</Text>
          </View>
        </View>

        <View className="mb-6 flex-row items-center gap-3 rounded-2xl border border-accent-gold/20 bg-accent-gold/10 p-4">
          <Icon icon={Scale} color={BRAND.gold} size={22} />
          <Text className="flex-1 text-xs leading-relaxed text-ink/80">
            Khidmat is a marketplace: we connect you with independent providers
            and keep the platform safe and fair for both sides.
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
            These terms, together with our Privacy Policy, form the whole
            agreement between you and Khidmat.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
