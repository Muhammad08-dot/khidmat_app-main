import React, { useState } from 'react';
import {
  Text,
  TextInput,
  View,
  TextInputProps,
  Pressable,
} from 'react-native';
import { colors } from '@/src/theme/tokens';
import { isRTL } from '@/src/i18n';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onTrailingPress?: () => void;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePassword?: () => void;
  testID?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerClassName = '',
  className = '',
  leadingIcon,
  trailingIcon,
  onTrailingPress,
  showPasswordToggle,
  isPasswordVisible,
  onTogglePassword,
  testID,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const rtl = isRTL();

  return (
    <View className={`w-full ${containerClassName}`}>
      {label ? (
        <Text
          className={`mb-1.5 text-xs font-medium text-gray-700 ${
            rtl ? 'text-right' : 'text-left'
          }`}
        >
          {label}
        </Text>
      ) : null}

      <View
        className={`w-full min-h-[52px] flex-row items-center rounded-xl bg-white px-3.5 border transition-all ${
          error
            ? 'border-danger'
            : isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border'
        }`}
      >
        {leadingIcon ? (
          <View className={`${rtl ? 'ml-2.5' : 'mr-2.5'} items-center justify-center`}>
            {leadingIcon}
          </View>
        ) : null}

        <TextInput
          testID={testID}
          placeholderTextColor="#9CA3AF"
          underlineColorAndroid="transparent"
          style={{
            textAlign: rtl ? 'right' : 'left',
          }}
          className={`flex-1 text-sm text-gray-900 py-3 ${className}`}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={onTogglePassword}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className={`${rtl ? 'mr-2' : 'ml-2'} p-1`}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Text className="text-xs font-semibold text-primary">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : trailingIcon ? (
          <Pressable
            onPress={onTrailingPress}
            disabled={!onTrailingPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className={`${rtl ? 'mr-2' : 'ml-2'}`}
          >
            {trailingIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          className={`mt-1 text-xs font-medium text-danger ${
            rtl ? 'text-right' : 'text-left'
          }`}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          className={`mt-1 text-xs text-gray-500 ${
            rtl ? 'text-right' : 'text-left'
          }`}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};
