import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, CheckCircle2, PhoneCall, MapPin, Star } from 'lucide-react';
import { Card } from '../components/ui/SharedUI';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export const Safety: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const safetySteps = [
    {
      num: "01",
      title: "Active Phone Verification",
      icon: PhoneCall,
      description: "Contact numbers are validated via one-time passwords (OTP) to ensure clients can always reach the assigned professional in real-time.",
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
    },
    {
      num: "02",
      title: "Address & Location Confirmation",
      icon: MapPin,
      description: "Physical addresses are collected and verified. Geolocation pinning registers their exact service dispatch coordinates on our local maps.",
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
    },
    {
      num: "03",
      title: "Background & Reference Audit",
      icon: Shield,
      description: "We review local police records clearance (character certificate) and interview reference checks for initial screening before listing.",
      color: "from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400"
    },
    {
      num: "04",
      title: "In-App Performance Monitoring",
      icon: Star,
      description: "Ratings and feedback are monitored dynamically. Low ratings (under 4.2 stars) trigger warning notifications and system review, ensuring service standards.",
      color: "from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-purple-400"
    }
  ];

  useGSAP(() => {
    gsap.from('.safety-step-card', {
      opacity: 0,
      y: 25,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="pt-28 pb-28 md:pb-20 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto w-full relative">
      {/* Background Floaters */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-accent-sage/5 dark:bg-accent-sage/2 blur-3xl pointer-events-none ambient-orb-1" />
      <div className="absolute top-80 right-10 w-96 h-96 rounded-full bg-accent-gold/5 dark:bg-accent-gold/2 blur-3xl pointer-events-none ambient-orb-2" />
 
      {/* Header back button */}
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-ink hover:bg-surface-raised transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-bold text-3xl text-ink tracking-tight">Safety & Verification</h1>
          <p className="text-xs text-ink/65 mt-0.5">How we secure your home service experience</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 relative z-10">
        {/* Main Banner */}
        <Card className="p-6 md:p-10 gradient-mesh-bg border border-border relative overflow-hidden shadow-soft rounded-2xl flex flex-col md:flex-row gap-6 items-center">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display font-bold text-xl md:text-2xl text-ink">Our 4-Step Safety Check</h2>
            <p className="text-xs font-semibold text-primary dark:text-[#6bff8f] uppercase tracking-wider mt-0.5">Verified Service Professionals</p>
            <p className="text-sm text-ink/75 leading-relaxed mt-2 max-w-3xl">
              At Khidmat, your safety and satisfaction are our top priorities. Every registered service provider undergoes a comprehensive 4-step background and validation check before they can accept bookings.
            </p>
          </div>
        </Card>

        {/* Steps Horizontal Grid */}
        <div className="safety-steps-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safetySteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card 
                key={idx} 
                className="safety-step-card p-6 flex flex-col justify-between border border-border hover:border-primary/40 hover:shadow-medium hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group min-h-[220px]"
              >
                {/* Large Background Step Number */}
                <div className="absolute right-4 bottom-0 text-7xl font-black font-display text-ink/5 dark:text-[#6bff8f]/5 select-none group-hover:scale-110 transition-transform duration-500">
                  {step.num}
                </div>

                <div>
                  {/* Icon with gradient background */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center border border-border shrink-0 shadow-soft mb-4 group-hover:rotate-6 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                    {step.num}. {step.title}
                  </h3>
                  
                  <p className="text-xs text-ink/65 leading-relaxed mt-3 relative z-10">
                    {step.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-accent-gold dark:text-[#ffd700] uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified Check
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
