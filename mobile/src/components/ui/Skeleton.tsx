import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <View className={`overflow-hidden rounded-lg bg-ink/5 dark:bg-ink/10 ${className}`}>
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 900, loop: true, repeatReverse: true }}
        style={{ flex: 1 }}
      />
    </View>
  );
};
