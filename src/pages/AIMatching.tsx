import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Droplet, 
  Hammer, 
  Paintbrush, 
  Snowflake, 
  Sparkles, 
  Settings, 
  Car, 
  Sprout, 
  Truck, 
  Bug, 
  Eye, 
  Flame, 
  Layers, 
  Wrench, 
  Camera, 
  Video, 
  PartyPopper, 
  Music, 
  Utensils, 
  UserCheck,
  Compass,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { parseServiceIntent, type ParsedIntent } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import { Card, EmptyState } from '../components/ui/SharedUI';

// Map categories to Lucide icons
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Electrician": Zap,
  "Plumber": Droplet,
  "Carpenter": Hammer,
  "Painter": Paintbrush,
  "AC Technician": Snowflake,
  "House Cleaner": Sparkles,
  "Appliance Repair": Settings,
  "Mechanic": Car,
  "Gardener": Sprout,
  "Movers & Packers": Truck,
  "Pest Control": Bug,
  "CCTV Technician": Eye,
  "Welder": Flame,
  "Mason": Layers,
  "Handyman": Wrench,
  "Photographer": Camera,
  "Videographer": Video,
  "Event Decorator": PartyPopper,
  "DJ": Music,
  "Caterer": Utensils,
  "Waiter/Server": UserCheck
};

export const AIMatching: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  
  const query = searchParams.get('q') || '';
  const categoryPreset = searchParams.get('category') || '';

  const [loading, setLoading] = useState(true);
  const [statusIndex, setStatusIndex] = useState(0);
  const [result, setResult] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rotating loading texts for high-end feeling
  const loadingStatuses = [
    "Contacting Gemini AI Engine...",
    "Analyzing search request keywords...",
    "Interpreting work requirements and mapping coordinates...",
    "Optimizing matching categories across Pakistan...",
    "Sorting matching priority scores..."
  ];

  // Rotate loading texts
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  // Run intent parsing
  useEffect(() => {
    const parseIntent = async () => {
      setLoading(true);
      setError(null);

      // 1. If category preset was clicked directly, bypass LLM parsing
      if (categoryPreset) {
        await new Promise(resolve => setTimeout(resolve, 800)); // natural delay
        setResult({
          category: categoryPreset,
          urgency: 'medium',
          summary: `Request for ${categoryPreset} services.`
        });
        setLoading(false);
        return;
      }

      // 2. If no text query exists
      if (!query.trim()) {
        setError("Please enter a description of what you need on the home screen.");
        setLoading(false);
        return;
      }

      try {
        const parsed = await parseServiceIntent(query);
        setResult(parsed);
      } catch (err) {
        console.error(err);
        setError("AI Matching service encountered an error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    parseIntent();
  }, [query, categoryPreset]);

  const handleFindProviders = () => {
    if (!result) return;
    // Redirect to provider list screen with categories query param
    navigate(`/providers?category=${encodeURIComponent(result.category)}&urgency=${encodeURIComponent(result.urgency)}&q=${encodeURIComponent(result.summary)}`);
  };

  const MatchedIcon = result ? CATEGORY_ICONS[result.category] || Wrench : Wrench;

  // Urgency pill styling mapper
  const getUrgencyStyles = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high':
        return {
          bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
          pulse: 'bg-red-500',
          label: 'Critical / Emergency Action'
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          pulse: 'bg-amber-500',
          label: 'Standard Scheduled Repair'
        };
      case 'low':
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          pulse: 'bg-emerald-500',
          label: 'Routine Maintenance'
        };
    }
  };

  return (
    <div className="pt-24 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full min-h-[80vh] flex flex-col justify-center items-center">
      <AnimatePresence mode="wait">
        {loading ? (
          /* RADAR SCANNER LOADING SCREEN */
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex flex-col items-center justify-center text-center max-w-md w-full"
          >
            {/* Holographic Radar Scanner UI */}
            <div className="relative w-48 h-48 mb-xl flex items-center justify-center">
              {/* Spinning compass outline */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-primary/30 dark:border-primary-fixed/30"
              />
              
              {/* Radial radar ripple loops */}
              <div className="absolute inset-4 rounded-full border border-primary/20 dark:border-primary-fixed/20 animate-ping duration-1000" />
              <div className="absolute inset-10 rounded-full border border-primary/10 dark:border-primary-fixed/10 animate-ping duration-2000" />
              
              {/* Inner glowing core */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-primary/30 dark:border-primary-fixed/30 shadow-inner">
                <Compass className="w-10 h-10 text-primary dark:text-primary-fixed animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <h2 className="font-display font-medium text-headline-md text-ink mb-xs">
              AI Matching Engine
            </h2>
            
            <div className="h-6 flex items-center justify-center">
              <p className="text-ink/65 animate-pulse">
                {loadingStatuses[statusIndex]}
              </p>
            </div>
          </motion.div>
        ) : error ? (
          /* ERROR STATE SCREEN */
          <motion.div
            key="error-screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md w-full"
          >
            <Card>
              <EmptyState
                icon={AlertCircle}
                title="Matching Failed"
                description={error}
                actionLabel="Return Home"
                onAction={() => navigate('/')}
              />
            </Card>
          </motion.div>
        ) : (
          /* MATCHING SUCCESS SCREEN */
          <motion.div
            key="result-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-xl w-full"
          >
            {/* Header announcement */}
            <div className="text-center mb-xl">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-md border border-emerald-500/20 shadow-sm animate-bounce" style={{ animationDuration: '3s' }}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="font-display font-medium text-headline-lg text-ink mb-xs">
                Request Analyzed!
              </h1>
              <p className="text-ink/60 text-sm">
                Our Gemini AI mapped your task to the best matching specialty.
              </p>
            </div>

            {/* Glassmorphic result card */}
            <div className="bg-surface-raised rounded-xl border border-border p-lg shadow-soft relative overflow-hidden space-y-lg mb-xl backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
              {/* Background gradient flares */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
              
              {/* Input text summary review */}
              {query && (
                <div className="bg-surface p-md rounded-lg border border-border/40">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-ink/40 block mb-xs">Your Input Query</span>
                  <p className="text-ink text-sm font-medium italic">"{query}"</p>
                </div>
              )}

              {/* Categorization & Urgency visual split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* Category block */}
                <div className="flex items-center gap-md border border-border p-md rounded-xl bg-surface/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <MatchedIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ink/40 block">Identified Specialty</span>
                    <span className="text-base font-bold text-ink">{result?.category}</span>
                  </div>
                </div>

                {/* Urgency block */}
                {result && (
                  <div className={`flex items-center gap-md border p-md rounded-xl bg-surface/50 ${getUrgencyStyles(result.urgency).bg}`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-current/20">
                      <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getUrgencyStyles(result.urgency).pulse}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${getUrgencyStyles(result.urgency).pulse}`}></span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-ink/40 block">Urgency Status</span>
                      <span className="text-sm font-bold capitalize">{result.urgency}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* One line summary block */}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink/40 block mb-1">AI Request Summary</span>
                <p className="text-sm font-semibold text-ink border-l-4 border-primary pl-md py-1">
                  {result?.summary}
                </p>
              </div>

              {/* Geographic check overlay info */}
              <div className="pt-md border-t border-border text-[11px] text-ink/60 flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary animate-pulse" />
                <span>Finding local `{result?.category}` workers registered in **{userProfile?.city || 'your city'}**...</span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleFindProviders}
              className="w-full bg-primary text-white font-bold text-base py-4 rounded-xl shadow-soft hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Search Best Rated Workers</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIMatching;
