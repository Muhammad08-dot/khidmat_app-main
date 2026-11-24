import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { colors } from '@/src/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  testID?: string;
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string; indicatorColor: string }
> = {
  primary: {
    container: 'bg-primary border border-primary active:bg-primaryHover',
    text: 'text-white',
    indicatorColor: '#FFFFFF',
  },
  secondary: {
    container: 'bg-white border border-border active:bg-gray-50',
    text: 'text-ink',
    indicatorColor: colors.primary,
  },
  outline: {
    container: 'bg-transparent border border-primary active:bg-primarySoft',
    text: 'text-primary',
    indicatorColor: colors.primary,
  },
  ghost: {
    container: 'bg-transparent active:bg-gray-100',
    text: 'text-primary',
    indicatorColor: colors.primary,
  },
  danger: {
    container: 'bg-danger border border-danger active:opacity-90',
    text: 'text-white',
    indicatorColor: '#FFFFFF',
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  testID,
}) => {
  const currentVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-[48px] px-5 py-3 rounded-xl flex-row items-center justify-center gap-2 active:scale-[0.98] transition-all ${
        fullWidth ? 'w-full' : ''
      } ${currentVariant.container} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.indicatorColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? <View>{icon}</View> : null}
          <Text
            className={`text-sm font-semibold tracking-normal text-center ${currentVariant.text}`}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? <View>{icon}</View> : null}
        </>
      )}
    </Pressable>
  );
};
