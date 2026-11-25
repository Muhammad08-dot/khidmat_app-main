import React, { useState, useEffect } from 'react';
import { BRAND } from '@/src/theme/colors';
import { View, Text, Pressable, Platform } from 'react-native';
import { Icon } from '../ui/Icon';
import { MapPin, Navigation, Sparkles, RotateCw } from 'lucide-react-native';
import { PAKISTAN_CITIES, type LocationCoords } from '../../utils/location';

interface MapSelectorProps {
  value: LocationCoords;
  onChange: (coords: LocationCoords) => void;
  city: string;
  className?: string;
}

export const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native');
  if (MapLibreGL?.setAccessToken) {
    MapLibreGL.setAccessToken(null);
  }
} catch {
  MapLibreGL = null;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
  value,
  onChange,
  city,
  className = '',
}) => {
  const baseCityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES['Lahore'];
  const [hasError, setHasError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const canUseMapLibre = Boolean(
    MapLibreGL && MapLibreGL.MapView && Platform.OS !== 'web' && !hasError
  );

  return (
    <View className={`flex-col ${className}`}>
      <View
        className="relative overflow-hidden rounded-2xl border border-border bg-slate-100"
        style={{ height: 250 }}
      >
        {canUseMapLibre ? (
          <MapLibreGL.MapView
            key={`maplibre-selector-${retryNonce}`}
            style={{ flex: 1 }}
            mapStyle={JSON.stringify(OSM_RASTER_STYLE)}
            onPress={(feature: any) => {
              const coords = feature?.geometry?.coordinates;
              if (coords && coords.length >= 2) {
                onChange({
                  lat: Number(coords[1].toFixed(5)),
                  lng: Number(coords[0].toFixed(5)),
                });
              }
            }}
            onDidFailLoadingMap={() => setHasError(true)}
          >
            <MapLibreGL.Camera
              centerCoordinate={[value.lng || baseCityCoords.lng, value.lat || baseCityCoords.lat]}
              zoomLevel={13}
              animationDuration={500}
            />
            <MapLibreGL.PointAnnotation
              id="selected-pin"
              coordinate={[value.lng || baseCityCoords.lng, value.lat || baseCityCoords.lat]}
              draggable
              onDragEnd={(payload: any) => {
                const coords = payload?.geometry?.coordinates;
                if (coords && coords.length >= 2) {
                  onChange({
                    lat: Number(coords[1].toFixed(5)),
                    lng: Number(coords[0].toFixed(5)),
                  });
                }
              }}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={MapPin} color={BRAND.primary} size={32} />
              </View>
            </MapLibreGL.PointAnnotation>
          </MapLibreGL.MapView>
        ) : (
          <View className="flex-1 items-center justify-center p-4 bg-slate-50">
            <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
              <Icon icon={MapPin} color={BRAND.primary} size={20} />
            </View>
            <Text className="text-xs font-semibold text-gray-800 mb-0.5">
              Interactive Map Pin
            </Text>
            <Text className="text-[11px] text-gray-500 mb-3 text-center">
              Target Location: {city} ({value.lat.toFixed(4)}, {value.lng.toFixed(4)})
            </Text>
            <Pressable
              onPress={() => {
                setHasError(false);
                setRetryNonce((n) => n + 1);
              }}
              className="flex-row items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 shadow-sm active:bg-gray-50"
            >
              <Icon icon={RotateCw} color={BRAND.primary} size={12} />
              <Text className="text-[11px] font-semibold text-primary">Retry map</Text>
            </Pressable>
          </View>
        )}

        {/* Top Floating Helper */}
        <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-lg border border-border bg-white/95 px-3 py-1.5 shadow-sm">
          <Icon icon={Sparkles} color={BRAND.primary} size={13} />
          <Text className="text-[11px] font-medium text-gray-700">Tap or drag pin to adjust</Text>
        </View>

        {/* Bottom Floating Coordinate Badge */}
        <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-md border border-border bg-white/95 px-2.5 py-1 shadow-sm">
          <Icon icon={Navigation} color={BRAND.primary} size={12} />
          <Text className="font-mono text-[10px] text-gray-600">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onChange(baseCityCoords)}
        className="mt-2.5 self-start rounded-lg bg-surface-raised px-3 py-1.5 border border-border"
      >
        <Text className="text-[11px] font-semibold text-primary">
          Reset to {city} Center
        </Text>
      </Pressable>
    </View>
  );
};

export default MapSelector;
