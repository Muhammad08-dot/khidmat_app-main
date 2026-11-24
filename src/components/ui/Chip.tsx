import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  className?: string;
  testID?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  className = '',
  testID,
}) => {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border transition-all ${
        selected
          ? 'bg-emerald-50 border-primary'
          : 'bg-white border-gray-200 active:bg-gray-50'
      } ${className}`}
    >
      {icon ? <View>{icon}</View> : null}
      <Text
        className={`text-xs font-medium ${
          selected ? 'text-primary font-bold' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};
