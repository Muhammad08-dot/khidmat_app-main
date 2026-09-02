import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getDocument, 
  writeDocument 
} from '../services/firebase';
import { 
  getDistanceKm, 
  calculateTravelFeePKR, 
  estimateTravelTimeMinutes, 
  type LocationCoords 
} from '../utils/location';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  CheckCircle,
  Truck,
  FileText,
  Loader
} from 'lucide-react';

interface ProviderData {
  userId: string;
  name: string;
  category: string;
  city: string;
  location: LocationCoords;
  basePrice: number;
  rating: number;
  tier: string;
}

export const ConfirmBooking: React.FC = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get('providerId');

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Morning (9 AM - 12 PM)');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Uber/InDrive Map Pinning State
  const [jobCoordinates, setJobCoordinates] = useState<LocationCoords>({
    lat: userProfile?.location?.lat || 31.5204,
    lng: userProfile?.location?.lng || 74.3587
  });

  // Auto-request location access on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: Math.round(position.coords.latitude * 10000) / 10000,
            lng: Math.round(position.coords.longitude * 10000) / 10000
          };
          setJobCoordinates(coords);
          setLocationError(null);
          
          if (updateProfile) {
            updateProfile({ location: coords }).catch(console.error);
          }
        },
        (err) => {
          console.warn("User location permission denied or error:", err);
          setLocationError("Location access is required to book services. Please enable location permissions in your browser.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  }, []);

  // Calculate distance and fees
  const [distance, setDistance] = useState(0);
  const [travelFee, setTravelFee] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  // Date lists
  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      dates.push({
        value: futureDate.toISOString().split('T')[0],
        label: futureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        isToday: i === 0
      });
    }
    return dates;
  };
  
  const dateOptions = getDates();

  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0].value);
    }
  }, []);

  // Fetch Provider
  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId) {
        setError('No provider selected for booking.');
        setLoading(false);
        return;
      }

      try {
        const data = await getDocument('providers', providerId);
        if (data) {
          setProvider(data as ProviderData);
        } else {
          setError('Selected provider profile could not be found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch provider details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  // Update calculations when job coordinates change
  useEffect(() => {
    if (!provider || !jobCoordinates) return;
    
    const dist = getDistanceKm(
      provider.location.lat, 
      provider.location.lng, 
      jobCoordinates.lat, 
      jobCoordinates.lng
    );
    
    const fee = calculateTravelFeePKR(dist);
    setDistance(dist);
    setTravelFee(fee);
    setTotalPrice(provider.basePrice + fee);
  }, [provider, jobCoordinates]);

  // Handle Form Submit
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationError) {
      setError(locationError);
      return;
    }
    if (!selectedDate) {
      setError('Please select a booking date.');
      return;
    }
    if (!detailedAddress.trim()) {
      setError('Please enter a detailed street address so the worker can find you.');
      return;
    }

    setBookingInProgress(true);
    setError(null);

    try {
      const bookingId = 'booking_' + Math.random().toString(36).substring(2, 11);
      const bookingPayload = {
        bookingId,
        customerId: user?.uid || 'anonymous',
        customerName: userProfile?.name || 'Customer',
        customerPhone: userProfile?.phone || '',
        providerId: provider?.userId,
        providerName: provider?.name,
        providerCategory: provider?.category,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        address: detailedAddress,
        coordinates: jobCoordinates,
        notes: notes,
        status: 'pending',
        distanceKm: distance,
        basePrice: provider?.basePrice || 0,
        travelFee: travelFee,
        totalPrice: totalPrice,
        createdAt: new Date().toISOString()
      };

      // Write booking document to bookings collection
      await writeDocument('bookings', bookingId, bookingPayload);

      // Trigger success stamp modal animation
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate(`/chat?bookingId=${bookingId}`);
      }, 2600);
    } catch (err) {
      console.error(err);
      setError('Failed to book service. Please check your network and try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 flex flex-col items-center justify-center min-h-[60vh] text-ink">
        <Loader className="w-8 h-8 animate-spin text-primary mr-2" />
        <span>Loading booking details...</span>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="pt-28 px-margin-mobile text-center max-w-md mx-auto">
        <div className="bg-accent-terracotta/10 border border-accent-terracotta/20 p-lg rounded-xl text-accent-terracotta mb-lg">
          {error}
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-primary text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Providers
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <div className="flex items-center gap-md mb-lg">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-medium text-headline-lg text-ink">Confirm Booking</h1>
          <p className="text-ink/60 text-sm">Schedule &amp; pin your job location</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 space-y-lg">
          <form onSubmit={handleConfirm} className="bg-surface-raised rounded-xl shadow-soft p-lg border border-border space-y-lg">
            
            {error && (
              <div className="bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta rounded-lg p-md text-sm">
                {error}
              </div>
            )}

            {/* Date Selection */}
            <div>
              <label className="block text-sm text-ink/65 mb-md flex items-center gap-1.5 font-bold">
                <Calendar className="w-5 h-5 text-primary" />
                Select Date
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-sm">
                {dateOptions.map((date) => (
                  <button
                    key={date.value}
                    type="button"
                    onClick={() => setSelectedDate(date.value)}
                    className={`flex flex-col items-center justify-center p-sm border rounded-lg transition-all ${
                      selectedDate === date.value 
                        ? 'border-primary bg-primary/5 text-primary font-bold scale-[1.03] shadow-sm'
                        : 'border-border hover:border-ink/20 text-ink'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider">{date.isToday ? 'Today' : date.label.split(' ')[0]}</span>
                    <span className="text-lg leading-tight mt-1">{date.label.split(' ')[2] || date.label.split(' ')[1]}</span>
                    <span className="text-[10px] text-ink/40 font-medium">{date.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm text-ink/65 mb-md flex items-center gap-1.5 font-bold">
                <Clock className="w-5 h-5 text-primary" />
                Preferred Time Slot
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
                {[
                  'Morning (9 AM - 12 PM)',
                  'Afternoon (12 PM - 4 PM)',
                  'Evening (4 PM - 8 PM)'
                ].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-md text-center rounded-lg border text-sm font-semibold transition-all ${
                      selectedTimeSlot === slot
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-ink/20 text-ink'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>



            {/* Street Address */}
            <div>
              <label className="block text-sm text-ink/65 mb-xs flex items-center gap-1.5 font-bold" htmlFor="address">
                <MapPin className="w-4 h-4 text-primary" />
                Detailed Street Address
              </label>
              <input
                id="address"
                type="text"
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                className="w-full px-md py-3 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md"
                placeholder="House No, Street Address, Neighborhood Name..."
                required
              />
            </div>

            {/* Service Notes */}
            <div>
              <label className="block text-sm text-ink/65 mb-xs flex items-center gap-1.5 font-bold" htmlFor="notes">
                <FileText className="w-4 h-4 text-primary" />
                Special Instructions (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-md py-3 rounded-lg border border-border bg-surface text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md min-h-[80px]"
                placeholder="Detail what needs to be done, specific problems, tools needed, etc."
              />
            </div>

            {/* Confirm Actions */}
            <div className="pt-md border-t border-border">
              <button
                type="submit"
                disabled={bookingInProgress}
                className="w-full bg-primary text-white font-bold text-base py-4 rounded-xl shadow-soft hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {bookingInProgress ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin text-white" />
                    <span>Booking Worker...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Booking &amp; Message Worker</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Cost Breakdown & Summary Card (1/3 width on desktop) */}
        <div className="space-y-lg">
          <div className="relative bg-surface-raised rounded-2xl shadow-soft p-lg border border-border space-y-md sticky top-28 overflow-hidden">
            {/* Ambient top border light shimmer sweep */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-accent-gold/45 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

            <h2 className="font-display font-medium text-lg text-ink border-b border-border pb-sm">
              Booking Summary
            </h2>
            
            {/* Provider Mini Profile */}
            {provider && (
              <div className="flex items-center gap-md bg-surface p-md rounded-xl border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold uppercase">
                  {provider.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-ink">{provider.name}</h3>
                  <p className="text-xs text-ink/70 font-medium">{provider.category} • {provider.city}</p>
                  <p className="text-[10px] text-accent-gold font-bold">★ {provider.rating !== null && provider.rating !== undefined ? provider.rating.toFixed(1) : "New"} ({provider.tier})</p>
                </div>
              </div>
            )}

            {/* Price Calculations */}
            <div className="space-y-sm text-sm pt-sm font-sans">
              <div className="flex justify-between text-ink/75">
                <span>Base Service Rate</span>
                <span className="font-semibold text-ink">Rs. {provider?.basePrice} / hr</span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Travel Fee ({distance.toFixed(1)} km)</span>
                <span className="font-semibold text-ink">Rs. {travelFee}</span>
              </div>
              
              <div className="flex items-center gap-1 bg-accent-sky/10 text-accent-sky p-2 rounded text-[11px] font-medium leading-normal border border-accent-sky/20">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span>Travel time estimate: ~{estimateTravelTimeMinutes(distance)} mins away</span>
              </div>

              <div className="border-t border-dashed border-border my-sm pt-sm flex justify-between text-base font-bold text-ink">
                <span>Estimated Total</span>
                <span className="text-primary">Rs. {totalPrice}</span>
              </div>
            </div>

            {/* Security Guarantee Pitch */}
            <div className="bg-primary/5 border border-primary/20 p-md rounded-xl text-center space-y-xs">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Cash on Delivery</p>
              <p className="text-[11px] text-ink/75 leading-normal">
                No advanced payments required. Pay the worker in cash once the service is successfully completed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti-Free Verified Seal Stamp success overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-surface/90 dark:bg-[#0F1712]/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-lg">
            
            {/* Background Gold Flash Pulse */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 2, 2.5], opacity: [0, 0.45, 0] }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              className="absolute w-64 h-64 rounded-full bg-accent-gold blur-3xl pointer-events-none"
            />
            
            <div className="text-center space-y-lg max-w-sm relative">
              {/* Verification stamp motif wrapper */}
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-md">
                {/* Animated Stamp Seal double ring */}
                <motion.div
                  initial={{ scale: 0, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 18,
                    delay: 0.1
                  }}
                  className="absolute inset-0 rounded-full border-4 border-dashed border-accent-gold flex items-center justify-center bg-surface-raised shadow-soft"
                >
                  <div className="w-32 h-32 rounded-full border-2 border-accent-gold flex flex-col items-center justify-center text-accent-gold p-xs">
                    <span className="font-display font-extrabold text-[9px] uppercase tracking-widest leading-none mb-1">VERIFIED</span>
                    <div className="w-16 h-[1.5px] bg-accent-gold my-1" />
                    <span className="font-display font-black text-xl tracking-tight leading-none my-0.5">KHIDMAT</span>
                    <div className="w-16 h-[1.5px] bg-accent-gold my-1" />
                    <span className="font-sans font-bold text-[8px] tracking-wider leading-none mt-1">APPROVED</span>
                  </div>
                </motion.div>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="font-display text-2xl font-semibold text-ink"
              >
                Booking Confirmed!
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="text-sm text-ink/75 leading-relaxed"
              >
                Your request CNIC check was validated successfully. Redirecting you to chat with {provider?.name}...
              </motion.p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfirmBooking;
