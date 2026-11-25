import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Navigation, RefreshCw } from 'lucide-react-native';
import { BRAND } from '@/src/theme/colors';
import { Icon } from '@/src/components/ui/Icon';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  workerCoords?: Coordinates | null;
  clientCoords?: Coordinates | null;
  className?: string;
  isCompleted?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  workerCoords,
  clientCoords,
  className = '',
  isCompleted = false,
}) => {
  const [retryNonce, setRetryNonce] = useState(0);

  return (
    <View
      key={`live-map-${retryNonce}`}
      className={`relative overflow-hidden rounded-2xl border border-border bg-slate-100 ${className}`}
      style={{ height: 280 }}
    >
      <View className="flex-1 items-center justify-center p-4 bg-slate-50">
        <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
          <Icon icon={Navigation} color={BRAND.primary} size={20} />
        </View>
        <Text className="text-xs font-semibold text-gray-800 mb-0.5">
          {isCompleted ? 'Service Completed at Location' : 'Live Tracking Active'}
        </Text>
        <Text className="text-[11px] text-gray-500 mb-1 text-center">
          {workerCoords
            ? `Provider: ${workerCoords.lat.toFixed(4)}, ${workerCoords.lng.toFixed(4)}`
            : 'Waiting for live GPS updates from provider...'}
        </Text>
        {clientCoords && (
          <Text className="text-[11px] text-gray-400 mb-3 text-center">
            Destination: {clientCoords.lat.toFixed(4)}, {clientCoords.lng.toFixed(4)}
          </Text>
        )}
        <Pressable
          onPress={() => setRetryNonce((n) => n + 1)}
          className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 mt-1"
        >
          <Icon icon={RefreshCw} color={BRAND.primary} size={12} />
          <Text className="text-[11px] font-semibold text-primary">Refresh Location</Text>
        </Pressable>
      </View>

      <View className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded shadow-sm flex-row items-center gap-1">
        <View className="h-2 w-2 rounded-full bg-emerald-500" />
        <Text className="text-[10px] font-bold text-gray-700">
          {isCompleted ? 'Completed' : 'Live GPS'}
        </Text>
      </View>
    </View>
  );
};
