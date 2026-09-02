import React, { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './layouts/Navbar';
import { BottomNav } from './layouts/BottomNav';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Auth from './pages/Auth';
import AIMatching from './pages/AIMatching';
import ProviderList from './pages/ProviderList';
import ProviderProfile from './pages/ProviderProfile';
import ConfirmBooking from './pages/ConfirmBooking';
import Chat from './pages/Chat';
import MyBookings from './pages/MyBookings';
import Inbox from './pages/Inbox';
import Profile from './pages/Profile';
import { Safety } from './pages/Safety';
import { Categories } from './pages/Categories';
import LiveTracking from './pages/LiveTracking';
import NotFound from './pages/NotFound';
import { seedDatabase } from './utils/seedData';
import { Footer } from './layouts/Footer';
import { SiteAgentWidget } from './components/features/SiteAgentWidget';
import { createOnlineAlertNotification, sendOnlineAlertEmail } from './services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Bell } from 'lucide-react';

// Layout component to selectively wrap pages with header/footer navigation
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user, userProfile, updateProfile } = useAuth();
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  
  useEffect(() => {
    // Run database seeding on app startup
    seedDatabase();
  }, []);

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'accept-invite') {
      const clientId = params.get('clientId');
      const clientEmail = params.get('clientEmail');
      const clientName = params.get('clientName');
      const category = params.get('category');
      const city = params.get('city');

      if (clientId) {
        const inviteData = { clientId, clientEmail, clientName, category, city };
        localStorage.setItem('pending_invite', JSON.stringify(inviteData));
        // Clean URL search query to keep URL clean
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Load pending invite if user is logged in as a provider
    if (userProfile && userProfile.role === 'provider') {
      const savedInvite = localStorage.getItem('pending_invite');
      if (savedInvite) {
        setPendingInvite(JSON.parse(savedInvite));
      }
    } else {
      setPendingInvite(null);
    }
  }, [location, userProfile]);

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !user || !userProfile) return;
    try {
      // Toggle status to online
      await updateProfile({ available: true });

      // Notify customer back
      const { clientId, clientEmail, clientName, category, city } = pendingInvite;
      await createOnlineAlertNotification(clientId, user.uid, userProfile.name, category || '');
      await sendOnlineAlertEmail(clientEmail || '', userProfile.name, clientName || 'Customer', category || '', city || '');

      // Show success toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      console.error("Error accepting invitation:", err);
    } finally {
      localStorage.removeItem('pending_invite');
      setPendingInvite(null);
    }
  };

  const handleDismissInvite = () => {
    localStorage.removeItem('pending_invite');
    setPendingInvite(null);
  };

  // Suppress navigation on Auth screen (as per "The Filter" rule for transactional/onboarding pages)
  const isAuthScreen = location.pathname.startsWith('/auth');

  // Detect fallback 404 page paths to keep them standalone
  const validRoutes = ['/', '/auth', '/matching', '/providers', '/booking', '/chat', '/inbox', '/profile', '/bookings', '/safety', '/categories'];
  const isNotFound = !validRoutes.some(route => {
    if (route === '/') return location.pathname === '/';
    return location.pathname.startsWith(route);
  }) && !location.pathname.startsWith('/provider/') && !location.pathname.startsWith('/track/');

  const hideNav = isAuthScreen || isNotFound;

  return (
    <div className="flex flex-col min-h-screen relative">
      {!hideNav && <Navbar />}
      
      {/* Dynamic Invitation Overlay Modal */}
      <AnimatePresence>
        {pendingInvite && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-surface dark:bg-[#121A15] border border-border dark:border-[#203026] rounded-2xl p-6 max-w-md w-full shadow-large relative overflow-hidden"
            >
              {/* Background gradient blur decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse" />
              
              <div className="flex gap-4 items-start relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Bell className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg text-ink">Urgent Job Request!</h3>
                  <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                    Customer <strong className="text-primary">{pendingInvite.clientName}</strong> is looking for a <strong className="text-ink">{pendingInvite.category}</strong> in your city (<strong className="text-ink">{pendingInvite.city}</strong>) right now.
                  </p>
                  <p className="text-[11px] text-ink/50 mt-2 font-medium">
                    Go online now to notify the customer you are available for work!
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end relative z-10">
                <button
                  onClick={handleDismissInvite}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-ink/70 hover:bg-surface-raised dark:hover:bg-surface-raised/40 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleAcceptInvite}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-soft hover:bg-primary/95 transition-all flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Go Online & Notify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Acceptance Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-[110] bg-emerald-600 text-white p-4 rounded-xl shadow-large flex items-center justify-between gap-3 font-sans"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">You are now ONLINE!</p>
                <p className="text-[10px] text-white/80">The customer has been notified and can book your service.</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow flex flex-col">
        <div className="flex-grow">
          <Outlet />
        </div>
        {!hideNav && <Footer />}
      </main>
      {!hideNav && <BottomNav />}
      {!hideNav && <SiteAgentWidget />}
    </div>
  );
};

// Router definition
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { 
        path: '', 
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'auth', 
        element: <Auth /> 
      },
      { 
        path: 'matching', 
        element: (
          <ProtectedRoute>
            <AIMatching />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'providers', 
        element: (
          <ProtectedRoute>
            <ProviderList />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'provider/:id', 
        element: (
          <ProtectedRoute>
            <ProviderProfile />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'booking', 
        element: (
          <ProtectedRoute>
            <ConfirmBooking />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'chat', 
        element: (
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'inbox', 
        element: (
          <ProtectedRoute>
            <Inbox />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'profile', 
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'bookings', 
        element: (
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'safety', 
        element: (
          <ProtectedRoute>
            <Safety />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'categories', 
        element: (
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        ) 
      },
      { 
        path: 'track/:id', 
        element: (
          <ProtectedRoute>
            <LiveTracking />
          </ProtectedRoute>
        ) 
      },
      {
        path: '*',
        element: <NotFound />
      }
    ],
  },
]);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
