import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { BRAND } from '@/src/theme/colors';
import { Icon } from '@/src/components/ui/Icon';
import { PAKISTAN_CITIES } from '@/src/utils/location';

interface Coordinates {
  lat: number;
  lng: number;
}

interface MapSelectorProps {
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
  city: string;
  className?: string;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
  value,
  onChange,
  city,
  className = '',
}) => {
  const baseCityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES['Lahore'];
  const [retryNonce, setRetryNonce] = useState(0);

  return (
    <View key={`map-selector-${retryNonce}`} className={`flex-col ${className}`}>
      <View
        className="relative overflow-hidden rounded-2xl border border-border bg-slate-100"
        style={{ height: 250 }}
      >
        <View className="flex-1 items-center justify-center p-4 bg-slate-50">
          <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
            <Icon icon={MapPin} color={BRAND.primary} size={20} />
          </View>
          <Text className="text-xs font-semibold text-gray-800 mb-0.5">
            Selected Service Location
          </Text>
          <Text className="text-[11px] text-gray-500 mb-3 text-center">
            {city} ({(value.lat || baseCityCoords.lat).toFixed(4)},{' '}
            {(value.lng || baseCityCoords.lng).toFixed(4)})
          </Text>
          <Pressable
            onPress={() => {
              onChange({ lat: baseCityCoords.lat, lng: baseCityCoords.lng });
              setRetryNonce((n) => n + 1);
            }}
            className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5"
          >
            <Icon icon={RefreshCw} color={BRAND.primary} size={12} />
            <Text className="text-[11px] font-semibold text-primary">Center on {city}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
