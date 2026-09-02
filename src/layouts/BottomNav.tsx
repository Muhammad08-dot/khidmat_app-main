import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const BottomNav: React.FC = () => {
  const tabs = [
    { to: "/", label: "Home", icon: Home },
    { to: "/bookings", label: "Bookings", icon: Calendar },
    { to: "/inbox", label: "Messages", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: User }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface/90 dark:bg-[#0F1712]/90 backdrop-blur-md border-t border-border pb-safe pt-2.5 px-3 shadow-[0_-4px_20px_-2px_rgba(20,35,28,0.08)] transition-all">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="flex-1 flex justify-center"
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative py-2 px-4 flex flex-col items-center justify-center rounded-full cursor-pointer w-full max-w-[80px]"
              >
                {/* Active pill background tracker */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}

                <Icon 
                  className={`relative z-10 w-5.5 h-5.5 transition-transform duration-300 ${
                    isActive 
                      ? '-translate-y-[2px] text-primary dark:text-[#6bff8f]' 
                      : 'text-ink/60'
                  }`} 
                />
                
                <span 
                  className={`relative z-10 text-[9px] font-sans mt-1 tracking-wide transition-all duration-300 ${
                    isActive 
                      ? 'opacity-100 font-bold text-primary dark:text-[#6bff8f]' 
                      : 'opacity-70 text-ink/70'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
