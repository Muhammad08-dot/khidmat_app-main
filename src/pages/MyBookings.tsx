import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Card, Skeleton } from '../components/ui/SharedUI';
import { 
  writeDocument, 
  submitProviderReview,
  sendChatMessage,
  listenToBookings,
  createNotification
} from '../services/firebase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Star, 
  AlertCircle,
  Sparkles,
  Info,
  DollarSign,
  User,
  Navigation
} from 'lucide-react';

interface Booking {
  id?: string;
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
  distanceKm: number;
  customerRating?: number;
  reviewedAt?: string;
}

const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const countVal = useMotionValue(0);
  const rounded = useTransform(countVal, (latest) => Math.round(latest));
  const [displayVal, setDisplayVal] = useState(0);
  
  useEffect(() => {
    const controls = animate(countVal, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [value]);
  
  useEffect(() => {
    return rounded.on("change", (latest) => setDisplayVal(latest));
  }, [rounded]);
  
  return <span>{displayVal}</span>;
};

export const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  
  // Rating states
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!user || !userProfile) return;

    setLoading(true);
    const fieldName = userProfile.current_mode === 'worker' ? 'providerId' : 'customerId';

    const unsubscribe = listenToBookings(fieldName, user.uid, (data) => {
      setBookings(data as Booking[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const handleUpdateStatus = async (booking: Booking, newStatus: 'confirmed' | 'in_progress' | 'completed' | 'closed' | 'cancelled') => {
    try {
      const updatedBooking = { ...booking, status: newStatus };
      await writeDocument('bookings', booking.bookingId, updatedBooking);
      
      const statusTexts = {
        confirmed: "Worker accepted the booking request and has marked it as CONFIRMED.",
        in_progress: "Worker has started working on this booking. Status is now IN PROGRESS.",
        completed: "Worker completed the task successfully. Booking is marked as COMPLETED.",
        closed: "Booking was marked as CLOSED.",
        cancelled: `Booking was cancelled by the ${userProfile?.current_mode === 'worker' ? 'worker' : 'customer'}.`
      };

      const tasks: Promise<any>[] = [];

      tasks.push(
        sendChatMessage(
          booking.bookingId,
          'system',
          'System Notification',
          JSON.stringify({
            text: statusTexts[newStatus],
            isSystemEvent: true,
            eventStatus: newStatus
          })
        )
      );

      if (newStatus === 'confirmed') {
        tasks.push(
          createNotification(
            booking.customerId,
            'job_accepted',
            `Your booking request has been accepted by ${booking.providerName}!`,
            booking.bookingId
          )
        );
      } else if (newStatus === 'in_progress') {
        tasks.push(
          createNotification(
            booking.customerId,
            'job_accepted',
            `Worker ${booking.providerName} has started working on your job request.`,
            booking.bookingId
          )
        );
      } else if (newStatus === 'completed') {
        tasks.push(
          createNotification(
            booking.customerId,
            'job_completed',
            `Worker ${booking.providerName} has marked your job complete. Please review & confirm completion.`,
            booking.bookingId
          )
        );
      } else if (newStatus === 'cancelled') {
        const targetUserId = userProfile?.current_mode === 'worker' ? booking.customerId : booking.providerId;
        tasks.push(
          createNotification(
            targetUserId,
            'job_confirmed',
            `Your booking request with ${userProfile?.current_mode === 'worker' ? booking.customerName : booking.providerName} has been cancelled.`,
            booking.bookingId
          )
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleRatingSubmit = async (booking: Booking) => {
    if (selectedRating < 1 || selectedRating > 5) return;
    
    try {
      setSubmittingRating(true);
      await submitProviderReview(booking.bookingId, booking.providerId, selectedRating);
      
      // Inject completion system notification into chat
      await sendChatMessage(
        booking.bookingId,
        'system',
        'System Notification',
        JSON.stringify({
          text: `Customer confirmed completion and rated the service ${selectedRating} stars.`,
          isSystemEvent: true,
          eventStatus: 'closed'
        })
      );

      // Notify provider of ratings review receipt
      await createNotification(
        booking.providerId,
        'job_confirmed',
        `Customer ${booking.customerName} confirmed completion and rated you ${selectedRating} stars.`,
        booking.bookingId
      );

      setRatingBookingId(null);
      setSelectedRating(5);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') {
      return b.status === 'completed' || b.status === 'closed' || b.status === 'in_progress';
    }
    return b.status === activeTab;
  });

  const getTabCount = (tab: 'all' | 'pending' | 'confirmed' | 'completed') => {
    if (tab === 'all') return bookings.length;
    if (tab === 'completed') {
      return bookings.filter(b => b.status === 'completed' || b.status === 'closed' || b.status === 'in_progress').length;
    }
    return bookings.filter(b => b.status === tab).length;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent-gold/8 text-accent-gold border-accent-gold/25';
      case 'in_progress':
        return 'bg-primary/8 text-primary border-primary/25';
      case 'completed':
        return 'bg-accent-sky/8 text-accent-sky border-accent-sky/25';
      case 'closed':
        return 'bg-emerald-500/8 text-emerald-600 border-emerald-500/25 dark:text-emerald-450';
      case 'cancelled':
        return 'bg-red-500/5 text-red-500/80 border-red-500/15';
      case 'pending':
      default:
        return 'bg-accent-terracotta/8 text-accent-terracotta border-accent-terracotta/25';
    }
  };

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      
      {/* Header title block */}
      <div className="mb-lg">
        <h1 className="font-display font-medium text-headline-lg text-ink">My Bookings</h1>
        <p className="text-ink/70 font-sans text-label-md">
          {userProfile?.current_mode === 'worker' 
            ? "Manage jobs assigned to you by customers" 
            : "Track your requested home service calls"}
        </p>
      </div>

      {/* Tabs list pills */}
      <div className="flex border-b border-border gap-md mb-lg overflow-x-auto pb-sm shrink-0 no-scrollbar">
        {(['all', 'pending', 'confirmed', 'completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative font-sans text-sm capitalize py-2.5 px-4 transition-all whitespace-nowrap pb-3 ${
              activeTab === tab 
                ? 'text-primary dark:text-[#6bff8f] font-bold' 
                : 'text-ink/60 hover:text-primary'
            }`}
          >
            <span className="relative z-10">
              {tab === 'all' ? 'All Bookings' : tab}
            </span>
            <span className="relative z-10 ml-1.5 px-1.5 py-0.5 rounded-full bg-ink/5 dark:bg-white/10 text-[10px] font-bold font-variant-numeric: tabular-nums">
              <CountUp value={getTabCount(tab)} />
            </span>
            {activeTab === tab && (
              <motion.div
                layoutId="mybookings-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary dark:bg-[#6bff8f] rounded-full"
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-md">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-between h-36">
              <div className="flex justify-between items-center w-full">
                <Skeleton className="w-1/3 h-5" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <Skeleton className="w-2/3 h-4" />
              <Skeleton className="w-1/4 h-8 mt-sm" />
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Dynamic Empty States */
        <div className="text-center max-w-md mx-auto py-16 space-y-md">
          <AlertCircle className="w-12 h-12 text-ink/40 mx-auto" />
          <h2 className="text-lg font-bold text-ink">No Bookings Found</h2>
          <p className="text-ink/70 text-sm">
            {activeTab === 'all' 
              ? `You don't have any bookings logged in this category yet.` 
              : `No bookings match your current "${activeTab}" filter.`}
          </p>
          {userProfile?.current_mode !== 'worker' && activeTab === 'all' && (
            <button 
              onClick={() => navigate('/')}
              className="bg-primary text-on-primary font-semibold py-3 px-6 rounded-lg shadow-soft transition-all active:scale-95 cursor-pointer"
            >
              Request Service Now
            </button>
          )}
        </div>
      ) : (
        /* Bookings list mapping */
        <motion.div
          key={activeTab}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="space-y-md"
        >
          {filteredBookings.map((b) => {
            const isCompleted = b.status === 'completed';
            const isPending = b.status === 'pending';
            const isConfirmed = b.status === 'confirmed';
            const isInProgress = b.status === 'in_progress';
            const isClosed = b.status === 'closed';
            
            const clientView = userProfile?.current_mode !== 'worker';
            const displayTitle = clientView ? b.providerCategory : "Incoming Job Request";
            const displayName = clientView ? b.providerName : b.customerName;

            return (
              <motion.div
                key={b.bookingId}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                }}
                className="bg-surface-raised border border-border rounded-2xl p-md md:p-lg shadow-soft flex flex-col gap-md relative overflow-hidden"
              >
                
                {/* Header card details */}
                <div className="flex flex-wrap items-center justify-between gap-sm border-b border-border pb-sm">
                  <div className="flex items-center gap-sm">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-ink">{displayTitle}</h2>
                      <span className="text-[10px] text-ink/50 block mt-0.5">
                        Booking ID: <span className="font-mono">{b.bookingId.substring(0, 8)}</span>
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold capitalize tracking-wider ${getStatusClass(b.status)}`}>
                    {b.status}
                  </span>
                </div>

                {/* Details row grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md text-xs font-semibold text-ink/75">
                  <div className="space-y-xs">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-ink/40 font-bold block">Schedule Time</span>
                    <span className="flex items-center gap-1 text-ink">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {b.date} • {b.timeSlot}
                    </span>
                  </div>

                  <div className="space-y-xs">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-ink/40 font-bold block">
                      {clientView ? "Assigned Worker" : "Client Contact"}
                    </span>
                    <span className="flex items-center gap-1 text-ink capitalize">
                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {displayName}
                    </span>
                  </div>

                  <div className="space-y-xs md:col-span-2">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-ink/40 font-bold block">Job Location Address</span>
                    <span className="flex items-center gap-1 text-ink truncate">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {b.address}
                    </span>
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="bg-surface p-sm rounded-lg flex justify-between items-center text-xs font-bold px-md border border-border">
                  <span className="text-ink/60">Total Price Estimate</span>
                  <span className="text-primary flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Rs. {b.totalPrice}
                  </span>
                </div>

                {/* Star Ratings selection overlay for Completed clients */}
                {(isCompleted || isClosed) && clientView && (
                  <div className="border-t border-border pt-md mt-xs">
                    {b.customerRating ? (
                      /* Display completed rating feedback */
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-md rounded-xl text-xs flex items-center justify-between">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Service Rated
                        </span>
                        <span className="flex items-center gap-1 font-bold text-amber-500 text-sm bg-surface px-3 py-1 rounded-lg border border-amber-500/20">
                          <Star className="w-4 h-4 fill-current" />
                          {b.customerRating.toFixed(1)} / 5.0
                        </span>
                      </div>
                    ) : (
                      /* Submission selector star form */
                      <div className="bg-accent-gold/5 border border-accent-gold/20 p-md rounded-xl space-y-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm">
                          <div>
                            <p className="text-xs font-bold text-ink flex items-center gap-1">
                              <Sparkles className="w-4 h-4 text-primary" />
                              Rate {b.providerName}'s Work
                            </p>
                            <p className="text-[10px] text-ink/50">
                              Your rating immediately recalculates their level tier and helps maintain high quality service standard!
                            </p>
                          </div>
                          
                          {/* Star items row */}
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(starIndex => (
                              <button
                                key={starIndex}
                                type="button"
                                onMouseEnter={() => setHoverRating(starIndex)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => {
                                  setRatingBookingId(b.bookingId);
                                  setSelectedRating(starIndex);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-amber-500 active:scale-90 transition-transform"
                              >
                                <Star 
                                  className={`w-6 h-6 ${
                                    (hoverRating || selectedRating) >= starIndex 
                                      ? 'fill-current' 
                                      : 'stroke-current'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Submit button wrapper */}
                        {ratingBookingId === b.bookingId && (
                          <div className="flex justify-end pt-xs">
                            <button
                              onClick={() => handleRatingSubmit(b)}
                              disabled={submittingRating}
                              className="bg-primary text-white font-bold text-[11px] py-2 px-4 rounded-lg shadow-soft hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all"
                            >
                              {submittingRating ? "Submitting..." : "Submit Review Score"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions row button layout */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-sm mt-xs justify-between">
                  
                  {/* Info notice for cancellations */}
                  {b.status === 'cancelled' ? (
                    <span className="text-[10px] text-accent-terracotta flex items-center gap-1 font-bold">
                      <XCircle className="w-3.5 h-3.5" /> Booking Cancelled
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink/50 font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      Contact details will unlock in Chat
                    </span>
                  )}

                  <div className="flex gap-2">
                    {/* Open Live Chat shortcut */}
                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => navigate(`/chat?bookingId=${b.bookingId}`)}
                        className="bg-surface hover:bg-border border border-border text-ink font-bold py-2.5 px-4 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span>Live Chat</span>
                      </button>
                    )}

                    {/* Open Live Tracking shortcut */}
                    {b.status !== 'cancelled' && (b.status === 'confirmed' || b.status === 'in_progress') && (
                      <button
                        onClick={() => navigate(`/track/${b.bookingId}`)}
                        className="bg-primary text-white font-bold py-2.5 px-4 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-soft"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Track Map</span>
                      </button>
                    )}

                    {/* CLIENT ACTIONS */}
                    {clientView && isPending && (
                      <button
                        onClick={() => handleUpdateStatus(b, 'cancelled')}
                        className="bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/20 font-bold py-2.5 px-4 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    )}

                    {/* WORKER ACTIONS */}
                    {!clientView && isPending && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(b, 'cancelled')}
                          className="bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/20 font-bold py-2.5 px-4 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Cancel Job
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(b, 'confirmed')}
                          className="bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-soft cursor-pointer"
                        >
                          Accept &amp; Confirm Job
                        </button>
                      </>
                    )}

                    {!clientView && isConfirmed && (
                      <button
                        onClick={() => handleUpdateStatus(b, 'in_progress')}
                        className="bg-amber-500 text-white font-bold py-2.5 px-4 rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-soft cursor-pointer"
                      >
                        Start Work
                      </button>
                    )}

                    {!clientView && isInProgress && (
                      <button
                        onClick={() => handleUpdateStatus(b, 'completed')}
                        className="bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-soft cursor-pointer"
                      >
                        Mark Completed &amp; Paid
                      </button>
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default MyBookings;
