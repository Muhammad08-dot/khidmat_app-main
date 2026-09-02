import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import { MapPin, Navigation, ShieldAlert, Sparkles } from "lucide-react-native";
import { PAKISTAN_CITIES, type LocationCoords } from "../../utils/location";
import { Icon } from "../ui/Icon";

const getEnv = (key: string): string => (process.env as any)[key] || "";

interface MapSelectorProps {
  value: LocationCoords;
  onChange: (coords: LocationCoords) => void;
  city: string;
  className?: string;
}

/** Interactive pin-drop map. Draggable marker (or tap to place). Fallback map
 *  is fully local — works offline without any Google key. */
export const MapSelector: React.FC<MapSelectorProps> = ({
  value,
  onChange,
  city,
  className = "",
}) => {
  const baseCityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES["Lahore"];
  const [container, setContainer] = useState({ width: 320, height: 240 });

  // Convert lat/lng to fractional position within the map box.
  const toFraction = (v: LocationCoords) => {
    const latDelta = v.lat - baseCityCoords.lat;
    const lngDelta = v.lng - baseCityCoords.lng;
    const fx = Math.max(0.02, Math.min(0.98, lngDelta / 0.09 + 0.5));
    const fy = Math.max(0.05, Math.min(0.95, 0.5 - latDelta / 0.07));
    return { fx, fy };
  };

  // Shared values for the marker position (fractions 0..1).
  const fx = useSharedValue(toFraction(value).fx);
  const fy = useSharedValue(toFraction(value).fy);

  useEffect(() => {
    if (baseCityCoords) {
      const { fx: nx, fy: ny } = toFraction(value);
      fx.value = nx;
      fy.value = ny;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.lat, value.lng, city]);

  const commit = (px: number, py: number) => {
    const x = px / container.width;
    const y = py / container.height;
    const latDelta = (0.5 - y) * 0.07;
    const lngDelta = (x - 0.5) * 0.09;
    const next: LocationCoords = {
      lat: Math.round((baseCityCoords.lat + latDelta) * 100000) / 100000,
      lng: Math.round((baseCityCoords.lng + lngDelta) * 100000) / 100000,
    };
    onChange(next);
  };

  const clamp = (v: number, min = 0.05, max = 0.95) =>
    Math.max(min, Math.min(max, v));

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      fx.value = clamp(e.absoluteX / container.width);
      fy.value = clamp(e.absoluteY / container.height);
    })
    .onEnd(() => {
      runOnJS(commit)(fx.value * container.width, fy.value * container.height);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    fx.value = clamp(e.absoluteX / container.width);
    fy.value = clamp(e.absoluteY / container.height);
    runOnJS(commit)(fx.value * container.width, fy.value * container.height);
  });

  const composed = Gesture.Exclusive(pan, tap);

  const markerStyle = useAnimatedStyle(() => ({
    left: fx.value * container.width - 16,
    top: fy.value * container.height - 28,
  }));

  return (
    <View className={`flex-col ${className}`}>
      <View className="mb-2 flex-row items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <Icon icon={ShieldAlert} color="#B45309" size={14} />
        <Text className="flex-1 text-xs font-medium text-amber-600">
          Map API offline. Interactive local locator active.
        </Text>
      </View>

      <View
        className="relative overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200"
        style={{ height: 240 }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== container.width) setContainer({ width, height });
        }}
      >
        {/* Grid overlay */}
        <View
          className="absolute inset-0 opacity-20"
          style={{ flexDirection: "row", flexWrap: "wrap" }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              className="border-l border-t border-slate-500"
              style={{ width: "16.66%", height: "25%" }}
            />
          ))}
        </View>

        {/* Center city label */}
        <View className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-white/40 bg-white/30 px-3 py-1">
          <Text className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Center Point
          </Text>
          <Text className="text-sm font-bold text-slate-600">{city}</Text>
        </View>

        <GestureDetector gesture={composed}>
          <View className="absolute inset-0" />
        </GestureDetector>

        {/* Marker */}
        <Animated.View
          className="absolute z-20 items-center"
          style={[markerStyle, { width: 32, height: 32 }]}
          pointerEvents="none"
        >
          <View className="absolute h-8 w-8 rounded-full border border-primary/40 bg-primary/20" />
          <View className="absolute h-2 w-2 rounded-full border border-white bg-primary" />
          <Icon icon={MapPin} color="#1F5D3F" size={32} />
        </Animated.View>

        {/* Helper tip */}
        <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5">
          <Icon icon={Sparkles} color="#1F5D3F" size={13} />
          <Text className="text-[11px] font-medium text-slate-600">
            Tap or drag to place pin
          </Text>
        </View>

        {/* Coordinates badge */}
        <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded border border-slate-200 bg-white/90 px-2 py-1">
          <Icon icon={Navigation} color="#1F5D3F" size={13} />
          <Text className="font-mono text-[10px] text-slate-500">
            Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => onChange(baseCityCoords)}
        className="mt-2 self-start rounded-lg bg-surface-raised px-3 py-1.5"
      >
        <Text className="text-[11px] font-semibold text-primary">
          Reset to {city} center
        </Text>
      </Pressable>
    </View>
  );
};

export default MapSelector;
