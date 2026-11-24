import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
  },
  danger: {
    container: 'bg-red-50 border-red-200',
    text: 'text-red-700',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
  },
  neutral: {
    container: 'bg-gray-100 border-gray-200',
    text: 'text-gray-700',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  className = '',
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral;

  return (
    <View
      className={`px-2.5 py-1 rounded-full border flex-row items-center justify-center self-start ${styles.container} ${className}`}
    >
      <Text className={`text-[11px] font-semibold tracking-normal ${styles.text}`}>
        {label}
      </Text>
    </View>
  );
};
