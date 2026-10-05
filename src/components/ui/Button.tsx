import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

type Variant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface-raised border border-border",
  outline: "border border-primary",
  ghost: "",
};

const textClasses: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-ink",
  outline: "text-primary",
  ghost: "text-primary",
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  className = "",
  disabled = false,
  loading = false,
  icon,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-6 py-3 active:scale-[0.98] ${variantClasses[variant]} ${className} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#1F5D3F"} />
      ) : (
        <>
          {icon}
          <Text className={`text-sm font-bold ${textClasses[variant]}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};
