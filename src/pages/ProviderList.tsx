import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);
import { getCollectionDocs, sendInvitationEmail, createInvitationNotification } from '../services/firebase';
import { Card, EmptyState, Avatar } from '../components/ui/SharedUI';
import { 
  rankProvidersWithAI, 
  estimateJobPriceWithAI, 
  type PriceEstimateResult 
} from '../services/gemini';
import { 
  getDistanceKm, 
  estimateTravelTimeMinutes
} from '../utils/location';
import { TierBadge } from '../components/ui/TierBadge';
import { 
  MapPin, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft, 
  ChevronRight, 
  Info,
  Compass
} from 'lucide-react';

interface Provider {
  id?: string;
  userId: string;
  name: string;
  category: string;
  city: string;
  location: { lat: number; lng: number };
  basePrice: number;
  rating: number;
  totalJobs: number;
  tier: string;
  bio: string;
  available?: boolean;
  photoURL?: string;
  email?: string;
}

const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayVal, setDisplayVal] = useState(0);
  
  useEffect(() => {
    animate(count, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1] as any,
    });
    return rounded.on("change", (latest) => setDisplayVal(latest));
  }, [value]);
  
  return <>{displayVal.toLocaleString()}</>;
};

export const ProviderList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();

  const category = searchParams.get('category') || '';
  const jobSummary = searchParams.get('q') || `Request for ${category} services.`;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [rankedReasons, setRankedReasons] = useState<Record<string, string>>({});
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateResult | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrossCity, setIsCrossCity] = useState(false);

  const [notifiedWorkers, setNotifiedWorkers] = useState<Record<string, boolean>>({});
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<{ visible: boolean; name: string } | null>(null);

  const handleNotifyWorker = async (e: React.MouseEvent, p: Provider) => {
    e.stopPropagation(); // Prevent card navigation click
    if (!userProfile) return;
    
    setNotifyingId(p.userId);
    try {
      // 1. Send Resend Email Invitation
      await sendInvitationEmail(
        p.email || 'worker@email.com',
        p.name,
        userProfile.name,
        user?.uid || '',
        userProfile.email || user?.email || '',
        p.category,
        p.city
      );
      
      // 2. Create In-App Notification document
      await createInvitationNotification(
        p.userId,
        userProfile.name,
        user?.uid || '',
        userProfile.email || user?.email || '',
        p.category,
        p.city
      );
      
      // 3. Mark as notified
      setNotifiedWorkers(prev => ({ ...prev, [p.userId]: true }));
      setShowSuccessToast({ visible: true, name: p.name });
      setTimeout(() => setShowSuccessToast(null), 4000);
    } catch (err) {
      console.error("Failed to notify worker:", err);
    } finally {
      setNotifyingId(null);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (providers.length === 0) return;
    
    gsap.from('.provider-card', {
      scrollTrigger: {
        trigger: '.provider-list-container',
        start: 'top 85%',
        scrub: 1.2,
      },
      y: (i) => 20 * (i + 1),
      ease: 'none',
    });
  }, { scope: containerRef, dependencies: [providers] });

  useEffect(() => {
    const fetchAndRankProviders = async () => {
      if (!category) {
        setError("Invalid category selection.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all providers and filter by category case-insensitively
        const rawProviders = (await getCollectionDocs('providers')) as Provider[];
        const allProviders = rawProviders.filter(p => 
          p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        
        // Exclude own user_id
        const eligibleProviders = allProviders.filter(p => p.userId !== user?.uid);
        
        const onlineProviders = eligibleProviders.filter(p => p.available === true);
        const offlineProviders = eligibleProviders.filter(p => p.available !== true);

        const userCity = userProfile?.city || 'Lahore';
        const localOffline = offlineProviders.filter(p => p.city.toLowerCase() === userCity.toLowerCase());

        if (onlineProviders.length === 0 && localOffline.length === 0) {
          setProviders([]);
          setLoading(false);
          return;
        }

        // 2. Filter online matches by user's city
        let matchedOnline = onlineProviders.filter(p => p.city.toLowerCase() === userCity.toLowerCase());
        
        // Hospitality logic: if no online providers in their city, show cross-city matches with travel surcharge warnings
        if (matchedOnline.length === 0 && onlineProviders.length > 0) {
          matchedOnline = onlineProviders;
          setIsCrossCity(true);
        } else {
          setIsCrossCity(false);
        }

        // 3. Calculate distance to nearest provider to feed the pricing API
        const userCoords = userProfile?.location || { lat: 31.5204, lng: 74.3587 };
        let minDistance = 2.0; // fallback standard
        const combinedForDistance = matchedOnline.length > 0 ? matchedOnline : localOffline;
        if (combinedForDistance.length > 0) {
          const distances = combinedForDistance.map(p => 
            getDistanceKm(userCoords.lat, userCoords.lng, p.location.lat, p.location.lng)
          );
          minDistance = Math.min(...distances);
        }

        // 4. Run AI matching on online providers and pricing in parallel
        let rankedOnline: any[] = [];
        let priceResult: any = null;

        if (matchedOnline.length > 0) {
          const [rankedList, priceEstimation] = await Promise.all([
            rankProvidersWithAI(category, userCoords, matchedOnline),
            estimateJobPriceWithAI(category, jobSummary, minDistance)
          ]);
          rankedOnline = rankedList;
          priceResult = priceEstimation;
        } else {
          priceResult = await estimateJobPriceWithAI(category, jobSummary, minDistance);
        }

        // Map reasons to provider UIDs
        const reasonsMap: Record<string, string> = {};
        rankedOnline.forEach(item => {
          reasonsMap[item.userId] = item.reason;
        });

        // Set default reasoning text for offline providers
        localOffline.forEach(p => {
          reasonsMap[p.userId] = `${p.name} is a local provider in ${p.city} who is currently offline. You can notify them by email/in-app alert to get online!`;
        });

        // 5. Re-order matched online providers based on the AI ranked order
        const rankedOnlineProviders = [...matchedOnline].sort((a, b) => {
          const indexA = rankedOnline.findIndex(item => item.userId === a.userId);
          const indexB = rankedOnline.findIndex(item => item.userId === b.userId);
          const scoreA = indexA === -1 ? 999 : indexA;
          const scoreB = indexB === -1 ? 999 : indexB;
          return scoreA - scoreB;
        });

        // Combine ranked online ones first, then local offline ones at the bottom
        const finalProviders = [...rankedOnlineProviders, ...localOffline];

        setProviders(finalProviders);
        setRankedReasons(reasonsMap);
        setPriceEstimate(priceResult);

      } catch (err) {
        console.error("Error fetching/matching providers:", err);
        setError("Failed to query match recommendations. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchAndRankProviders();
    }
  }, [category, jobSummary, userProfile]);

  if (loading) {
    return (
      <div className="pt-28 flex flex-col items-center justify-center min-h-[60vh] text-ink">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-md"
        />
        <span className="text-sm font-medium text-ink/60">Finding the best matches in {userProfile?.city}...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full relative">
      {/* Back button header */}
      <div className="flex items-center gap-md mb-lg">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink hover:bg-surface/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-medium text-headline-lg text-ink">Matched Workers</h1>
          <p className="text-ink/70 font-sans text-label-md">Ranked matches for "{category}"</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-200 text-red-700 p-6 rounded-2xl text-center max-w-md mx-auto mb-6">
          {error}
        </div>
      ) : providers.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <EmptyState
            icon={AlertCircle}
            title="No Matching Workers Found"
            description={`We currently don't have any registered providers for "${category}". Check back soon or register a provider account to test!`}
            actionLabel="Go Back Home"
            onAction={() => navigate('/')}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          
          {/* Main List Section (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-md">
            
            {/* Warning if showing providers from another city */}
            {isCrossCity && (
              <div className="bg-accent-terracotta/10 border border-accent-terracotta/30 text-accent-terracotta rounded-xl p-md text-sm flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Outside Local Area:</span> No direct workers found in {userProfile?.city}. Displaying nearby specialists from other cities. Travel charges will apply.
                </div>
              </div>
            )}

            {/* Provider List Cards */}
            <div className="provider-list-container space-y-md">
              {providers.map((p, index) => {
                const userCoords = userProfile?.location || { lat: 31.5204, lng: 74.3587 };
                const distance = getDistanceKm(userCoords.lat, userCoords.lng, p.location.lat, p.location.lng);
                const travelTime = estimateTravelTimeMinutes(distance);
                const matchReason = rankedReasons[p.userId] || `${p.name} is available in your city and highly experienced in ${p.category}.`;

                return (
                  <motion.div
                    key={p.userId}
                    onClick={() => navigate(`/provider/${p.userId}`)}
                    className="provider-card bg-surface-raised rounded-2xl border border-border p-md flex flex-col md:flex-row gap-md cursor-pointer hover:shadow-[0_20px_40px_-20px_rgba(20,35,28,0.15)] transition-all duration-300 group relative overflow-hidden"
                    whileHover={{ y: -2 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] as any }}
                  >
                    {/* Rank indicator badge */}
                    <motion.div
                      animate={index === 0 ? {
                        boxShadow: [
                          "0 0 0 0px rgba(184, 134, 59, 0.2)",
                          "0 0 0 6px rgba(184, 134, 59, 0.4)",
                          "0 0 0 0px rgba(184, 134, 59, 0.2)"
                        ]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        index === 0 
                          ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30' 
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      #{index + 1}
                    </motion.div>

                    {/* Avatar container */}
                    <div className="flex-shrink-0 flex items-center">
                      <Avatar src={p.photoURL} name={p.name} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl shadow-inner object-cover" />
                    </div>

                    {/* Detailed info */}
                    <div className="flex-grow space-y-sm pr-6">
                      <div className="flex flex-wrap items-center gap-sm">
                        <h2 className="text-base font-bold text-ink group-hover:text-primary transition-colors">
                          {p.name}
                        </h2>
                        <TierBadge tier={p.tier} />
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                          p.available 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.available ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {p.available ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      {/* Distance & Rate details */}
                      <div className="flex flex-wrap gap-x-md gap-y-1 text-xs text-ink/60 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {distance} km ({p.city})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          Travel: ~{travelTime} mins
                        </span>
                        <span className="flex items-center gap-1 font-bold text-primary">
                          Rs. {p.basePrice} / hr
                        </span>
                      </div>

                      {/* AI Reasoning box */}
                      <div className="bg-primary/5 border border-primary/10 p-sm rounded-lg text-xs leading-relaxed flex gap-2">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-ink/75 italic">
                          {matchReason}
                        </p>
                      </div>

                      {/* Invite section on card if offline */}
                      {!p.available && (
                        <div className="pt-xs flex items-center justify-start w-full">
                          <button
                            onClick={(e) => handleNotifyWorker(e, p)}
                            disabled={notifyingId === p.userId || notifiedWorkers[p.userId]}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 border shadow-soft ${
                              notifiedWorkers[p.userId]
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 cursor-default'
                                : 'bg-primary text-white hover:brightness-105 border-primary cursor-pointer'
                            }`}
                          >
                            {notifyingId === p.userId ? (
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>{notifiedWorkers[p.userId] ? 'Worker Notified ✓' : 'Notify to get Online'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Arrow redirect shortcut */}
                    <div className="hidden md:flex items-center justify-center text-outline dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary-fixed transition-colors pr-2">
                      <ChevronRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Pricing Estimation Side Panel (1/3 width on desktop) */}
          <div className="space-y-md">
            {priceEstimate && (
              <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft space-y-md sticky top-28 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
                <h3 className="text-base font-bold text-ink flex items-center gap-1.5 border-b border-border pb-xs">
                  <Compass className="w-5 h-5 text-primary" />
                  AI Price Estimate
                </h3>
                
                {/* Large Range Banner */}
                <div className="bg-gradient-to-br from-primary to-primary-hover text-white rounded-2xl p-lg text-center shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 mosaic-pattern opacity-10"></div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-white/70 block mb-xs">PKR Estimated Range</span>
                  <span className="text-2xl md:text-3xl font-black">
                    Rs. <CountUp value={priceEstimate.minPrice} /> - <CountUp value={priceEstimate.maxPrice} />
                  </span>
                  <span className="text-[10px] text-white/80 block mt-2">Cash on Delivery • No prepayments</span>
                </div>

                {/* Explanation text */}
                <div className="space-y-sm text-xs leading-normal">
                  <p className="font-bold text-ink">How this was calculated:</p>
                  <p className="text-ink/70">
                    {priceEstimate.explanation}
                  </p>
                </div>

                {/* Secure service assurance */}
                <div className="border-t border-border pt-md text-[10px] text-ink/50 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Final prices can be negotiated directly with your worker in the chat screen after booking.</span>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-surface dark:bg-surface-raised dark:text-ink px-lg py-md rounded-2xl shadow-xl flex items-center gap-md border border-border z-50 whitespace-nowrap text-sm font-sans"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
              ✓
            </div>
            <div>
              <p className="font-bold">Notification Dispatched!</p>
              <p className="text-xs text-ink/75 dark:text-ink/85">{showSuccessToast.name} was sent an email & in-app alert.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProviderList;
