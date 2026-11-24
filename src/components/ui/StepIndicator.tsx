import React from 'react';
import { View, Text } from 'react-native';
import { isRTL } from '@/src/i18n';

export interface Step {
  title: string;
  subtitle?: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  const rtl = isRTL();

  return (
    <View className={`w-full py-2 ${className}`}>
      <View
        className={`flex-row items-center justify-between ${
          rtl ? 'flex-row-reverse' : ''
        }`}
      >
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={idx}>
              <View className="items-center flex-1">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center border transition-all ${
                    isDone
                      ? 'bg-primary border-primary'
                      : isCurrent
                      ? 'bg-white border-primary ring-2 ring-primary/20'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isDone
                        ? 'text-white'
                        : isCurrent
                        ? 'text-primary'
                        : 'text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className={`text-[11px] mt-1 text-center font-medium ${
                    isCurrent
                      ? 'text-primary font-bold'
                      : isDone
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </Text>
              </View>

              {idx < steps.length - 1 ? (
                <View
                  className={`h-0.5 flex-1 mx-1.5 -mt-4 transition-all ${
                    idx < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};
