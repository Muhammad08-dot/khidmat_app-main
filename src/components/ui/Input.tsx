import React from "react";
import { Text, TextInput, View, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClassName = "",
  className = "",
  ...props
}) => {
  return (
    <View className={`w-full space-y-1.5 ${containerClassName}`}>
      {label && <Text className="text-xs font-semibold text-ink/70">{label}</Text>}
      <TextInput
        placeholderTextColor="rgba(20,35,28,0.4)"
        className={`rounded-xl border border-border bg-surface-raised px-4 py-3 text-ink ${error ? "border-error" : ""} ${className}`}
        {...props}
      />
      {error && <Text className="text-xs text-error">{error}</Text>}
    </View>
  );
};
