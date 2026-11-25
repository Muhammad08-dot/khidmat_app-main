import React, { useState } from 'react';
import { BRAND } from '@/src/theme/colors';
import { View, Text, Pressable, Platform } from 'react-native';
import { type LocationCoords } from '../../utils/location';
import { Icon } from '../ui/Icon';
import { MapPin, Navigation, RotateCw } from 'lucide-react-native';

interface LiveMapProps {
  workerCoords: (LocationCoords & { heading?: number }) | null;
  clientCoords: LocationCoords | null;
  className?: string;
  isCompleted?: boolean;
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

export const LiveMap: React.FC<LiveMapProps> = ({
  workerCoords,
  clientCoords,
  className = '',
  isCompleted = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const canUseMapLibre = Boolean(
    MapLibreGL && MapLibreGL.MapView && Platform.OS !== 'web' && !hasError
  );

  const centerLat = workerCoords?.lat || clientCoords?.lat || 31.5204;
  const centerLng = workerCoords?.lng || clientCoords?.lng || 74.3587;

  // Route GeoJSON connecting provider and client
  const routeGeoJson: any =
    workerCoords && clientCoords
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [workerCoords.lng, workerCoords.lat],
              [clientCoords.lng, clientCoords.lat],
            ],
          },
        }
      : null;

  return (
    <View
      className={`relative overflow-hidden rounded-2xl border border-border bg-slate-100 ${className}`}
      style={{ height: 280 }}
    >
      {canUseMapLibre ? (
        <MapLibreGL.MapView
          key={`maplibre-live-${retryNonce}`}
          style={{ flex: 1 }}
          mapStyle={JSON.stringify(OSM_RASTER_STYLE)}
          onDidFailLoadingMap={() => setHasError(true)}
        >
          <MapLibreGL.Camera
            centerCoordinate={[centerLng, centerLat]}
            zoomLevel={14}
            animationDuration={800}
          />

          {/* Client Destination Marker */}
          {clientCoords && (
            <MapLibreGL.PointAnnotation
              id="client-pin"
              coordinate={[clientCoords.lng, clientCoords.lat]}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <View className="h-7 w-7 rounded-full bg-red-600 border-2 border-white items-center justify-center shadow-md">
                  <Icon icon={MapPin} color="#ffffff" size={16} />
                </View>
              </View>
            </MapLibreGL.PointAnnotation>
          )}

          {/* Provider Marker */}
          {workerCoords && (
            <MapLibreGL.PointAnnotation
              id="worker-pin"
              coordinate={[workerCoords.lng, workerCoords.lat]}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <View className="h-8 w-8 rounded-full bg-primary border-2 border-white items-center justify-center shadow-lg">
                  <Icon icon={Navigation} color="#ffffff" size={16} />
                </View>
              </View>
            </MapLibreGL.PointAnnotation>
          )}

          {/* Live Connecting Route */}
          {routeGeoJson && (
            <MapLibreGL.ShapeSource id="route-source" shape={routeGeoJson}>
              <MapLibreGL.LineLayer
                id="route-layer"
                style={{
                  lineColor: BRAND.primary,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineDasharray: [2, 1],
                }}
              />
            </MapLibreGL.ShapeSource>
          )}
        </MapLibreGL.MapView>
      ) : (
        <View className="flex-1 items-center justify-center p-4 bg-slate-50">
          <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
            <Icon icon={Navigation} color={BRAND.primary} size={20} />
          </View>
          <Text className="text-xs font-semibold text-gray-800 mb-0.5">
            {isCompleted ? 'Service Completed at Location' : 'Live Tracking Active'}
          </Text>
          <Text className="text-[11px] text-gray-500 mb-3 text-center">
            {workerCoords
              ? `Provider: ${workerCoords.lat.toFixed(4)}, ${workerCoords.lng.toFixed(4)}`
              : 'Waiting for live GPS updates from provider...'}
          </Text>
          <Pressable
            onPress={() => {
              setHasError(false);
              setRetryNonce((n) => n + 1);
            }}
            className="flex-row items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 shadow-sm active:bg-gray-50"
          >
            <Icon icon={RotateCw} color={BRAND.primary} size={12} />
            <Text className="text-[11px] font-semibold text-primary">Retry live map</Text>
          </Pressable>
        </View>
      )}

      {/* Floating Status Indicator */}
      <View className="absolute top-3 right-3 rounded-full border border-border bg-white/95 px-3 py-1 shadow-sm flex-row items-center gap-1.5">
        <View
          className={`h-2 w-2 rounded-full ${
            isCompleted ? 'bg-emerald-500' : 'bg-primary'
          }`}
        />
        <Text className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
          {isCompleted ? 'Arrived' : 'In Transit'}
        </Text>
      </View>
    </View>
  );
};

export default LiveMap;
