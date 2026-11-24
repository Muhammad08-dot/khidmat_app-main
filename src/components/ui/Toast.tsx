import React from 'react';
import { View, Text } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  visible?: boolean;
  className?: string;
}

const typeStyles: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-600',
    text: 'text-white',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-600',
    text: 'text-white',
    icon: '⚠',
  },
  info: {
    bg: 'bg-gray-800',
    text: 'text-white',
    icon: 'ℹ',
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible = true,
  className = '',
}) => {
  if (!visible) return null;

  const style = typeStyles[type] || typeStyles.info;

  return (
    <View
      className={`px-4 py-3 rounded-xl flex-row items-center gap-2.5 shadow-lg ${style.bg} ${className}`}
    >
      <Text className="text-white text-sm font-bold">{style.icon}</Text>
      <Text className={`text-xs font-medium flex-1 ${style.text}`}>
        {message}
      </Text>
    </View>
  );
};
