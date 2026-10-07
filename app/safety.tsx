import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  Shield, ChevronLeft, CheckCircle2, PhoneCall, MapPin, Star,
} from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";

const SAFETY_STEPS = [
  {
    num: "01",
    title: "Active Phone Verification",
    icon: PhoneCall,
    description:
      "Contact numbers are validated via one-time passwords (OTP) to ensure clients can always reach the assigned professional in real-time.",
    color: "#D97706",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  {
    num: "02",
    title: "Address & Location Confirmation",
    icon: MapPin,
    description:
      "Physical addresses are collected and verified. Geolocation pinning registers their exact service dispatch coordinates on our local maps.",
    color: "#059669",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    num: "03",
    title: "Background & Reference Audit",
    icon: Shield,
    description:
      "We review local police records clearance (character certificate) and interview reference checks for initial screening before listing.",
    color: "#E11D48",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
  {
    num: "04",
    title: "In-App Performance Monitoring",
    icon: Star,
    description:
      "Ratings and feedback are monitored dynamically. Low ratings (under 4.2 stars) trigger warning notifications and system review, ensuring service standards.",
    color: "#7C3AED",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
];

export default function SafetyScreen() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4">
        {/* Header */}
        <View className="mb-8 flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-border"
          >
            <Icon icon={ChevronLeft} color="#14231C" size={20} />
          </Pressable>
          <View>
            <Text className="font-display text-3xl font-bold text-ink">
              Safety &amp; Verification
            </Text>
            <Text className="mt-0.5 text-xs text-ink/65">
              How we secure your home service experience
            </Text>
          </View>
        </View>

        {/* Main Banner */}
        <Card className="mb-8 overflow-hidden border border-border p-6">
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Icon icon={Shield} color="#1F5D3F" size={32} />
            </View>
            <View className="flex-1">
              <Text className="font-display text-xl font-bold text-ink">
                Our 4-Step Safety Check
              </Text>
              <Text className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                Verified Service Professionals
              </Text>
              <Text className="mt-2 text-sm leading-relaxed text-ink/75">
                At Khidmat, your safety and satisfaction are our top priorities.
                Every registered service provider undergoes a comprehensive 4-step
                background and validation check before they can accept bookings.
              </Text>
            </View>
          </View>
        </Card>

        {/* Steps */}
        <View className="gap-6">
          {SAFETY_STEPS.map((step) => {
            const StepIcon = step.icon;
            return (
              <Card
                key={step.num}
                className="overflow-hidden border border-border p-6"
              >
                {/* Step number watermark */}
                <Text className="absolute bottom-1 right-4 text-7xl font-black text-ink/5">
                  {step.num}
                </Text>

                <View>
                  {/* Icon */}
                  <View
                    className={`mb-4 h-12 w-12 items-center justify-center rounded-2xl border ${step.borderColor} ${step.bgColor}`}
                  >
                    <Icon icon={StepIcon} color={step.color} size={24} />
                  </View>

                  <Text className="text-base font-bold text-ink">
                    {step.num}. {step.title}
                  </Text>

                  <Text className="relative z-10 mt-3 text-xs leading-relaxed text-ink/65">
                    {step.description}
                  </Text>
                </View>

                <View className="mt-4 flex-row items-center gap-1.5">
                  <Icon icon={CheckCircle2} color="#B8863B" size={16} />
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-accent-gold">
                    Verified Check
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}