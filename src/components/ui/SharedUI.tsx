import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  
  const rotateX = useTransform(y, [0, 1], [6, -6]);
  const rotateY = useTransform(x, [0, 1], [-6, 6]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only tilt on desktop screens (width >= 768px)
    if (window.innerWidth < 768) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`bg-surface-raised rounded-2xl shadow-soft border border-border p-6 md:p-8 hover:shadow-[0_20px_40px_-20px_rgba(20,35,28,0.15)] dark:hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] transition-shadow duration-300 w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative overflow-hidden bg-ink/5 dark:bg-ink/10 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5" />
    </div>
  );
};

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`text-center max-w-md mx-auto py-12 px-6 flex flex-col items-center justify-center space-y-4 relative ${className}`}>
      {/* Background Seal Watermark */}
      <div className="absolute inset-0 seal-watermark opacity-[0.03] dark:opacity-[0.04] pointer-events-none" />
      
      <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
        <Icon className="w-8 h-8" />
      </div>
      <h2 className="relative z-10 text-xl font-display font-semibold text-ink leading-tight">{title}</h2>
      <p className="relative z-10 text-sm text-ink/75 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="relative z-10 bg-primary hover:bg-primary-hover active:scale-95 text-white dark:text-ink font-semibold py-3 px-6 rounded-xl transition-all shadow-soft text-sm w-full"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'w-12 h-12' }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (src && src.trim() !== '' && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover border border-border shrink-0 ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`rounded-full bg-surface-raised text-primary font-bold flex items-center justify-center border border-border select-none shrink-0 font-sans text-xs md:text-sm tracking-wide ${className}`}>
      {initials}
    </div>
  );
};
