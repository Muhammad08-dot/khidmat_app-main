import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, Mic, User as UserIcon, LogOut, ChevronDown, Calendar, MessageSquare, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { writeDocument, listenToNotifications, markNotificationAsRead, createOnlineAlertNotification, sendOnlineAlertEmail } from '../services/firebase';
import { Avatar } from '../components/ui/SharedUI';
import { motion, AnimatePresence } from 'framer-motion';

// Browser Speech Recognition instance
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface NavbarProps {
  onSearch?: (query: string) => void;
  onVoiceTrigger?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, onVoiceTrigger }) => {
  const navigate = useNavigate();
  const { user, userProfile, logout, updateProfile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Speech states
  const [isListening, setIsListening] = useState(false);
  const [listeningError, setListeningError] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Sync state with userProfile availability
  useEffect(() => {
    if (userProfile && userProfile.current_mode === 'worker') {
      setIsAvailable(userProfile.available !== false);
    }
  }, [userProfile]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubscribe = listenToNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markNotificationAsRead(user.uid, n.id)));
  };

  const handleNotificationClick = async (notif: any) => {
    if (!user || !userProfile) return;
    await markNotificationAsRead(user.uid, notif.id);
    setShowNotificationsDropdown(false);
    
    if (notif.type === 'chat_message') {
      navigate(`/chat?bookingId=${notif.relatedJobId}`);
    } else if (notif.type === 'invitation') {
      // Worker toggles status to online in response to customer invitation
      if (userProfile.role === 'provider') {
        // Go online
        await updateProfile({ available: true });
        
        // Notify client back
        const clientName = notif.metadata?.clientName || 'Customer';
        const clientId = notif.metadata?.clientId || '';
        const clientEmail = notif.metadata?.clientEmail || 'testingmail492@gmail.com';
        
        // Create Firestore notification for client
        await createOnlineAlertNotification(clientId, user.uid, userProfile.name, userProfile.category || '');
        
        // Send email back to client
        await sendOnlineAlertEmail(clientEmail, userProfile.name, clientName, userProfile.category || '', userProfile.city || '');
      }
      // Redirect worker to home page dashboard
      navigate('/');
    } else if (notif.type === 'online_alert') {
      // Client clicks worker online notification -> redirect client to book that provider
      const providerId = notif.metadata?.providerId;
      if (providerId) {
        navigate(`/booking?providerId=${providerId}`);
      } else {
        navigate('/');
      }
    } else {
      navigate('/bookings');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else if (searchQuery.trim()) {
      navigate(`/matching?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const startVoiceSearch = () => {
    if (!SpeechRecognition) {
      setListeningError("Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setShowVoiceModal(true);
      return;
    }

    setListeningError(null);
    setIsListening(true);
    setShowVoiceModal(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log("Navbar voice capturing active...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        
        setTimeout(() => {
          setIsListening(false);
          setShowVoiceModal(false);
          navigate(`/matching?q=${encodeURIComponent(transcript)}`);
        }, 1100);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech capturing error:", event.error);
        if (event.error === 'not-allowed') {
          setListeningError("Microphone permission denied. Enable microphone access in browser settings.");
        } else {
          setListeningError(`Voice capture error: ${event.error}. Please try again.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start SpeechRecognition:", err);
      setListeningError("Failed to initialize speech hardware.");
      setIsListening(false);
    }
  };

  const cancelVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsListening(false);
    setShowVoiceModal(false);
  };

  const handleToggleAvailability = async () => {
    if (!user || !userProfile) return;
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    
    try {
      // Update users collection document
      await writeDocument('users', user.uid, {
        ...userProfile,
        available: newStatus
      });
      
      // Update providers collection document
      await writeDocument('providers', user.uid, {
        userId: user.uid,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        city: userProfile.city,
        location: userProfile.location,
        category: userProfile.category || '',
        bio: userProfile.bio || '',
        basePrice: userProfile.basePrice || 0,
        rating: userProfile.rating || 5.0,
        totalJobs: userProfile.totalJobs || 0,
        tier: userProfile.tier || 'Bronze',
        available: newStatus
      });
      
      console.log(`[Status] Availability toggled successfully to: ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err) {
      console.error("Failed to toggle provider availability status:", err);
      // Rollback UI state on failure
      setIsAvailable(!newStatus);
    }
  };

  const handleLogoutClick = async () => {
    setShowDropdown(false);
    try {
      await logout();
      navigate('/auth');
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const handleViewProfileClick = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop transition-all duration-300 ${
      scrolled
        ? 'py-2.5 bg-surface/85 dark:bg-[#0F1712]/85 backdrop-blur-md border-b border-border shadow-soft'
        : 'py-4 bg-surface dark:bg-[#0F1712] border-b border-transparent'
    }`}>
      <div className="flex items-center gap-lg w-full max-w-container-max mx-auto">
        {/* Brand Logo */}
        <a href="/" className="flex items-center shrink-0">
          <span className="font-display text-headline-lg font-bold text-primary dark:text-[#6bff8f] tracking-tight">
            Khidmat
            <span className="text-[0.6em] align-super text-accent-gold ml-0.5 font-semibold">
              خدمت
            </span>
          </span>
        </a>

        {/* Search Bar (Desktop only, hides on mobile screen) */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl relative items-center ml-auto">
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline dark:text-outline-variant/60 flex items-center">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={(e) => e.currentTarget.parentElement?.classList.add('search-glow-active')}
              onBlur={(e) => e.currentTarget.parentElement?.classList.remove('search-glow-active')}
              className="w-full bg-surface-raised dark:bg-surface-raised border border-border dark:border-border rounded-full py-3 pl-12 pr-12 focus:ring-2 focus:ring-primary dark:focus:ring-primary transition-all text-ink dark:text-ink outline-none"
              placeholder="Search for home services..."
            />
            <button
              type="button"
              onClick={onVoiceTrigger || startVoiceSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary dark:text-primary-fixed transition-colors active:scale-95"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Trailing Actions */}
        <div className="flex items-center gap-md ml-auto md:ml-0">
          
          {/* Provider Online/Offline Status Switch (InDrive style) */}
          {userProfile?.current_mode === 'worker' && (
            <div className="flex items-center gap-2 mr-2">
              <span className={`w-2.5 h-2.5 rounded-full transition-all ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <button
                type="button"
                onClick={handleToggleAvailability}
                className={`text-[10px] font-bold py-1.5 px-3 rounded-full border transition-all active:scale-95 ${
                  isAvailable 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' 
                    : 'bg-slate-100 dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 border-outline-variant/30 dark:border-slate-700'
                }`}
              >
                {isAvailable ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          )}

          {/* Desktop Navigation Links */}
          {userProfile && (
            <div className="hidden md:flex items-center gap-sm mr-2 border-r border-border pr-4">
              <button
                onClick={() => navigate('/bookings')}
                className="relative group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-ink hover:bg-surface/50 transition-colors active:scale-95 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-primary" />
                <span>Bookings</span>
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent-sky scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
              <button
                onClick={() => navigate('/inbox')}
                className="relative group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-ink hover:bg-surface/50 transition-colors active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Messages</span>
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent-sky scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-surface/50 dark:hover:bg-[#334155] transition-colors active:scale-95 overflow-hidden"
            aria-label="Toggle Theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={darkMode ? 'dark' : 'light'}
                initial={{ y: -10, rotate: -90, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                exit={{ y: 10, rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-accent-gold" />
                ) : (
                  <Moon className="w-5 h-5 text-ink" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* Notifications Bell with Unread Badge */}
          {userProfile && (
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-surface/50 dark:hover:bg-[#334155] transition-colors active:scale-95 relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-accent-terracotta text-white font-sans font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotificationsDropdown(false)}
                  />
                  <div className="fixed top-20 right-4 left-4 md:absolute md:top-auto md:right-0 md:left-auto md:w-80 rounded-xl bg-surface-raised border border-border shadow-xl py-3 z-50 text-left flex flex-col max-h-[360px] overflow-hidden">
                    <div className="px-4 pb-2 border-b border-border flex justify-between items-center shrink-0">
                      <span className="font-display font-medium text-sm text-ink">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    
                    <div className="overflow-y-auto divide-y divide-border max-h-[280px]">
                      {notifications.length === 0 ? (
                        <div className="py-6 px-4 text-center text-xs text-ink/50">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-surface/40 flex flex-col gap-1 transition-colors cursor-pointer ${
                              !n.read ? 'bg-primary/5 font-semibold' : ''
                            }`}
                          >
                            <p className="text-xs text-ink leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-ink/50 font-sans">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Profile Avatar with dropdown */}
          {userProfile && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1 focus:outline-none"
              >
                <Avatar
                  src={userProfile.photoURL}
                  name={userProfile.name}
                  className="w-10 h-10 shadow-soft cursor-pointer active:scale-95 transition-transform"
                />
                <ChevronDown className="w-3.5 h-3.5 text-ink/40 dark:text-ink/50" />
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-raised dark:bg-surface-raised border border-border dark:border-border shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-[10px] text-ink/40 uppercase tracking-wider font-semibold">Account</p>
                      <p className="text-sm font-bold text-ink truncate">{userProfile.name}</p>
                    </div>
                    <button
                      onClick={handleViewProfileClick}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink/80 hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center gap-2 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-ink/40" />
                      View Profile
                    </button>
                    {userProfile.role === 'provider' ? (
                      <button
                        onClick={async () => {
                          const newMode = userProfile.current_mode === 'worker' ? 'client' : 'worker';
                          await updateProfile({ current_mode: newMode });
                          setShowDropdown(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-primary dark:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center gap-2 transition-colors border-t border-border"
                      >
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span>Switch to {userProfile.current_mode === 'worker' ? 'Client' : 'Worker'} Mode</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/profile?becomeWorker=true');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-accent-gold hover:bg-accent-gold/5 dark:hover:bg-accent-gold/10 flex items-center gap-2 transition-colors border-t border-border font-semibold"
                      >
                        <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                        <span>Become a Worker</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogoutClick}
                      className="w-full text-left px-4 py-2.5 text-sm text-accent-terracotta hover:bg-accent-terracotta/5 dark:hover:bg-accent-terracotta/10 flex items-center gap-2 transition-colors border-t border-border"
                    >
                      <LogOut className="w-4 h-4 text-accent-terracotta" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL VOICE LISTENING ANIMATED MODAL SHEET */}
      <AnimatePresence>
        {showVoiceModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md z-[70] flex items-center justify-center p-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1E293B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-lg text-center space-y-lg relative overflow-hidden"
            >
              {/* Spinning compass loader overlay when active */}
              {isListening ? (
                <div className="flex flex-col items-center space-y-md py-md">
                  
                  {/* Micro pulsing container */}
                  <div className="relative w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 shadow-inner">
                    <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.4s' }}></span>
                    <Mic className="w-8 h-8 animate-pulse text-red-500" style={{ animationDuration: '1s' }} />
                  </div>
                  
                  <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white">Listening...</h3>
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 max-w-xs">
                    Please describe what job or worker you are searching for.
                  </p>

                  {/* Equalizer sound wave loop */}
                  <div className="flex items-end justify-center gap-1.5 h-12 mt-md pt-sm">
                    {[20, 48, 28, 40, 16, 32].map((height, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: [10, height, 10],
                        }}
                        transition={{
                          duration: 0.5 + i * 0.08,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                        className="w-1.5 bg-[#006e2f] dark:bg-[#6bff8f] rounded-full"
                        style={{ height: 10 }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* VOICE CAPTURE ERROR OR MOCKED OPTIONS FOR PRESENTATIONS */
                <div className="flex flex-col items-center space-y-md">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white">Voice Search Status</h3>
                  
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed px-sm">
                    {listeningError || "Speech window closed. No audio was detected."}
                  </p>

                  {/* Presentation Mode helper: clickable commands that skip mic requirement */}
                  <div className="w-full bg-slate-50 dark:bg-[#0F172A] border border-outline-variant/30 dark:border-slate-800 p-md rounded-xl space-y-sm text-left">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 font-bold block mb-1">
                      Demo Command Shortcut
                    </p>
                    <div className="space-y-xs">
                      {[
                        "I need an electrician for a short circuit",
                        "My kitchen pipe is leaking",
                        "Need painter for house renovation"
                      ].map(phrase => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => {
                            setSearchQuery(phrase);
                            setShowVoiceModal(false);
                            navigate(`/matching?q=${encodeURIComponent(phrase)}`);
                          }}
                          className="w-full text-left text-xs bg-white dark:bg-slate-800 hover:border-primary border border-outline-variant/20 dark:border-[#334155] p-2.5 rounded-lg text-on-surface dark:text-slate-300 font-semibold shadow-sm transition-all"
                        >
                          "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button action */}
              <button 
                type="button"
                onClick={cancelVoiceSearch}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-on-surface dark:text-white font-label-md text-label-md py-2.5 rounded-lg transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
