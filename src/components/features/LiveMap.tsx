import React, { useEffect, useState } from "react";
import { BRAND } from "@/src/theme/colors";
import { View, Text } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import { Navigation } from "lucide-react-native";
import { type LocationCoords } from "../../utils/location";
import { Icon } from "../ui/Icon";

const getEnv = (key: string): string => (process.env as any)[key] || "";

interface LiveMapProps {
  workerCoords: (LocationCoords & { heading?: number }) | null;
  clientCoords: LocationCoords | null;
  className?: string;
  isCompleted?: boolean;
}

/** Whether a real Google Maps API key is configured. */
const hasRealMapKey = (): boolean => {
  const key = getEnv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
  return !!key && key !== "your_google_maps_key_here";
};

// Lazy-load real maps only when a key is configured (keeps Expo Go happy).
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
(function tryLoadRealMap() {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default ?? maps;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
  } catch {
    MapView = null;
  }
})();
const realMapAvailable = () => hasRealMapKey() && !!MapView;

/** Mock map grid route — mirrors the web reference screenshot styling. */
const MOCK_ROUTE_POINTS = [
  { x: 70, y: 310 },
  { x: 130, y: 280 },
  { x: 190, y: 260 },
  { x: 260, y: 200 },
  { x: 260, y: 130 },
  { x: 310, y: 90 },
];

const posOnPath = (progress: number) => {
  if (progress <= 0) return { ...MOCK_ROUTE_POINTS[0], heading: 0 };
  if (progress >= 1) {
    return { ...MOCK_ROUTE_POINTS[MOCK_ROUTE_POINTS.length - 1], heading: 0 };
  }
  const segCount = MOCK_ROUTE_POINTS.length - 1;
  const index = Math.floor(progress * segCount);
  const segProgress = progress * segCount - index;
  const p1 = MOCK_ROUTE_POINTS[index];
  const p2 = MOCK_ROUTE_POINTS[index + 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angleRad = Math.atan2(dy, dx);
  const heading = angleRad * (180 / Math.PI) + 90;
  return {
    x: p1.x + dx * segProgress,
    y: p1.y + dy * segProgress,
    heading,
  };
};

const MockMap: React.FC<{ progress: number; isCompleted: boolean }> = ({
  progress,
  isCompleted,
}) => {
  const current = posOnPath(progress);
  const dest = MOCK_ROUTE_POINTS[MOCK_ROUTE_POINTS.length - 1];
  const routeD = `M ${MOCK_ROUTE_POINTS.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <View className="relative overflow-hidden rounded-2xl border border-border bg-[#EAEBE6]">
      <Svg viewBox="0 0 400 400" width="100%" height={300}>
        {/* Roads */}
        <Path d="M 0,50 L 400,50 M 0,150 L 400,150 M 0,250 L 400,250 M 0,350 L 400,350" stroke="#ffffff" strokeWidth={6} />
        <Path d="M 50,0 L 50,400 M 150,0 L 150,400 M 250,0 L 250,400 M 350,0 L 350,400" stroke="#ffffff" strokeWidth={6} />
        <Path d="M 0,350 L 350,0" stroke="#ffffff" strokeWidth={8} />
        <Path d="M 120,400 L 400,120" stroke="#ffffff" strokeWidth={5} />
        {/* Landmark labels */}
        <SvgText x={20} y={30} fill="#0f172a33" fontSize={8} fontWeight="700" letterSpacing={1}>
          {"DUBAI HILLS MALL"}
        </SvgText>
        <SvgText x={240} y={300} fill="#0f172a33" fontSize={8} fontWeight="700" letterSpacing={1}>
          {"AL BARSHA SOUTH"}
        </SvgText>
        <SvgText x={310} y={220} fill="#0f172a33" fontSize={8} fontWeight="700" letterSpacing={1}>
          {"VILLA 533"}
        </SvgText>
        {/* Route path */}
        <Path d={routeD} fill="none" stroke={BRAND.success} strokeWidth={5} strokeLinecap="round" strokeDasharray="8,4" />
        {/* Destination pin */}
        <G translateX={dest.x} translateY={dest.y - 10}>
          <Path d="M-6,-6 L6,-6 L0,10 Z" fill={BRAND.caution} />
          <Circle cx={0} cy={-6} r={3} fill="#ffffff" />
        </G>
        <Circle cx={dest.x} cy={dest.y} r={14} fill="none" stroke={BRAND.danger} strokeWidth={1.5} />
        {/* Worker marker */}
        <G translateX={current.x} translateY={current.y}>
          <Circle cx={0} cy={0} r={16} fill="rgba(16,185,129,0.2)" />
          <Circle cx={0} cy={0} r={11} fill={BRAND.success} stroke="#fff" strokeWidth={2} />
        </G>
        {/* Worker heading arrow */}
        <G translateX={current.x - 4} translateY={current.y - 7}>
          <G rotation={current.heading} origin="4, 7">
            <Path d="M-4,3 L0,-7 L4,3 L0,0 Z" fill="#ffffff" />
          </G>
        </G>
      </Svg>
      {/* Compass HUD */}
      <View className="absolute right-4 top-4 rounded-full border border-border bg-surface-raised p-2 shadow-soft">
        <Icon icon={Navigation} color={BRAND.primary} size={16} />
      </View>
    </View>
  );
};

export const LiveMap: React.FC<LiveMapProps> = ({
  workerCoords,
  clientCoords,
  className = "",
  isCompleted = false,
}) => {
  const realMap = realMapAvailable();
  const [mockProgress, setMockProgress] = useState(0);

  // Simulate worker movement when no real map is available or when live coords
  // haven't arrived yet — makes the tracking screen feel alive.
  useEffect(() => {
    if (realMap && clientCoords && workerCoords) return;
    const timer = setInterval(() => {
      setMockProgress((prev) => {
        if (isCompleted) return 1;
        if (prev >= 0.95) return 0.95;
        return prev + 0.03;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [realMap, clientCoords, workerCoords, isCompleted]);

  if (realMap && MapView) {
    const center = clientCoords || workerCoords || { lat: 31.52, lng: 74.35 };
    return (
      <View className={`overflow-hidden rounded-2xl border border-border ${className}`} style={{ height: 300 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {clientCoords && (
            <Marker coordinate={{ latitude: clientCoords.lat, longitude: clientCoords.lng }} pinColor="#B91C1C" />
          )}
          {workerCoords && (
            <Marker
              coordinate={{ latitude: workerCoords.lat, longitude: workerCoords.lng }}
              pinColor="#006E2F"
              title={isCompleted ? "Arrived" : "Provider"}
            />
          )}
          {clientCoords && workerCoords && (
            <Polyline
              coordinates={[
                { latitude: workerCoords.lat, longitude: workerCoords.lng },
                { latitude: clientCoords.lat, longitude: clientCoords.lng },
              ]}
              strokeColor="#006E2F"
              strokeWidth={5}
            />
          )}
        </MapView>
      </View>
    );
  }

  return <MockMap progress={mockProgress} isCompleted={isCompleted} />;
};

export default LiveMap;
