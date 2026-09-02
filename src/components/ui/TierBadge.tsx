import React from 'react';

interface TierBadgeProps {
  tier: string;
  className?: string;
  showIcon?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  className = '',
  showIcon = true
}) => {
  const normalizedTier = tier.trim().toLowerCase();

  let ringColor = 'border-accent-gold/40';
  let borderColor = 'border-accent-gold/30';
  let textColor = 'text-accent-gold';
  let letter = 'B';

  switch (normalizedTier) {
    case 'platinum':
      ringColor = 'border-accent-sky/60 dark:border-accent-sky/80';
      borderColor = 'border-accent-sky/40 dark:border-accent-sky/60';
      textColor = 'text-accent-sky';
      letter = 'P';
      break;
    case 'gold':
      ringColor = 'border-accent-gold/60 dark:border-accent-gold/80';
      borderColor = 'border-accent-gold/40 dark:border-accent-gold/60';
      textColor = 'text-accent-gold';
      letter = 'G';
      break;
    case 'silver':
      ringColor = 'border-accent-sage/60 dark:border-accent-sage/80';
      borderColor = 'border-accent-sage/40 dark:border-accent-sage/60';
      textColor = 'text-accent-sage';
      letter = 'S';
      break;
    case 'bronze':
    default:
      ringColor = 'border-accent-terracotta/60 dark:border-accent-terracotta/80';
      borderColor = 'border-accent-terracotta/40 dark:border-accent-terracotta/60';
      textColor = 'text-accent-terracotta';
      letter = 'B';
      break;
  }

  return (
    <div className={`inline-flex items-center gap-2 group cursor-pointer select-none ${className}`}>
      {showIcon && (
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          {/* Outer dotted/dashed seal ring */}
          <div className={`absolute inset-0 rounded-full border border-dashed animate-[spin_20s_linear_infinite] group-hover:[animation-play-state:paused] ${ringColor}`} />
          {/* Inner double-ring boundary */}
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-display font-extrabold text-[10px] shadow-soft bg-surface-raised ${textColor} ${borderColor}`}>
            {letter}
          </div>
        </div>
      )}
      <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${textColor}`}>{tier}</span>
    </div>
  );
};

export default TierBadge;
