import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { TierBadge } from './TierBadge';
import { isRTL } from '@/src/i18n';

export interface ProviderCardProps {
  id: string;
  name: string;
  category: string;
  rating?: number;
  totalJobs?: number;
  basePrice?: number;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  photoUrl?: string | null;
  onPress?: () => void;
  className?: string;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  name,
  category,
  rating = 5.0,
  totalJobs = 0,
  basePrice = 500,
  tier = 'Bronze',
  photoUrl,
  onPress,
  className = '',
}) => {
  const rtl = isRTL();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${category}, ${rating} stars, PKR ${basePrice}`}
      className={`w-full p-4 rounded-2xl bg-white border border-border mb-3 shadow-sm active:bg-gray-50 active:scale-[0.99] transition-all ${className}`}
    >
      <View className={`flex-row items-center gap-3.5 ${rtl ? 'flex-row-reverse' : ''}`}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            className="w-14 h-14 rounded-full bg-gray-100"
          />
        ) : (
          <View className="w-14 h-14 rounded-full bg-primarySoft items-center justify-center border border-primary/20">
            <Text className="text-base font-bold text-primary">
              {name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <View
            className={`flex-row items-center justify-between ${
              rtl ? 'flex-row-reverse' : ''
            }`}
          >
            <Text
              numberOfLines={1}
              className={`text-base font-bold text-gray-900 ${
                rtl ? 'text-right' : 'text-left'
              }`}
            >
              {name}
            </Text>
            <TierBadge tier={tier} />
          </View>

          <Text
            className={`text-xs text-gray-500 mt-0.5 ${
              rtl ? 'text-right' : 'text-left'
            }`}
          >
            {category}
          </Text>

          <View
            className={`flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100 ${
              rtl ? 'flex-row-reverse' : ''
            }`}
          >
            <View className={`flex-row items-center gap-1.5 ${rtl ? 'flex-row-reverse' : ''}`}>
              <Text className="text-amber-500 font-bold text-xs">★</Text>
              <Text className="text-xs font-bold text-gray-800">
                {rating.toFixed(1)}
              </Text>
              <Text className="text-[11px] text-gray-400">
                ({totalJobs} jobs)
              </Text>
            </View>

            <Text className="text-xs font-bold text-primary">
              PKR {basePrice}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};
