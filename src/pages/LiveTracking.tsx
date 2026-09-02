import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { writeDocument, listenToBookings } from '../services/firebase';
import { LiveMap } from '../components/features/LiveMap';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Compass
} from 'lucide-react';
import { getDistanceKm, estimateTravelTimeMinutes } from '../utils/location';

interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  date: string;
  timeSlot: string;
  address: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  totalPrice: number;
  basePrice: number;
  distanceKm: number;
  workerLocation?: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: string;
  };
  clientLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const LiveTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTopExpanded, setIsTopExpanded] = useState(false);
  const [isBottomExpanded, setIsBottomExpanded] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Watch position reference to clear watcher on cleanup
  const geoWatcherRef = useRef<number | null>(null);
  const simIntervalRef = useRef<any>(null);
  const previousCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch and sync booking details in real-time
  useEffect(() => {
    if (!id || !user) return;

    setLoading(true);
    // Listen to changes on the specific booking document
    const unsubscribe = listenToBookings('bookingId', id, (data) => {
      if (data && data.length > 0) {
        const activeBooking = data[0] as Booking;

        // Security check: Only customer or provider assigned can track this booking
        if (activeBooking.customerId !== user.uid && activeBooking.providerId !== user.uid) {
          setError("Unauthorized: You do not have permission to track this service.");
          setLoading(false);
          return;
        }

        setBooking(activeBooking);
        setError(null);
      } else {
        setError("Booking tracking session not found.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user]);

  // Setup GPS Location Sharing Watcher for active users
  useEffect(() => {
    if (!booking || !user) return;

    // Sharing only during active status
    const isActive = booking.status === 'confirmed' || booking.status === 'in_progress';
    if (!isActive) {
      if (geoWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatcherRef.current);
        geoWatcherRef.current = null;
      }
      return;
    }

    // Start watching position
    if (navigator.geolocation && geoWatcherRef.current === null) {
      geoWatcherRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          const timestamp = new Date().toISOString();

          // Calculate heading bearing if not provided by browser GPS
          let heading = position.coords.heading || 0;
          if (position.coords.heading === null && previousCoordsRef.current) {
            const p1 = previousCoordsRef.current;
            const dy = currentLat - p1.lat;
            const dx = currentLng - p1.lng;
            heading = Math.atan2(dy, dx) * (180 / Math.PI);
          }

          previousCoordsRef.current = { lat: currentLat, lng: currentLng };

          // Determine if user is Worker or Client to sync coordinates
          const isWorker = user.uid === booking.providerId;
          const payload = isWorker 
            ? {
                workerLocation: {
                  lat: currentLat,
                  lng: currentLng,
                  heading: heading,
                  speed: position.coords.speed || 0,
                  timestamp
                }
              }
            : {
                clientLocation: {
                  lat: currentLat,
                  lng: currentLng,
                  timestamp
                }
              };

          // Overwrite the latest coordinates in Firestore / Mock DB
          writeDocument('bookings', booking.bookingId, {
            ...booking,
            ...payload
          }).catch(err => console.error("Error updating tracking coords:", err));
        },
        (err) => {
          console.warn("Tracking GPS error or denied permissions:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (geoWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatcherRef.current);
        geoWatcherRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [booking?.status, user]);

  // Start simulated trip movement to test real-time map changes
  const startSimulation = async () => {
    if (!booking) return;
    setIsSimulating(true);

    const clientPos = booking.coordinates || { lat: 31.5204, lng: 74.3587 };
    
    // Start worker 1.2km south-west of client location
    let currentLat = clientPos.lat - 0.012;
    let currentLng = clientPos.lng - 0.012;
    
    const totalSteps = 15;
    let stepNum = 0;

    // Reset coordinates first
    await writeDocument('bookings', booking.bookingId, {
      ...booking,
      workerLocation: {
        lat: currentLat,
        lng: currentLng,
        heading: 45,
        speed: 9.5,
        timestamp: new Date().toISOString()
      }
    });

    simIntervalRef.current = setInterval(async () => {
      stepNum++;
      if (stepNum > totalSteps) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setIsSimulating(false);
        return;
      }

      // Interpolate next step closer to destination
      const fraction = stepNum / totalSteps;
      const nextLat = (clientPos.lat - 0.012) + (0.012 * fraction);
      const nextLng = (clientPos.lng - 0.012) + (0.012 * fraction);

      // Compute heading angle
      const dy = nextLat - currentLat;
      const dx = nextLng - currentLng;
      const heading = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      currentLat = nextLat;
      currentLng = nextLng;

      const payload = {
        workerLocation: {
          lat: nextLat,
          lng: nextLng,
          heading,
          speed: 9.5, // ~34 km/h
          timestamp: new Date().toISOString()
        }
      };

      try {
        await writeDocument('bookings', booking.bookingId, {
          ...booking,
          ...payload
        });
      } catch (err) {
        console.error("Simulation write error:", err);
      }
    }, 2500);
  };

  if (loading) {
    return (
      <div className="pt-28 flex flex-col items-center justify-center min-h-[60vh] text-ink">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-md" />
        <span className="text-sm font-medium text-ink/60">Initializing Live Map...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="pt-28 px-margin-mobile text-center max-w-md mx-auto">
        <div className="bg-accent-terracotta/10 border border-accent-terracotta/20 p-lg rounded-xl text-accent-terracotta mb-lg flex items-center gap-2 justify-center">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error || "Booking not found."}</span>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-primary text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Go Back
        </button>
      </div>
    );
  }

  // Tracking details
  const isWorker = user?.uid === booking.providerId;
  
  // Resolve client destination coordinates (static pinned booking coords)
  const clientCoords = booking.coordinates || { lat: 31.5204, lng: 74.3587 };
  
  // Resolve worker real-time moving coordinates
  const workerCoords = booking.workerLocation || null;

  // Calculate real-time ETA
  let distance = booking.distanceKm;
  let etaMinutes = estimateTravelTimeMinutes(distance);

  if (workerCoords) {
    // Recalculate dynamic distance and duration based on moving coords
    const liveDistance = getDistanceKm(workerCoords.lat, workerCoords.lng, clientCoords.lat, clientCoords.lng);
    distance = Number(liveDistance.toFixed(2));
    etaMinutes = estimateTravelTimeMinutes(liveDistance);
  }

  const isCompleted = booking.status === 'completed' || booking.status === 'closed';

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      
      {/* Page Header */}
      <div className="flex items-center gap-md mb-lg">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink hover:bg-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-medium text-headline-lg text-ink">Live Tracking</h1>
          <p className="text-ink/60 text-sm">
            {isCompleted 
              ? "Service complete. Location sharing has stopped." 
              : `Real-time location coordination for ${booking.providerCategory}`}
          </p>
        </div>
      </div>

      {/* Grid container with breakpoint styling (mobile vs desktop panel layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        
        {/* Left Map Display Column (takes 2/3 space on desktop, full-screen overlay on mobile) */}
        <div className="lg:col-span-2 relative min-h-[50vh] md:min-h-[60vh] rounded-2xl overflow-hidden border border-border">
          
          {/* Floating Destination card (Top) */}
          <div className="absolute top-4 left-4 right-4 z-10 max-w-md mx-auto">
            <div className="bg-[#121E16] text-white p-4 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden">
              <div className="flex justify-between items-start gap-md">
                <div className="flex gap-sm items-start">
                  <div className="w-8 h-8 rounded-full bg-accent-terracotta/20 text-accent-terracotta flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-white/50 block">Destination</span>
                    <p className="text-sm font-bold truncate max-w-[200px] md:max-w-xs">{booking.address}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTopExpanded(!isTopExpanded)}
                  className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  {isTopExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              {isTopExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-md pt-sm border-t border-white/10 text-xs text-white/70 space-y-sm font-sans"
                >
                  <p><strong>Customer:</strong> {booking.customerName}</p>
                  <p><strong>Scheduled Slot:</strong> {booking.date} • {booking.timeSlot}</p>
                  <p><strong>Service Type:</strong> {booking.providerCategory}</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Actual Live Map layer */}
          <LiveMap 
            workerCoords={workerCoords} 
            clientCoords={clientCoords} 
            isCompleted={isCompleted}
            className="absolute inset-0 w-full h-full" 
          />

          {/* Floating ETA card (Bottom) */}
          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto">
            <div className="bg-surface-raised p-4 rounded-2xl shadow-lg border border-border">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ink/40 block">ETA Estimate</span>
                    <p className="text-base font-extrabold text-ink">
                      {isCompleted ? "Arrived" : `${etaMinutes} mins away`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary px-3 py-1 rounded-full bg-primary/5 border border-primary/20">
                    {distance} km
                  </span>
                  <button 
                    onClick={() => setIsBottomExpanded(!isBottomExpanded)}
                    className="text-ink/60 hover:text-ink p-1 rounded-full hover:bg-ink/5"
                  >
                    {isBottomExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isBottomExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-md pt-sm border-t border-border text-xs text-ink/70 space-y-sm font-sans"
                >
                  <p><strong>Assigned Pro:</strong> {booking.providerName}</p>
                  <p><strong>Travel Charge:</strong> Rs. {booking.totalPrice - booking.basePrice}</p>
                  <p className="text-[10px] text-ink/40 italic">ETA is computed based on relative coordinate spacing assuming baseline driving parameters.</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Dashboard Sidebar (spans 1/3 on desktop, drops below map on mobile viewport) */}
        <div className="space-y-lg">
          
          {/* Tracking info side card */}
          <div className="bg-surface-raised border border-border p-6 rounded-2xl shadow-soft space-y-md">
            <h2 className="font-display font-medium text-lg text-ink border-b border-border pb-sm">
              Live Location Tracking
            </h2>

            {/* Sharing status indicators */}
            <div className="space-y-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-ink/75">
                <span>Tracking Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                  isCompleted 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {isCompleted ? "Closed" : "Active Tracking"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-ink/75">
                <span>Worker Coordinates:</span>
                <span className="font-mono text-[10px]">
                  {workerCoords ? `${workerCoords.lat.toFixed(4)}, ${workerCoords.lng.toFixed(4)}` : "Acquiring..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-ink/75">
                <span>Your Location:</span>
                <span className="font-mono text-[10px]">
                  {clientCoords ? `${clientCoords.lat.toFixed(4)}, ${clientCoords.lng.toFixed(4)}` : "Searching..."}
                </span>
              </div>
            </div>

            {/* In-app instructions banner */}
            <div className="bg-primary/5 border border-primary/10 p-md rounded-xl space-y-xs text-xs">
              <p className="font-bold text-primary">Location Privacy Notice</p>
              <p className="text-ink/75 leading-relaxed">
                Bi-directional coordinate tracking is only enabled while the booking is active. Sharing stops immediately upon job completion or cancellation.
              </p>
            </div>

            <div className="pt-sm space-y-sm">
              {/* Simulation trigger */}
              {!isCompleted && isWorker && (
                <button 
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className={`w-full font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-soft cursor-pointer border ${
                    isSimulating 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                      : 'bg-primary text-white hover:brightness-105 border-primary'
                  }`}
                >
                  <Compass className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>{isSimulating ? 'Simulating Movement...' : 'Simulate Worker Movement'}</span>
                </button>
              )}

              {/* Quick chat redirect banner */}
              <button 
                onClick={() => navigate(`/chat?bookingId=${booking.bookingId}`)}
                className="w-full bg-surface hover:bg-border text-ink border border-border font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-soft cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Open Booking Chat</span>
              </button>

              {/* Complete job shortcut (Worker only) */}
              {!isWorker && booking.status === 'completed' && (
                <button 
                  onClick={() => navigate('/bookings')}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-soft cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Job Completed</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveTracking;
