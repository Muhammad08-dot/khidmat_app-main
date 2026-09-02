import React from "react";
import { View, Text } from "react-native";

interface TierBadgeProps {
  tier: string;
  className?: string;
  showIcon?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  className = "",
  showIcon = true,
}) => {
  const normalizedTier = tier.trim().toLowerCase();

  let borderColor = "border-accent-gold/30";
  let textColor = "text-accent-gold";
  let letter = "B";

  switch (normalizedTier) {
    case "platinum":
      borderColor = "border-accent-sky/40 dark:border-accent-sky/60";
      textColor = "text-accent-sky";
      letter = "P";
      break;
    case "gold":
      borderColor = "border-accent-gold/40 dark:border-accent-gold/60";
      textColor = "text-accent-gold";
      letter = "G";
      break;
    case "silver":
      borderColor = "border-accent-sage/40 dark:border-accent-sage/60";
      textColor = "text-accent-sage";
      letter = "S";
      break;
    case "bronze":
    default:
      borderColor = "border-accent-terracotta/40 dark:border-accent-terracotta/60";
      textColor = "text-accent-terracotta";
      letter = "B";
      break;
  }

  return (
    <View className={`flex-row items-center gap-2 ${className}`}>
      {showIcon && (
        <View
          className={`h-8 w-8 items-center justify-center rounded-full border bg-surface-raised ${borderColor}`}
        >
          <Text className={`font-display text-[10px] font-extrabold ${textColor}`}>
            {letter}
          </Text>
        </View>
      )}
      <Text className={`text-[10px] font-bold uppercase tracking-wider ${textColor}`}>
        {tier}
      </Text>
    </View>
  );
};

export default TierBadge;
