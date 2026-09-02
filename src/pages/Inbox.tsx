import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listenToBookings } from '../services/firebase';
import { MessageSquare, ChevronRight, User, Calendar, MapPin, Briefcase } from 'lucide-react';
import { Card, EmptyState } from '../components/ui/SharedUI';
import { motion } from 'framer-motion';

interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  date: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  address: string;
}

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const isWorker = userProfile?.current_mode === 'worker';

  useEffect(() => {
    if (!user || !userProfile) return;

    setLoading(true);
    const fieldName = isWorker ? 'providerId' : 'customerId';

    const unsubscribe = listenToBookings(fieldName, user.uid, (data) => {
      setConversations(data as Booking[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25', label: 'Confirmed' };
      case 'in_progress':
        return { bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25', label: 'In Progress' };
      case 'completed':
        return { bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25', label: 'Completed' };
      case 'closed':
        return { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25', label: 'Closed' };
      case 'cancelled':
        return { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25', label: 'Cancelled' };
      case 'pending':
      default:
        return { bg: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-2xl mx-auto w-full min-h-[60vh] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-ink/50 dark:text-slate-400 text-sm font-medium">Loading your messages...</span>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-2xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-lg">
        <h1 className="font-display font-medium text-headline-lg text-ink dark:text-white">Messages</h1>
        <p className="text-ink/60 dark:text-slate-400 font-sans text-label-md mt-1">
          {isWorker
            ? "Chat with your customers about job details"
            : "Chat with your service providers and coordinate visits"}
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 md:p-12 text-center">
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description={
              isWorker
                ? "No customer has booked your services yet. Go online and wait for a match!"
                : "Book a home service to start chatting with a professional provider."
            }
            actionLabel={isWorker ? undefined : "Find a Provider"}
            onAction={isWorker ? undefined : () => navigate('/')}
          />
        </Card>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {conversations.map((convo) => {
            // Fix: Show the OTHER person's name, not your own
            const chatPartnerName = isWorker ? convo.customerName : convo.providerName;
            // Fix: Show role subtitle correctly
            const roleSubtitle = isWorker ? 'Client' : convo.providerCategory;
            const badge = getStatusBadge(convo.status);
            const initials = chatPartnerName
              ? chatPartnerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              : '?';

            return (
              <motion.div
                key={convo.bookingId}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
                }}
              >
                <div
                  onClick={() => navigate(`/chat?bookingId=${convo.bookingId}`)}
                  className="group bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 cursor-pointer hover:border-primary/30 hover:shadow-md dark:hover:border-primary/40 transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Avatar circle with initials */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                      <span className="text-primary dark:text-primary-fixed font-bold text-sm md:text-base">{initials}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + badge row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm md:text-base text-ink dark:text-white truncate capitalize">
                          {chatPartnerName}
                        </h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${badge.bg} whitespace-nowrap`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Role subtitle */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {isWorker ? (
                          <User className="w-3 h-3 text-ink/40 dark:text-slate-500" />
                        ) : (
                          <Briefcase className="w-3 h-3 text-ink/40 dark:text-slate-500" />
                        )}
                        <p className="text-xs text-ink/50 dark:text-slate-500 font-medium">{roleSubtitle}</p>
                      </div>

                      {/* Date + Address meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-ink/40 dark:text-slate-600 font-medium">
                          <Calendar className="w-3 h-3" />
                          {convo.date}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-ink/40 dark:text-slate-600 font-medium truncate max-w-[180px] md:max-w-[280px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {convo.address}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-5 h-5 text-ink/20 dark:text-slate-700 group-hover:text-primary transition-colors shrink-0" />
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

export default Inbox;
