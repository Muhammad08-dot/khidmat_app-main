import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Home, Hammer, Droplet, Zap, Wrench } from "lucide-react-native";
import { Icon } from "@/src/components/ui/Icon";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      {/* Decorative background */}
      <View className="absolute left-[-20%] top-[-10%] h-64 w-64 rounded-full bg-accent-sage/10 opacity-50" />
      <View className="absolute bottom-[-15%] right-[-10%] h-72 w-72 rounded-full bg-primary/5 opacity-40" />

      {/* Card */}
      <View className="w-full max-w-md rounded-[32px] border border-border bg-white p-8 shadow-xl">
        {/* Faint tool icons row */}
        <View className="mb-6 flex-row items-center justify-center gap-6 opacity-10">
          <Icon icon={Hammer} color="#1F6B52" size={28} />
          <Icon icon={Droplet} color="#1F6B52" size={24} />
          <Icon icon={Wrench} color="#1F6B52" size={26} />
          <Icon icon={Zap} color="#1F6B52" size={24} />
        </View>

        <Text className="text-center font-display text-[46px] font-extrabold leading-tight text-ink">
          Unexpected{"\n"}Application Error!
        </Text>

        <Text className="mt-3 text-center text-2xl font-bold text-primary">
          404 Not Found
        </Text>

        <View className="my-5 h-[3px] w-10 self-start rounded-full bg-primary" />

        <Text className="text-sm leading-relaxed text-ink/65">
          We couldn't find the page you're looking for.{"\n"}It might have been
          moved or doesn't exist.
        </Text>

        <Pressable
          onPress={() => router.replace("/")}
          className="mt-7 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-white px-6 py-4 shadow-sm"
        >
          <Icon icon={Home} color="#1F6B52" size={18} />
          <Text className="text-xs font-bold text-primary">
            Go Back to Home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}