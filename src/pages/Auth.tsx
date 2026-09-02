import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// framer-motion imports removed
import { useAuth } from '../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  Loader, 
  Briefcase, 
  BookOpen,
  Map,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { MapSelector } from '../components/features/MapSelector';
import { PAKISTAN_CITIES, type LocationCoords } from '../utils/location';

export const Auth: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path or default to home '/'
  const from = (location.state as any)?.from?.pathname || '/';

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [coordinates, setCoordinates] = useState<LocationCoords>({ lat: 31.5204, lng: 74.3587 });

  // Provider specific Form Fields
  const [category, setCategory] = useState('Electrician');
  const [basePrice, setBasePrice] = useState('');
  const [bio, setBio] = useState('');

  // Photo Upload States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.type || '';
      const isImg = fileType.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);
      if (!isImg) {
        setError('Please select a valid image file (JPG, PNG, WEBP, HEIC).');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size should be less than 2MB.');
        return;
      }
      setPhotoFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const PakistaniCities = Object.keys(PAKISTAN_CITIES);

  const specialties = [
    "Electrician", "Plumber", "Carpenter", "Painter", "AC Technician",
    "House Cleaner", "Appliance Repair", "Mechanic", "Gardener", "Movers & Packers",
    "Pest Control", "CCTV Technician", "Welder", "Mason", "Handyman",
    "Photographer", "Videographer", "Event Decorator", "DJ", "Caterer", "Waiter/Server"
  ];

  // Set default coordinates when city changes
  useEffect(() => {
    const coords = PAKISTAN_CITIES[city];
    if (coords) setCoordinates(coords);
  }, [city]);

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (!phone.trim()) throw new Error('Please enter your phone number.');
        if (phone.length < 9) throw new Error('Please enter a valid phone number.');
        
        const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
        const formattedPhone = `+92${cleanPhone}`;

        let providerDetails = undefined;
        if (role === 'provider') {
          if (!basePrice.trim() || isNaN(Number(basePrice)) || Number(basePrice) <= 0) {
            throw new Error('Please enter a valid hourly base rate in PKR.');
          }
          if (!bio.trim() || bio.length < 10) {
            throw new Error('Please enter a professional bio (minimum 10 characters).');
          }
          providerDetails = { category, bio, basePrice: Number(basePrice) };
        }
        
        await signUp(email, password, name, formattedPhone, city, role, coordinates, providerDetails, photoFile || undefined);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'An error occurred during authentication.';
      if (err.message?.includes('auth/user-not-found') || err.message?.includes('auth/wrong-password') || err.message?.includes('auth/invalid-credential')) {
        friendlyMessage = 'Invalid email or password. Please try again.';
      } else if (err.message?.includes('auth/email-already-in-use')) {
        friendlyMessage = 'This email address is already in use by another account.';
      } else if (err.message?.includes('auth/weak-password')) {
        friendlyMessage = 'Password should be at least 6 characters long.';
      } else if (err.message?.includes('auth/invalid-email')) {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-surface dark:bg-surface text-ink placeholder-ink/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-ink/50 mb-1.5 uppercase tracking-wide";

  return (
    <div
      style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', background: 'transparent' }}
      className="bg-surface dark:bg-surface relative flex items-center justify-center py-10 px-4"
    >
      {/* Subtle background pattern + gradient mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden gradient-mesh-bg">
        <div className="absolute inset-0 mosaic-pattern opacity-[0.04]" />
        <div
          className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-64 rounded-full blur-[100px] opacity-10"
          style={{ background: 'var(--primary)' }}
        />
      </div>

      {/* Page content — standard block centering, dynamic width */}
      <div 
        className="relative z-10 w-full mx-auto transition-all duration-300"
        style={{ maxWidth: isLogin ? '920px' : '1180px' }}
      >

        {/* ── Brand Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            className="bg-surface-raised border border-border px-6 py-3 rounded-2xl shadow-soft mb-3"
          >
            <span className="font-display text-xl font-bold text-primary tracking-tight">
              Khidmat
            </span>
            <span className="text-sm font-semibold text-accent-gold" style={{ marginTop: '-8px' }}>
              خدمت
            </span>
          </div>
          <p className="text-sm md:text-base font-semibold text-ink leading-relaxed mt-2">
            Professional &amp; localized service providers at your doorstep.
          </p>
        </div>

        {/* ── Auth Card ── */}
        <div
          style={{ width: '100%', borderRadius: '24px', overflow: 'hidden' }}
          className="bg-surface-raised border border-border shadow-soft"
        >
          <div className="p-6 md:p-10">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {isLogin ? (
                /* ── LOGIN FORM LAYOUT (Split Screen Design) ── */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Left Side: Brand Visual Panel */}
                  <div className="hidden md:flex md:col-span-5 flex-col justify-between bg-gradient-to-br from-[#1F5D3F] to-[#10231C] text-white p-8 rounded-2xl h-full min-h-[350px] shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <h3 className="font-display font-extrabold text-xl leading-tight text-white mb-2">
                        Get Home Tasks Done Instantly
                      </h3>
                      <p className="text-white/80 text-xs leading-relaxed">
                        Match with nearby technicians, cleaners, painters, and carpenters in your city.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3.5 my-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold">Verified Service Specialists</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold">Live Location Tracking Map</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold">Direct Real-Time Chat System</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-white/50 font-medium">
                      Khidmat © 2026. Made in Pakistan.
                    </div>
                  </div>

                  {/* Right Side: Inputs Column */}
                  <div className="col-span-1 md:col-span-7 flex flex-col justify-center">
                    <div className="mb-6 text-center md:text-left">
                      <h2 className="text-xl md:text-2xl font-bold text-ink mb-1">
                        Welcome Back
                      </h2>
                      <p className="text-xs text-ink/50 leading-relaxed">
                        Login with your credentials to search and book services.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Email */}
                      <div>
                        <label className={labelClass} htmlFor="email">Email Address</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            type="email" id="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass} placeholder="name@example.com" required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className={labelClass} htmlFor="password">Password</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            type="password" id="password" value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass} placeholder="••••••••" required minLength={6}
                          />
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-3 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>Login to Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── SIGNUP FORM LAYOUT (Horizontal Two Columns - 1200px grid) ── */
                <div>
                  <div className="mb-6 text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-ink mb-1">
                      Create Account
                    </h2>
                    <p className="text-xs text-ink/50 leading-relaxed">
                      Sign up to register as a client or provide home services across Pakistan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                    
                    {/* Left Column (Personal info & photo upload) */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 uppercase tracking-wide">
                        1. Personal Information
                      </h3>

                      {/* Profile Photo Upload Field */}
                      <div className="flex flex-col items-center justify-center py-1">
                        <label className="relative cursor-pointer group flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-all bg-surface">
                            {photoPreview ? (
                              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-8 h-8 text-ink/30 group-hover:text-primary transition-colors" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                          <span className="text-[11px] font-semibold text-ink/50 mt-2 hover:text-primary transition-colors">
                            {photoPreview ? 'Change Profile Photo' : 'Upload Profile Photo (Optional)'}
                          </span>
                        </label>
                      </div>

                      {/* Role selector inside Left Column */}
                      <div>
                        <label className={labelClass}>Account Type</label>
                        <div className="flex bg-surface dark:bg-surface p-1 rounded-xl border border-border">
                          <button
                            type="button"
                            onClick={() => setRole('customer')}
                            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
                              role === 'customer'
                                ? 'bg-surface-raised text-primary shadow-sm'
                                : 'text-ink/50'
                            }`}
                          >
                            Hire (Client)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('provider')}
                            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
                              role === 'provider'
                                ? 'bg-surface-raised text-primary shadow-sm'
                                : 'text-ink/50'
                            }`}
                          >
                            Provide (Worker)
                          </button>
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className={labelClass} htmlFor="name">Full Name</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-ink/40">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            type="text" id="name" value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass} placeholder="e.g. Muhammad Bilal"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className={labelClass} htmlFor="phone">Phone Number</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500 flex items-center gap-1 text-xs font-semibold">
                            <Phone className="w-4 h-4" />
                            <span className="border-r border-border pr-2">+92</span>
                          </span>
                          <input
                            type="tel" id="phone" value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-20 pr-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder-ink/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            placeholder="3001234567" maxLength={10}
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className={labelClass} htmlFor="email">Email Address</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            type="email" id="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass} placeholder="name@example.com" required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className={labelClass} htmlFor="password">Password</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            type="password" id="password" value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass} placeholder="••••••••" required minLength={6}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column (City, location mapping, and specialty info) */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 uppercase tracking-wide">
                        2. Service &amp; Location Details
                      </h3>

                      {/* City */}
                      <div>
                        <label className={labelClass} htmlFor="city">City of Residence</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                            <MapPin className="w-4 h-4" />
                          </span>
                          <select
                            id="city" value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className={inputClass + " appearance-none"}
                          >
                            {PakistaniCities.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <span className="absolute right-4 pointer-events-none text-ink/30 text-xs">▼</span>
                        </div>
                      </div>

                      {/* Map pin */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={labelClass} style={{ marginBottom: 0 }}>Pin Exact Location</label>
                          <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                            <Map className="w-3 h-3" /> Drag marker to your location
                          </span>
                        </div>
                        <MapSelector value={coordinates} onChange={setCoordinates} city={city} />
                      </div>

                      {/* Provider-only fields (category, price, bio) */}
                      {role === 'provider' && (
                        <div
                          className="flex flex-col gap-4 border-t border-border pt-4 mt-2"
                        >
                          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <Briefcase className="w-3.5 h-3.5" /> Provider Specialty info
                          </h4>

                          {/* Category */}
                          <div>
                            <label className={labelClass} htmlFor="category">Specialty category</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-4 text-gray-400 dark:text-slate-500">
                                <Briefcase className="w-4 h-4" />
                              </span>
                              <select
                                id="category" value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className={inputClass + " appearance-none"}
                              >
                                {specialties.map(spec => (
                                  <option key={spec} value={spec}>{spec}</option>
                                ))}
                              </select>
                              <span className="absolute right-4 pointer-events-none text-gray-400 text-xs">▼</span>
                            </div>
                          </div>

                          {/* Base price */}
                          <div>
                            <label className={labelClass} htmlFor="basePrice">Hourly Rate (PKR)</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-4 text-gray-400 dark:text-slate-500 font-semibold text-xs">Rs.</span>
                              <input
                                type="number" id="basePrice" value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                className={inputClass} placeholder="e.g. 800" min="1"
                              />
                            </div>
                          </div>

                          {/* Bio */}
                          <div>
                            <label className={labelClass} htmlFor="bio">Professional Bio</label>
                            <div className="relative flex">
                              <span className="absolute left-4 top-3 text-gray-400 dark:text-slate-500">
                                <BookOpen className="w-4 h-4" />
                              </span>
                              <textarea
                                id="bio" value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder-ink/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm min-h-[90px] resize-none"
                                placeholder="Describe your skills, experience, and certifications..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Submit button centered and sized for visual balance ── */}
                  <div className="w-full flex justify-center mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full max-w-[420px] bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Toggle mode */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={handleToggleMode}
                className="text-primary hover:underline text-sm font-semibold transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
