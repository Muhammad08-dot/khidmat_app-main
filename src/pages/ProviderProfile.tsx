import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, sendInvitationEmail, createInvitationNotification } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TierBadge } from '../components/ui/TierBadge';
import { Avatar } from '../components/ui/SharedUI';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Briefcase, 
  Calendar, 
  ShieldCheck,
  Check,
  Compass,
  UserCheck,
  Info,
  Sparkles
} from 'lucide-react';

interface Provider {
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
  available: boolean;
  phone?: string;
  email?: string;
  photoURL?: string;
}

export const ProviderProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user, userProfile } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleNotifyWorker = async () => {
    if (!provider || !userProfile) return;
    
    setNotifying(true);
    try {
      await sendInvitationEmail(
        provider.email || 'worker@email.com',
        provider.name,
        userProfile.name,
        user?.uid || '',
        userProfile.email || '',
        provider.category,
        provider.city
      );
      
      await createInvitationNotification(
        provider.userId,
        userProfile.name,
        user?.uid || '',
        userProfile.email || '',
        provider.category,
        provider.city
      );
      
      setNotified(true);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err) {
      console.error("Failed to notify worker:", err);
    } finally {
      setNotifying(false);
    }
  };

  useEffect(() => {
    const fetchProviderDetail = async () => {
      if (!id) {
        setError("Invalid profile link.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await getDocument('providers', id);
        if (data) {
          setProvider(data as Provider);
        } else {
          setError("Provider profile could not be found in the database.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch provider detail.");
      } finally {
        setLoading(false);
      }
    };

    fetchProviderDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-28 flex items-center justify-center min-h-[50vh] text-ink">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        <span>Loading profile detail...</span>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="pt-28 px-margin-mobile text-center max-w-md mx-auto">
        <div className="bg-error-container/20 border border-error/20 p-lg rounded-xl text-error mb-lg">
          {error || "Profile not found."}
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-primary text-on-primary py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center gap-md mb-lg">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-medium text-headline-lg text-ink">Worker Profile</h1>
          <p className="text-ink/60 text-sm">Professional credentials & reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Left column: Profile overview (1/3 width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-lg"
        >
          <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft text-center space-y-md relative overflow-hidden">
            {/* Gradient mesh accent */}
            <div className="absolute top-0 left-0 right-0 h-24 gradient-mesh-bg opacity-50" />
            
            {/* Large Avatar */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Avatar src={provider.photoURL} name={provider.name} className="w-24 h-24 shadow-md" />
              {provider.available && (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" title="Available now"></span>
              )}
            </div>

            {/* Name and specialty */}
            <div className="relative z-10">
              <h2 className="text-xl font-extrabold text-ink mb-xs">{provider.name}</h2>
              <p className="text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                {provider.category}
              </p>
            </div>

            {/* Tier Badge */}
            <div className="flex justify-center">
              <TierBadge tier={provider.tier} />
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-sm border-t border-b border-border py-md my-md text-sm font-semibold">
              <div className="text-center border-r border-border">
                <span className="text-accent-gold text-base font-bold flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  {provider.rating !== null && provider.rating !== undefined 
                    ? provider.rating.toFixed(1) 
                    : "New"}
                </span>
                <span className="text-[10px] text-ink/40 font-medium block mt-0.5">Overall Rating</span>
              </div>
              <div className="text-center">
                <span className="text-ink text-base font-bold block">
                  {provider.totalJobs}
                </span>
                <span className="text-[10px] text-ink/40 font-medium block mt-0.5">Completed Jobs</span>
              </div>
            </div>

            {/* Base price rate */}
            <div className="flex justify-between items-center text-sm font-medium px-md">
              <span className="text-ink/60">Base Hourly Rate</span>
              <span className="text-base font-bold text-primary">Rs. {provider.basePrice} / hr</span>
            </div>

            {/* Action buttons */}
            <div className="pt-md space-y-sm">
              {provider.available ? (
                <button
                  onClick={() => navigate(`/booking?providerId=${provider.userId}`)}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-base py-3.5 rounded-xl shadow-soft active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Book Service Now</span>
                </button>
              ) : (
                <>
                  <div className="bg-slate-500/10 border border-slate-500/25 rounded-xl p-sm text-xs text-ink/75 leading-relaxed text-left flex gap-2">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>This provider is currently offline. You can notify them to get online and accept your job match immediately!</span>
                  </div>
                  <button
                    onClick={handleNotifyWorker}
                    disabled={notifying || notified}
                    className={`w-full font-bold text-base py-3.5 rounded-xl shadow-soft active:scale-95 transition-all flex items-center justify-center gap-2 border ${
                      notified
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 cursor-default'
                        : 'bg-primary text-white hover:brightness-105 border-primary cursor-pointer'
                    }`}
                  >
                    {notifying ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    <span>{notified ? 'Worker Notified ✓' : 'Notify to get Online'}</span>
                  </button>
                  <button
                    onClick={() => navigate(`/booking?providerId=${provider.userId}`)}
                    className="w-full bg-surface hover:bg-border text-ink border border-border font-bold text-sm py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Schedule for Later</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right column: Bio, Coordinates Map and Details (2/3 width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 space-y-lg"
        >
          {/* About / Bio Card */}
          <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft space-y-md">
            <h3 className="text-base font-bold text-ink border-b border-border pb-xs">
              Professional Biography
            </h3>
            <p className="text-ink/70 text-sm leading-relaxed whitespace-pre-line">
              {provider.bio}
            </p>
          </div>

          {/* Location details card */}
          <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft space-y-md">
            <h3 className="text-base font-bold text-ink border-b border-border pb-xs">
              Location & Service Region
            </h3>
            
            <div className="flex flex-col md:flex-row gap-lg justify-between items-start md:items-center">
              <div className="space-y-sm text-sm">
                <p className="flex items-center gap-2 text-ink font-semibold">
                  <MapPin className="w-4 h-4 text-primary" />
                  Base City: <span className="text-primary">{provider.city}</span>
                </p>
                <p className="flex items-center gap-2 text-ink/60">
                  <Compass className="w-4 h-4 text-primary" />
                  GPS Pin Drop: <span className="font-mono text-xs">{provider.location.lat.toFixed(5)}, {provider.location.lng.toFixed(5)}</span>
                </p>
              </div>

              {/* Geographic availability badge */}
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold">
                <UserCheck className="w-4 h-4" />
                Ready to travel inside {provider.city}
              </div>
            </div>

            {/* Static Schematic Coordinate visual block */}
            <div className="rounded-lg h-36 border border-dashed border-border bg-surface flex flex-col items-center justify-center p-md text-center text-xs space-y-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-ink">Active Dispatch Area</p>
                <p className="text-ink/50 mt-0.5">
                  Worker is dispatched from coordinates in {provider.city} directly to your pinned location.
                </p>
              </div>
            </div>
          </div>

          {/* Verification Credentials Checkboxes */}
          <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft space-y-md">
            <h3 className="text-base font-bold text-ink border-b border-border pb-xs flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Khidmat Security & Safety Checks
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-xs font-semibold text-ink/70">
              {[
                "Government CNIC Verified",
                "Technical Background Verified",
                "Practical skill assessment passed",
                "Clean police background check",
                "Standard toolkits compliance",
                "Service quality contract signed"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
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
              <p className="text-xs text-ink/75 dark:text-ink/85">{provider.name} was sent an email & in-app alert.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProviderProfile;
