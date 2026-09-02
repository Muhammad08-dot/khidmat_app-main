import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import { PAKISTAN_CITIES, type LocationCoords } from '../../utils/location';

interface MapSelectorProps {
  value: LocationCoords;
  onChange: (coords: LocationCoords) => void;
  city: string;
  className?: string;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
  value,
  onChange,
  city,
  className = ''
}) => {
  const [googleKeyExists] = useState<boolean>(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return !!key && key !== 'your_google_maps_key_here';
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const googleMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Dynamic Google Maps Script Loading
  useEffect(() => {
    if (!googleKeyExists) return;

    // Check if script is already loaded
    if ((window as any).google && (window as any).google.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setLoadError(true);
      };
      document.head.appendChild(script);
    }

    // Set callback
    (window as any).initGoogleMap = () => {
      setMapLoaded(true);
    };

    return () => {
      // Clean up callback if component unmounts before load completes
      if ((window as any).initGoogleMap) {
        delete (window as any).initGoogleMap;
      }
    };
  }, [googleKeyExists]);

  // Google Maps Instance initialization
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !(window as any).google) return;

    const maps = (window as any).google.maps;
    const center = { lat: value.lat, lng: value.lng };

    // Create Map
    const map = new maps.Map(googleMapRef.current, {
      center: center,
      zoom: 14,
      mapId: 'DEMO_MAP_ID', // Optional but keeps warning away in newer versions
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    mapInstanceRef.current = map;

    // Create Draggable Marker
    const marker = new maps.Marker({
      position: center,
      map: map,
      draggable: true,
      animation: maps.Animation.DROP
    });
    markerInstanceRef.current = marker;

    // Add drag listener
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        onChange({
          lat: position.lat(),
          lng: position.lng()
        });
      }
    });

    // Add map click listener to place pin
    map.addListener('click', (event: any) => {
      const clickedLocation = event.latLng;
      if (clickedLocation) {
        marker.setPosition(clickedLocation);
        onChange({
          lat: clickedLocation.lat(),
          lng: clickedLocation.lng()
        });
      }
    });
  }, [mapLoaded]);

  // Handle center updates (e.g. when city dropdown changes in the form)
  useEffect(() => {
    const cityCoords = PAKISTAN_CITIES[city];
    if (!cityCoords) return;

    // Check if the current value is far from the new city coords (meaning we swapped cities)
    const distanceThreshold = 0.5; // roughly degrees
    const isFar = 
      Math.abs(value.lat - cityCoords.lat) > distanceThreshold || 
      Math.abs(value.lng - cityCoords.lng) > distanceThreshold;

    if (isFar) {
      onChange(cityCoords);
    }
  }, [city]);

  // Pan Google Map when coordinates change externally (like switching cities)
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current && (window as any).google) {
      const center = { lat: value.lat, lng: value.lng };
      mapInstanceRef.current.panTo(center);
      markerInstanceRef.current.setPosition(center);
    }
  }, [value]);

  // --- MOCK INTERACTIVE MAP FALLBACK IMPLEMENTATION ---
  const mockContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = false;
  const [mockMarkerPos, setMockMarkerPos] = useState({ x: 150, y: 100 });

  // Map center coordinates based on the selected city
  const baseCityCoords = PAKISTAN_CITIES[city] || PAKISTAN_CITIES['Lahore'];

  // Handle click on mock map to place marker
  const handleMockMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockContainerRef.current || isDragging) return;
    const rect = mockContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateCoordsFromMockPixels(x, y, rect.width, rect.height);
  };

  const updateCoordsFromMockPixels = (x: number, y: number, width: number, height: number) => {
    setMockMarkerPos({ x, y });

    // Center is 0 delta. Map size stretches +/- 0.04 degrees (~4-5 km radius)
    const latDelta = -((y - height / 2) / (height / 2)) * 0.035;
    const lngDelta = ((x - width / 2) / (width / 2)) * 0.045;

    onChange({
      lat: Math.round((baseCityCoords.lat + latDelta) * 100000) / 100000,
      lng: Math.round((baseCityCoords.lng + lngDelta) * 100000) / 100000
    });
  };

  // Sync mock marker pixel position back when value (coordinates) change externally
  useEffect(() => {
    if (googleKeyExists && mapLoaded && !loadError) return; // ignore if Google Map is showing
    if (!mockContainerRef.current) return;

    const rect = mockContainerRef.current.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 200;

    const latDelta = value.lat - baseCityCoords.lat;
    const lngDelta = value.lng - baseCityCoords.lng;

    const x = (lngDelta / 0.045) * (width / 2) + width / 2;
    const y = -(latDelta / 0.035) * (height / 2) + height / 2;

    setMockMarkerPos({
      x: Math.max(10, Math.min(width - 10, x)),
      y: Math.max(10, Math.min(height - 10, y))
    });
  }, [value, city, mapLoaded, loadError]);

  return (
    <div className={`flex flex-col ${className}`}>
      {googleKeyExists && !loadError ? (
        <div className="relative rounded-xl overflow-hidden shadow-soft border border-outline-variant/40 dark:border-[#334155] bg-surface-container-lowest dark:bg-[#1E293B] h-64 md:h-72">
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 space-y-md">
              <Compass className="w-8 h-8 text-primary dark:text-primary-fixed animate-spin" />
              <span className="font-label-md text-on-surface-variant dark:text-slate-400">Loading Google Maps...</span>
            </div>
          )}
          <div ref={googleMapRef} className="w-full h-full" />
          <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 text-[10px] text-on-surface-variant dark:text-slate-400 py-1 px-2 rounded border border-outline-variant/30 backdrop-blur-sm font-mono z-10 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            GPS: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </div>
        </div>
      ) : (
        /* Dynamic High-End Interactive Mock Map Fallback */
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs mb-sm font-medium bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>Map API offline. Interactive local locator active.</span>
          </div>

          <div 
            ref={mockContainerRef}
            onClick={handleMockMapClick}
            className="relative rounded-xl overflow-hidden shadow-soft border border-outline-variant/40 dark:border-[#334155] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 h-64 md:h-72 cursor-crosshair select-none"
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-20 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-t border-l border-on-surface dark:border-white"></div>
              ))}
            </div>

            {/* Pakistan / Local Topography Stylized SVGs */}
            <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
              <svg className="w-48 h-48 text-primary dark:text-primary-fixed" viewBox="0 0 100 100" fill="currentColor">
                <path d="M40 10 Q50 30 70 40 T90 80 Q60 90 30 80 T10 40 Z" />
              </svg>
            </div>

            {/* Radar Scan Effect */}
            <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-5 dark:opacity-20 animate-pulse"></div>

            {/* Center City Label Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center bg-white/20 dark:bg-slate-900/20 border border-white/10 px-3 py-1 rounded-full backdrop-blur-[2px]">
              <span className="text-[10px] text-on-surface-variant/40 dark:text-slate-400/40 uppercase tracking-widest font-semibold font-mono block">Center Point</span>
              <span className="text-sm font-bold text-on-surface-variant/80 dark:text-slate-300">{city}</span>
            </div>

            {/* Animated Pin Drop marker */}
            <motion.div 
              style={{ left: mockMarkerPos.x, top: mockMarkerPos.y }}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-20"
              animate={{ scale: isDragging ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Pulse effect */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/20 dark:bg-primary-fixed/20 border border-primary/40 dark:border-primary-fixed/40 animate-ping"></div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary dark:bg-primary-fixed border border-white dark:border-slate-900"></div>

              {/* Pin */}
              <MapPin className="w-8 h-8 text-primary dark:text-primary-fixed drop-shadow-lg filter -translate-y-1" />
            </motion.div>

            {/* Helper tips overlay */}
            <div className="absolute top-3 left-3 bg-white/80 dark:bg-slate-900/80 py-1.5 px-3 rounded-lg border border-outline-variant/30 backdrop-blur-sm shadow-sm text-[11px] text-on-surface-variant dark:text-slate-300 font-medium flex items-center gap-1.5 pointer-events-none">
              <Sparkles className="w-3.5 h-3.5 text-primary dark:text-primary-fixed animate-pulse" />
              Click anywhere to place pin drop
            </div>

            {/* Coordinates Badge */}
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 text-[10px] text-on-surface-variant dark:text-slate-400 py-1 px-2 rounded border border-outline-variant/30 backdrop-blur-sm font-mono z-10 shadow-sm flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-primary dark:text-primary-fixed rotate-45" />
              Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSelector;
