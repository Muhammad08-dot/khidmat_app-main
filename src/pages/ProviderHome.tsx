import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { queryCollectionDocs, writeDocument } from '../services/firebase';
import { Card, EmptyState, Avatar } from '../components/ui/SharedUI';
import { TierBadge } from '../components/ui/TierBadge';
import { motion } from 'framer-motion';
import { 
  Star, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  DollarSign, 
  Briefcase,
  Clock
} from 'lucide-react';

export const ProviderHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateProfile } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [togglingLocation, setTogglingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const data = await queryCollectionDocs('bookings', 'providerId', '==', user.uid);
      setBookings(data);
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  if (!userProfile) return null;

  const isOnline = userProfile.available === true;

  const handleToggleOnline = async () => {
    if (!user) return;
    setTogglingLocation(true);
    setLocationError(null);

    if (!isOnline) {
      // Prompt for geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              lat: Math.round(position.coords.latitude * 10000) / 10000,
              lng: Math.round(position.coords.longitude * 10000) / 10000
            };
            try {
              await updateProfile({ available: true, location: coords });
              setLocationError(null);
            } catch (err) {
              console.error("Failed to update profile to online:", err);
              setLocationError("Failed to update online status. Please check connection.");
            } finally {
              setTogglingLocation(false);
            }
          },
          (err) => {
            console.error("Geolocation error:", err);
            setLocationError("Location access is required to go Online. Please enable location permissions in your browser.");
            setTogglingLocation(false);
          }
        );
      } else {
        setLocationError("Geolocation is not supported by your browser.");
        setTogglingLocation(false);
      }
    } else {
      // Toggle offline
      try {
        await updateProfile({ available: false });
        setLocationError(null);
      } catch (err) {
        console.error("Failed to update profile to offline:", err);
      } finally {
        setTogglingLocation(false);
      }
    }
  };

  const handleAcceptBooking = async (booking: any) => {
    try {
      const updatedBooking = { ...booking, status: 'confirmed' };
      
      await Promise.all([
        writeDocument('bookings', booking.bookingId, updatedBooking),
        writeDocument(`bookings/${booking.bookingId}/messages`, `sys_${Date.now()}`, {
          senderId: 'system',
          senderName: 'System',
          text: 'The provider has accepted the request and confirmed the booking.',
          createdAt: new Date().toISOString()
        })
      ]);

      // Refresh local view
      fetchBookings();
    } catch (err) {
      console.error("Error accepting booking:", err);
      alert("Failed to accept booking. Please try again.");
    }
  };

  const handleCompleteBooking = async (booking: any) => {
    try {
      const updatedBooking = { ...booking, status: 'completed' };
      
      await Promise.all([
        writeDocument('bookings', booking.bookingId, updatedBooking),
        writeDocument(`bookings/${booking.bookingId}/messages`, `sys_${Date.now()}`, {
          senderId: 'system',
          senderName: 'System',
          text: 'The provider has marked the service as completed. Pending client confirmation/rating review.',
          createdAt: new Date().toISOString()
        })
      ]);

      // Refresh local view
      fetchBookings();
    } catch (err) {
      console.error("Error completing booking:", err);
      alert("Failed to update booking status. Please try again.");
    }
  };

  // Filter lists
  const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
  const recentHistory = bookings
    .filter(b => b.status === 'completed' || b.status === 'closed')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      
      <section className="bg-gradient-to-br from-primary/10 via-surface-raised to-accent-sage/10 rounded-2xl p-6 md:p-8 mb-xl border border-border flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left w-full md:w-auto">
          <Avatar src={userProfile.photoURL} name={userProfile.name} className="w-16 h-16 shadow-md border-2 border-surface" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-ink flex flex-wrap items-center gap-2 justify-start">
              Welcome, {userProfile.name}!
              <TierBadge tier={userProfile.tier || 'Bronze'} />
            </h1>
            <p className="text-sm text-ink/60 mt-0.5 break-words">
              Manage your services, track earnings, and respond to clients from your provider dashboard.
            </p>
          </div>
        </div>

        {/* Big Availability Control */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleToggleOnline}
            disabled={togglingLocation}
            className={`px-8 py-3.5 rounded-xl font-bold text-sm shadow-soft transition-all active:scale-95 cursor-pointer flex items-center gap-2 border ${
              isOnline
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-ink/50 border-border'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-white animate-pulse' : 'bg-ink/40'}`}></span>
            {togglingLocation ? 'Updating location...' : isOnline ? 'You are ONLINE' : 'You are OFFLINE'}
          </button>
          <span className="text-[10px] text-ink/40 font-semibold uppercase tracking-wider">
            {isOnline ? 'Visible to customers searching for services' : 'Hidden from customer search results'}
          </span>
        </div>
      {locationError && (
        <div className="bg-accent-terracotta/10 border border-accent-terracotta/20 text-accent-terracotta rounded-xl p-md text-sm mb-lg animate-pulse">
          {locationError}
        </div>
      )}
      </section>

      <motion.section 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-xl"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="p-4 md:p-6 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Jobs Completed</span>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-6 h-6 text-primary" />
              <span className="text-xl md:text-2xl font-extrabold text-ink">{userProfile.totalJobs || 0}</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="p-4 md:p-6 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Total Earnings</span>
            <div className="flex items-center gap-2 mt-2">
              <DollarSign className="w-6 h-6 text-primary" />
              <span className="text-xl md:text-2xl font-extrabold text-ink">Rs. {userProfile.totalEarnings || 0}</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="p-4 md:p-6 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Overall Rating</span>
            <div className="flex items-center gap-2 mt-2">
              <Star className="w-6 h-6 text-accent-gold fill-current" />
              <span className="text-xl md:text-2xl font-extrabold text-ink">
                {userProfile.rating !== null && userProfile.rating !== undefined 
                  ? userProfile.rating.toFixed(1) 
                  : "New"}
              </span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="p-4 md:p-6 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Current Specialty</span>
            <div className="flex items-center gap-2 mt-2">
              <Briefcase className="w-6 h-6 text-primary" />
              <span className="text-sm font-extrabold text-ink truncate">{userProfile.category || 'Specialist'}</span>
            </div>
          </Card>
        </motion.div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Active Booking requests (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-md">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Active Service Requests ({activeBookings.length})
          </h2>

          <div className="space-y-md">
            {activeBookings.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Calendar}
                  title="No Active Requests"
                  description={isOnline ? "You are online but haven't received any bookings yet. Service requests will appear here in real-time." : "Go ONLINE above to start receiving service requests from nearby customers."}
                />
              </Card>
            ) : (
              activeBookings.map((b) => (
                <Card key={b.bookingId} className="p-5 flex flex-col md:flex-row items-start justify-between gap-md border border-border">
                  <div className="space-y-sm flex-grow">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'pending'
                          ? 'bg-accent-terracotta/8 text-accent-terracotta border-accent-terracotta/25'
                          : 'bg-primary/8 text-primary border-primary/25'
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-xs font-bold text-ink/40 font-mono">#{b.bookingId.substring(8) || b.bookingId}</span>
                    </div>

                    <h3 className="text-base font-bold text-ink">{b.customerName}</h3>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {b.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {b.timeSlot} ({b.date})
                      </span>
                    </div>
                    <p className="text-xs font-bold text-primary">
                      PKR Invoice: Rs. {b.totalPrice} <span className="text-[10px] text-ink/40 font-normal">(Rs. {b.basePrice} base + Rs. {b.travelFee} travel)</span>
                    </p>
                  </div>

                  {/* Actions wrapper */}
                  <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 justify-end">
                    <button
                      onClick={() => navigate(`/chat?bookingId=${b.bookingId}`)}
                      className="flex-1 md:flex-initial bg-surface hover:bg-border text-ink text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-border"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Client
                    </button>
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptBooking(b)}
                        className="flex-1 md:flex-initial bg-primary text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Job
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleCompleteBooking(b)}
                        className="flex-1 md:flex-initial bg-primary text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-primary-hover"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Job
                      </button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent Job History List (1/3 width) */}
        <div className="space-y-md">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Recent Earnings ({recentHistory.length})
          </h2>

          <Card className="p-4 md:p-6 space-y-4">
            {recentHistory.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-6">No completed jobs yet. Keep online and complete assignments to earn!</p>
            ) : (
              recentHistory.map((h) => (
                <div key={h.bookingId} className="flex justify-between items-center border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-ink">{h.customerName}</p>
                    <p className="text-[10px] text-ink/40 font-medium">{h.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-primary block">
                      +Rs. {h.totalPrice}
                    </span>
                    <span className="text-[9px] text-ink/40 block">Completed</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
