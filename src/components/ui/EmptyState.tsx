import React from "react";
import { View, Text, Pressable } from "react-native";
import { LucideIcon } from "lucide-react-native";

/** Props a lucide icon accepts at runtime (kept permissive to dodge the
 *  strict SvgProps typing that trips on `color`). */
interface IconProps {
  color?: string;
  size?: string | number;
  strokeWidth?: string | number;
}

interface EmptyStateProps {
  icon: LucideIcon;
  iconProps?: IconProps;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  iconProps,
}) => {
  const IconCmp = Icon as React.ComponentType<IconProps>;
  return (
    <View
      className={`mx-auto w-full max-w-md items-center justify-center space-y-4 px-6 py-12 ${className}`}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
        <IconCmp color="#1F5D3F" size={32} {...iconProps} />
      </View>
      <Text className="font-display text-xl font-semibold leading-tight text-ink">{title}</Text>
      <Text className="text-sm leading-relaxed text-ink/75 text-center">{description}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="w-full rounded-xl bg-primary px-6 py-3"
        >
          <Text className="text-center text-sm font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};
