import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { isRTL } from '@/src/i18n';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  testID?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  testID,
}: SegmentedControlProps<T>) {
  const rtl = isRTL();

  return (
    <View
      testID={testID}
      className={`w-full p-1.5 bg-gray-100 rounded-xl flex-row items-center justify-between border border-border ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;

        return (
          <Pressable
            key={opt.value}
            testID={`segment-${opt.value}`}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            className={`flex-1 py-2.5 px-3 rounded-lg flex-row items-center justify-center gap-2 transition-all ${
              isSelected
                ? 'bg-white shadow-sm border border-gray-200'
                : 'bg-transparent'
            }`}
          >
            {opt.icon ? <View>{opt.icon}</View> : null}
            <View className="items-center">
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? 'text-primary' : 'text-gray-600'
                }`}
              >
                {opt.label}
              </Text>
              {opt.sublabel ? (
                <Text
                  className={`text-[10px] mt-0.5 ${
                    isSelected ? 'text-primary/80' : 'text-gray-500'
                  }`}
                >
                  {opt.sublabel}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
