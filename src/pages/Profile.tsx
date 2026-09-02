import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mail, Phone, MapPin, Briefcase, Star, Clock, LogOut, ChevronLeft, Camera, Sparkles, X,
  DollarSign, TrendingUp, Award, Shield, ArrowRightLeft
} from 'lucide-react';
import { Avatar } from '../components/ui/SharedUI';
import { TierBadge } from '../components/ui/TierBadge';
import { uploadProfilePhoto } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile, logout, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Becoming a worker form states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [categoryInput, setCategoryInput] = useState('Electrician');
  const [bioInput, setBioInput] = useState('');
  const [basePriceInput, setBasePriceInput] = useState('1500');
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('becomeWorker') === 'true') {
      setShowRegisterModal(true);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const handleEditPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const fileType = file.type || '';
      const isImg = fileType.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);
      if (!isImg) {
        setPhotoError('Please select a valid image file (JPG, PNG, WEBP, HEIC).');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setPhotoError('Image file size should be less than 2MB.');
        return;
      }
      
      setUploading(true);
      setPhotoError(null);
      try {
        const url = await uploadProfilePhoto(user.uid, file);
        await updateProfile({ photoURL: url });
      } catch (err: any) {
        console.error("Photo upload error:", err);
        setPhotoError('Failed to upload profile photo. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryInput) {
      setRegisterError('Please select a service category.');
      return;
    }
    if (!bioInput.trim()) {
      setRegisterError('Please write a brief bio about your skills.');
      return;
    }
    if (!basePriceInput || Number(basePriceInput) <= 0) {
      setRegisterError('Please enter a valid hourly rate (PKR/hr).');
      return;
    }

    try {
      setRegisterError(null);
      await updateProfile({
        role: 'provider',
        current_mode: 'worker',
        category: categoryInput,
        bio: bioInput,
        basePrice: Number(basePriceInput),
        rating: null,
        totalJobs: 0,
        tier: 'Bronze',
        available: true,
        totalEarnings: 0,
        jobsHistory: []
      });
      setShowRegisterModal(false);
    } catch (err) {
      console.error(err);
      setRegisterError('Failed to register worker profile. Please try again.');
    }
  };

  const handleModeSwitch = async () => {
    if (userProfile?.role === 'provider') {
      const nextMode = userProfile.current_mode === 'worker' ? 'client' : 'worker';
      await updateProfile({ current_mode: nextMode });
    } else {
      setShowRegisterModal(true);
    }
  };

  if (!userProfile) {
    return (
      <div className="pt-28 pb-28 px-4 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-ink/50 dark:text-slate-400 text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  const isProvider = userProfile.role === 'provider';
  const isWorkerMode = userProfile.current_mode === 'worker';

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      {/* Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-border dark:border-slate-800 flex items-center justify-center text-ink/60 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-medium text-headline-lg text-ink dark:text-white">Profile</h1>
      </div>

      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className="bg-gradient-to-br from-primary/8 via-surface-raised to-accent-gold/5 dark:from-primary/15 dark:via-slate-900 dark:to-slate-900 border border-border dark:border-slate-800 rounded-2xl p-5 md:p-8 mb-6 relative overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 relative z-10">
          {/* Avatar with edit overlay */}
          <div className="relative group shrink-0">
            <Avatar src={userProfile.photoURL} name={userProfile.name} className="w-24 h-24 md:w-28 md:h-28 shadow-md border-4 border-white dark:border-slate-800" />
            <label className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer select-none text-[10px] font-semibold">
              <Camera className="w-5 h-5 mb-0.5" />
              {uploading ? 'Uploading...' : 'Edit'}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleEditPhoto}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Name + role + bio */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3">
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-ink dark:text-white capitalize truncate">
                {userProfile.name}
              </h2>
              {isProvider && userProfile.tier && (
                <TierBadge tier={userProfile.tier} />
              )}
            </div>
            
            <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-primary-fixed mt-1 flex items-center justify-center md:justify-start gap-1.5">
              {isProvider ? (
                <><Briefcase className="w-3 h-3" /> Service Provider — {userProfile.category}</>
              ) : (
                <><Shield className="w-3 h-3" /> Client Account</>
              )}
            </p>

            {isProvider && userProfile.bio && (
              <p className="text-sm text-ink/60 dark:text-slate-400 mt-3 max-w-lg leading-relaxed italic">
                "{userProfile.bio}"
              </p>
            )}

            {photoError && (
              <p className="text-xs text-red-500 mt-2 font-medium">{photoError}</p>
            )}

            {/* Mode switcher inline on desktop */}
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-ink/50 dark:text-slate-500">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-bold ${
                  isWorkerMode 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-accent-gold/10 text-accent-gold border-accent-gold/20'
                }`}>
                  {isWorkerMode ? '🔧 Worker Mode' : '👤 Client Mode'}
                </span>
              </div>
              <button
                onClick={handleModeSwitch}
                className="inline-flex items-center gap-1.5 bg-primary hover:brightness-110 text-on-primary font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all active:scale-95 text-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Switch to {isWorkerMode ? 'Client' : 'Worker'} Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ DASHBOARD GRID ═══════════════════ */}
      <div className={`grid gap-5 ${isProvider ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        
        {/* ─── Contact Information Card ─── */}
        <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-5 md:p-6">
          <h3 className="text-[10px] font-bold text-ink/40 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/8 dark:bg-primary/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ink/40 dark:text-slate-500 font-semibold uppercase tracking-wider">Email</p>
                <p className="text-sm font-semibold text-ink dark:text-white truncate">{userProfile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/8 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ink/40 dark:text-slate-500 font-semibold uppercase tracking-wider">Phone</p>
                <p className="text-sm font-semibold text-ink dark:text-white">{userProfile.phone || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-terracotta/8 dark:bg-accent-terracotta/15 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-accent-terracotta" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ink/40 dark:text-slate-500 font-semibold uppercase tracking-wider">City / Region</p>
                <p className="text-sm font-semibold text-ink dark:text-white">{userProfile.city || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleLogout}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-500/15 rounded-xl transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* ─── Worker Stats Dashboard Cards (only for providers) ─── */}
        {isProvider && (
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-min">
            
            {/* Stat Card: Specialty */}
            <div className="col-span-2 bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider">Specialty</p>
                <p className="text-lg font-display font-semibold text-ink dark:text-white">{userProfile.category}</p>
              </div>
            </div>

            {/* Stat Card: Rating */}
            <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center mb-2">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-[9px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Rating</p>
              <p className="text-xl font-display font-bold text-ink dark:text-white">
                {userProfile.rating !== null && userProfile.rating !== undefined 
                  ? userProfile.rating.toFixed(1) 
                  : 'New'}
              </p>
              <p className="text-[9px] text-ink/30 dark:text-slate-600 font-medium">out of 5.0</p>
            </div>

            {/* Stat Card: Total Jobs */}
            <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-sky-500" />
              </div>
              <p className="text-[9px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Jobs Done</p>
              <p className="text-xl font-display font-bold text-ink dark:text-white">{userProfile.totalJobs || 0}</p>
              <p className="text-[9px] text-ink/30 dark:text-slate-600 font-medium">completed</p>
            </div>

            {/* Stat Card: Hourly Rate */}
            <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[9px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Base Rate</p>
              <p className="text-xl font-display font-bold text-primary dark:text-primary-fixed">Rs. {userProfile.basePrice}</p>
              <p className="text-[9px] text-ink/30 dark:text-slate-600 font-medium">per hour</p>
            </div>

            {/* Stat Card: Total Earnings */}
            <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-accent-gold/10 dark:bg-accent-gold/15 flex items-center justify-center mb-2">
                <Award className="w-5 h-5 text-accent-gold" />
              </div>
              <p className="text-[9px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Earned</p>
              <p className="text-xl font-display font-bold text-ink dark:text-white">Rs. {userProfile.totalEarnings || 0}</p>
              <p className="text-[9px] text-ink/30 dark:text-slate-600 font-medium">total revenue</p>
            </div>

            {/* Stat Card: Tier Level */}
            <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-[9px] text-ink/40 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Tier</p>
              <div className="mt-1">
                <TierBadge tier={userProfile.tier || 'Bronze'} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Client-only: quick actions ─── */}
        {!isProvider && (
          <div className="bg-surface-raised dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-5 md:p-6">
            <h3 className="text-[10px] font-bold text-ink/40 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">Find a Service</p>
                  <p className="text-[10px] text-ink/50 dark:text-slate-500">Search and book providers</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/bookings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent-gold/5 dark:bg-accent-gold/10 hover:bg-accent-gold/10 dark:hover:bg-accent-gold/20 border border-accent-gold/10 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-accent-gold/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4 text-accent-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">My Bookings</p>
                  <p className="text-[10px] text-ink/50 dark:text-slate-500">Track your service requests</p>
                </div>
              </button>

              <button
                onClick={handleModeSwitch}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/10 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">Become a Worker</p>
                  <p className="text-[10px] text-ink/50 dark:text-slate-500">Start earning on Khidmat</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ WORKER REGISTRATION MODAL ═══════════════════ */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1E293B] border border-border dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8 text-left relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3 mb-5">
                <h3 className="font-display font-medium text-lg text-ink dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-gold" />
                  Become a Service Worker
                </h3>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-ink/50" />
                </button>
              </div>

              {registerError && (
                <div className="bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-semibold mb-4">
                  {registerError}
                </div>
              )}

              <form onSubmit={handleRegisterWorker} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-ink/50 dark:text-slate-500 block mb-1.5">Select Specialty / Skill Category</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border dark:border-slate-800 text-sm font-medium text-ink dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="AC Technician">AC Technician</option>
                    <option value="House Cleaner">House Cleaner</option>
                    <option value="Appliance Repair">Appliance Repair</option>
                    <option value="Mechanic">Mechanic</option>
                    <option value="Gardener">Gardener</option>
                    <option value="Movers & Packers">Movers & Packers</option>
                    <option value="Pest Control">Pest Control</option>
                    <option value="CCTV Technician">CCTV Technician</option>
                    <option value="Welder">Welder</option>
                    <option value="Mason">Mason</option>
                    <option value="Handyman">Handyman</option>
                    <option value="Photographer">Photographer</option>
                    <option value="Videographer">Videographer</option>
                    <option value="Event Decorator">Event Decorator</option>
                    <option value="DJ">DJ</option>
                    <option value="Caterer">Caterer</option>
                    <option value="Waiter/Server">Waiter/Server</option>
                  </select>
                </div>

                <div>
                  <label className="text-ink/50 dark:text-slate-500 block mb-1.5">Worker Biography / Skills Summary</label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Briefly describe your years of experience, tooling certifications, or work style..."
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border dark:border-slate-800 text-sm font-medium text-ink dark:text-white outline-none resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-ink/50 dark:text-slate-500 block mb-1.5">Base Hourly Rate (PKR / hr)</label>
                  <input
                    type="number"
                    value={basePriceInput}
                    onChange={(e) => setBasePriceInput(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border dark:border-slate-800 text-sm font-medium text-ink dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:brightness-105 text-on-primary py-3.5 rounded-xl shadow-soft font-bold transition-all text-sm mt-2 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Register & Switch to Worker View</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
