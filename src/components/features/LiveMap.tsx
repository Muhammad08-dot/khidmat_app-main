import React, { useEffect, useRef, useState } from 'react';
import { type LocationCoords } from '../../utils/location';
import { Navigation } from 'lucide-react';

interface LiveMapProps {
  workerCoords: LocationCoords & { heading?: number } | null;
  clientCoords: LocationCoords | null;
  className?: string;
  isCompleted?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  workerCoords,
  clientCoords,
  className = '',
  isCompleted = false
}) => {
  const [googleKeyExists] = useState<boolean>(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return !!key && key !== 'your_google_maps_key_here';
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const workerMarkerRef = useRef<any>(null);
  const clientMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Dynamic Google Maps Script Loading (reuses window.google if already loaded)
  useEffect(() => {
    if (!googleKeyExists) return;

    const checkLoaded = () => {
      if ((window as any).google && (window as any).google.maps) {
        setMapLoaded(true);
        return true;
      }
      return false;
    };

    if (checkLoaded()) return;

    // Register both potential callbacks in window scope
    (window as any).initLiveTrackingMap = () => {
      setMapLoaded(true);
    };
    (window as any).initGoogleMap = () => {
      setMapLoaded(true);
    };

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initLiveTrackingMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Polling backup to catch whenever google object is populated
    const intervalId = setInterval(() => {
      if (checkLoaded()) {
        clearInterval(intervalId);
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [googleKeyExists]);

  // Handle Google Map Initialization and updates
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !(window as any).google) return;
    if (!clientCoords) return;

    const maps = (window as any).google.maps;

    // 1. Create Map if not exists
    if (!mapRef.current) {
      const map = new maps.Map(mapContainerRef.current, {
        center: { lat: clientCoords.lat, lng: clientCoords.lng },
        zoom: 14,
        disableDefaultUI: true,
        styles: [
          { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }] },
          { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }] },
          { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }] },
          { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#ffffff" }, { "width": 0.2 }] },
          { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }] },
          { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }] },
          { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }] }
        ]
      });
      mapRef.current = map;

      // Directions Polyline Renderer
      const directionsRenderer = new maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#006E2F',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      directionsRendererRef.current = directionsRenderer;
    }

    const mapInstance = mapRef.current;
    const clientPos = { lat: clientCoords.lat, lng: clientCoords.lng };

    // 2. Render Markers
    // Client Marker
    if (!clientMarkerRef.current) {
      clientMarkerRef.current = new maps.Marker({
        position: clientPos,
        map: mapInstance,
        icon: {
          path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#B91C1C',
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: '#FFFFFF'
        }
      });
    } else {
      clientMarkerRef.current.setPosition(clientPos);
    }

    if (workerCoords) {
      const workerPos = { lat: workerCoords.lat, lng: workerCoords.lng };
      
      // Worker Marker with Direction Rotation
      const heading = workerCoords.heading || 0;
      const workerIconSymbol = {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: heading,
        fillColor: '#006E2F',
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: '#FFFFFF'
      };

      if (!workerMarkerRef.current) {
        workerMarkerRef.current = new maps.Marker({
          position: workerPos,
          map: mapInstance,
          icon: workerIconSymbol
        });
      } else {
        // Smooth interpolation between coordinate changes to prevent jumping
        let currentLat = workerMarkerRef.current.getPosition().lat();
        let currentLng = workerMarkerRef.current.getPosition().lng();
        const targetLat = workerCoords.lat;
        const targetLng = workerCoords.lng;
        const steps = 60;
        let step = 0;

        const animateMarker = () => {
          if (step >= steps) {
            workerMarkerRef.current.setPosition(new maps.LatLng(targetLat, targetLng));
            return;
          }
          step++;
          currentLat += (targetLat - currentLat) / (steps - step + 1);
          currentLng += (targetLng - currentLng) / (steps - step + 1);
          workerMarkerRef.current.setPosition(new maps.LatLng(currentLat, currentLng));
          requestAnimationFrame(animateMarker);
        };
        
        animateMarker();
        workerMarkerRef.current.setIcon(workerIconSymbol);
      }

      // 3. Render Directions Routing Path
      const directionsService = new maps.DirectionsService();
      
      // Clean up previous fallback polyline if it exists
      if ((window as any).liveMapFallbackPolyline) {
        (window as any).liveMapFallbackPolyline.setMap(null);
        delete (window as any).liveMapFallbackPolyline;
      }

      directionsService.route(
        {
          origin: workerPos,
          destination: clientPos,
          travelMode: maps.TravelMode.DRIVING
        },
        (result: any, status: any) => {
          if (status === maps.DirectionsStatus.OK && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          } else {
            console.warn("Google Directions Service failed/denied, rendering fallback direct path line:", status);
            // Draw a straight fallback polyline matching green theme
            const polyline = new maps.Polyline({
              path: [workerPos, clientPos],
              geodesic: true,
              strokeColor: '#006E2F',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              map: mapInstance
            });
            (window as any).liveMapFallbackPolyline = polyline;
          }

          // ALWAYS fit bounds to keep both in view
          const bounds = new maps.LatLngBounds();
          bounds.extend(workerPos);
          bounds.extend(clientPos);
          mapInstance.fitBounds(bounds, 80);
        }
      );
    } else {
      mapInstance.setCenter(clientPos);
    }
  }, [mapLoaded, workerCoords, clientCoords]);

  // --- MOCK MAP RENDERER FOR OFFLINE / KEYLESS walk-throughs ---
  const [mockProgress, setMockProgress] = useState(0);

  // Simulates worker moving closer on mock loop when no API key exists
  useEffect(() => {
    if (googleKeyExists && mapLoaded) return;
    
    // Slowly increment progress towards client to look active
    const timer = setInterval(() => {
      setMockProgress((prev) => {
        if (isCompleted) return 1;
        if (prev >= 0.95) return 0.95; // hold close until completed
        return prev + 0.02;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [googleKeyExists, mapLoaded, isCompleted]);

  // Grid vectors for mock map matching reference screenshot styling
  if (!googleKeyExists || !mapLoaded) {
    // Start node coordinate calculations for Mock vector line path
    // Green marker is Union Coop (start), Red marker is Dubai Hills Estate (destination)
    const mockRoutePoints = [
      { x: 70, y: 310 },
      { x: 130, y: 280 },
      { x: 190, y: 260 },
      { x: 260, y: 200 },
      { x: 260, y: 130 },
      { x: 310, y: 90 }
    ];

    // Compute current position along polyline segments based on progress
    const getCoordinatesOnPath = (progress: number) => {
      if (progress <= 0) return { ...mockRoutePoints[0], heading: 0 };
      if (progress >= 1) return { ...mockRoutePoints[mockRoutePoints.length - 1], heading: 0 };

      const segmentCount = mockRoutePoints.length - 1;
      const index = Math.floor(progress * segmentCount);
      const segmentProgress = (progress * segmentCount) - index;

      const p1 = mockRoutePoints[index];
      const p2 = mockRoutePoints[index + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Compute heading angle in degrees
      const angleRad = Math.atan2(dy, dx);
      let heading = angleRad * (180 / Math.PI) + 90; // offset arrow orientation

      return {
        x: p1.x + dx * segmentProgress,
        y: p1.y + dy * segmentProgress,
        heading
      };
    };

    const currentPos = getCoordinatesOnPath(mockProgress);
    const destination = mockRoutePoints[mockRoutePoints.length - 1];

    return (
      <div className={`relative bg-[#EAEBE6] rounded-2xl overflow-hidden shadow-inner border border-border select-none flex items-center justify-center ${className}`}>
        
        {/* Mock Map Vector Graphics Layout */}
        <svg viewBox="0 0 400 400" className="w-full h-full text-ink/10 opacity-90">
          {/* Subtle Grid Roads Background */}
          <path d="M 0,50 L 400,50 M 0,150 L 400,150 M 0,250 L 400,250 M 0,350 L 400,350" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M 50,0 L 50,400 M 150,0 L 150,400 M 250,0 L 250,400 M 350,0 L 350,400" stroke="white" strokeWidth="6" strokeLinecap="round" />
          
          {/* Diagnostic Diagonal Landmark Road */}
          <path d="M 0,350 L 350,0" stroke="white" strokeWidth="8" strokeLinecap="round" />
          <path d="M 120,400 L 400,120" stroke="white" strokeWidth="5" strokeLinecap="round" />

          {/* Area Landmark Labels */}
          <text x="20" y="30" className="fill-ink/20 font-bold text-[8px] uppercase tracking-wider font-sans">Dubai Hills Mall</text>
          <text x="240" y="300" className="fill-ink/20 font-bold text-[8px] uppercase tracking-wider font-sans">Al Barsha South</text>
          <text x="310" y="220" className="fill-ink/20 font-bold text-[8px] uppercase tracking-wider font-sans">Villa 533</text>
          
          {/* Route path line matching the screenshot green color */}
          <path
            d={`M ${mockRoutePoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#10B981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-[dash_4s_linear_infinite]"
            style={{
              strokeDasharray: '8, 4'
            }}
          />

          {/* Destination Marker (Red pin) */}
          <g transform={`translate(${destination.x}, ${destination.y - 10})`}>
            <circle cx="0" cy="0" r="4" className="fill-accent-terracotta" />
            <path d="M-6,-6 L6,-6 L0,10 Z" className="fill-accent-terracotta" />
            <circle cx="0" cy="-6" r="3" className="fill-white" />
          </g>

          {/* Client Destination Pulsing Radar Halo */}
          <circle cx={destination.x} cy={destination.y} r="14" fill="none" stroke="#EF4444" strokeWidth="1.5" className="animate-ping" style={{ transformOrigin: `${destination.x}px ${destination.y}px` }} />

          {/* Worker Arrow Driver Icon (Green Circle with rotating arrow) */}
          <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
            <circle cx="0" cy="0" r="16" fill="rgba(16,185,129,0.2)" className="animate-pulse" />
            <circle cx="0" cy="0" r="11" fill="#10B981" stroke="white" strokeWidth="2" />
            <g transform={`rotate(${currentPos.heading || 0})`}>
              <path d="M-4,3 L0,-7 L4,3 L0,0 Z" fill="white" />
            </g>
          </g>
        </svg>

        {/* Muted compass HUD indicator in corner */}
        <div className="absolute top-4 right-4 bg-surface-raised border border-border p-2 rounded-full shadow-soft text-ink/75">
          <Navigation className="w-4 h-4 transform -rotate-45" />
        </div>
      </div>
    );
  }

  // Real Google Maps container
  return (
    <div 
      ref={mapContainerRef} 
      className={`rounded-2xl overflow-hidden border border-border bg-surface-raised shadow-soft ${className}`}
      style={{ minHeight: '300px' }}
    />
  );
};
