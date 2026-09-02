import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Wrench, Droplet, Hammer, Zap } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Dynamically load Poppins font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FBF8] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans select-none">
      
      {/* Background soft blurred circles & radial gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#74C69D]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-[#1F6B52]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main SaaS Card Container */}
      <div 
        className="max-w-[1050px] w-full bg-white border border-[#E8EEE9] rounded-[32px] shadow-xl pl-8 md:pl-16 pt-8 md:pt-16 pb-8 md:pb-0 pr-8 md:pr-0 relative overflow-hidden flex flex-col md:flex-row gap-8 items-stretch z-10"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Card subtle background dot accents - Top Left Grid (4x3 dots) */}
        <div className="absolute top-10 left-10 opacity-[0.25] hidden md:block">
          <div className="grid grid-cols-4 gap-x-2 gap-y-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full bg-[#1F3B32]/60" />
            ))}
          </div>
        </div>

        {/* Floating Low-Opacity Faint Tool Icons inside card */}
        <div className="absolute inset-0 pointer-events-none hidden md:block select-none overflow-hidden">
          {/* Hammer outline (Top center) */}
          <Hammer className="absolute top-[18%] left-[48%] text-[#1F6B52] opacity-[0.06] w-9 h-9 -rotate-[35deg]" />
          
          {/* Water drop outline (Bottom center-left) */}
          <Droplet className="absolute bottom-[28%] left-[34%] text-[#1F6B52] opacity-[0.06] w-7 h-7 -rotate-[15deg]" />

          {/* Wrench outline (Bottom center-right) */}
          <Wrench className="absolute bottom-[10%] left-[44%] text-[#1F6B52] opacity-[0.06] w-8 h-8 rotate-[45deg]" />

          {/* Lightning bolt outline (Bottom left) */}
          <Zap className="absolute bottom-[15%] left-[8%] text-[#1F6B52] opacity-[0.06] w-8 h-8 -rotate-[10deg]" />
        </div>

        {/* Left Section (45%) */}
        <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left justify-center pb-0 md:pb-16 relative z-20">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-[38px] md:text-[46px] lg:text-[52px] font-extrabold text-[#1F3B32] leading-[1.15] tracking-tight">
              Unexpected<br />
              Application Error!
            </h1>
          </motion.div>

          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="mt-3.5"
          >
            <p className="text-xl md:text-2xl font-bold text-[#74C69D] tracking-wide">
              404 Not Found
            </p>
          </motion.div>

          {/* Neutral Divider Accent */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-10 h-[3px] bg-[#74C69D] rounded-full my-5 origin-left"
          />

          <motion.div 
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-xs md:text-sm font-medium text-[#5F6F67]/90 leading-relaxed max-w-sm mb-7 flex flex-col gap-0.5"
          >
            <p>We couldn't find the page you're looking for.</p>
            <p>It might have been moved or doesn't exist.</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button
              onClick={() => navigate('/')}
              className="h-[52px] px-6 bg-white border border-[#E8EEE9] text-[#1F6B52] hover:bg-[#F8FBF8] text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 cursor-pointer font-sans"
            >
              <HomeIcon className="w-4 h-4" />
              Go Back to Home
            </button>
          </motion.div>
        </div>

        {/* Right Section (55%) */}
        <div className="w-full md:w-[55%] flex items-end justify-center relative min-h-[360px] md:min-h-[480px] z-10 overflow-hidden">
          
          {/* Soft Mint Circular Gradient Background centered */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#74C69D]/15 to-transparent rounded-full blur-2xl pointer-events-none animate-pulse" />

          {/* Goku Image Container with float and slide animations */}
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-full max-w-[340px] md:max-w-[480px] flex justify-center items-end"
          >
            <motion.img
              src="/goku_404.png"
              alt="Goku 404"
              className="w-full h-auto object-contain max-h-[380px] md:max-h-[500px] relative z-20 pointer-events-none select-none align-bottom"
              animate={{ y: [-6, 6, -6] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
