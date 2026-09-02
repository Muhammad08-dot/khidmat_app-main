import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { CATEGORIES } from './Home';

export const Categories: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/matching?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="pt-28 pb-28 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      {/* Header back button */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink hover:bg-surface transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-medium text-2xl text-ink">All Specialties &amp; Categories</h1>
          <p className="text-sm text-ink/60">Select a specialty to find verified pros across Pakistan</p>
        </div>
      </div>

      {/* Categories Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-gutter">
        {CATEGORIES.map((cat, index) => {
          const IconComponent = cat.icon;
          // Dynamically map category colors based on specialty type for rich aesthetics
          const lowercaseName = cat.name.toLowerCase();
          let customColors = {
            bg: 'hover:bg-accent-gold/10 hover:border-accent-gold/30',
            text: 'text-accent-gold',
            iconBg: 'bg-accent-gold/10'
          };
          if (lowercaseName.includes('plumber') || lowercaseName.includes('ac') || lowercaseName.includes('mechanic') || lowercaseName.includes('movers') || lowercaseName.includes('cctv') || lowercaseName.includes('video') || lowercaseName.includes('caterer')) {
            customColors = {
              bg: 'hover:bg-accent-sky/10 hover:border-accent-sky/30',
              text: 'text-accent-sky',
              iconBg: 'bg-accent-sky/10'
            };
          } else if (lowercaseName.includes('painter') || lowercaseName.includes('carpenter') || lowercaseName.includes('cleaner') || lowercaseName.includes('gardener') || lowercaseName.includes('mason') || lowercaseName.includes('handyman')) {
            customColors = {
              bg: 'hover:bg-accent-sage/10 hover:border-accent-sage/30',
              text: 'text-accent-sage',
              iconBg: 'bg-accent-sage/10'
            };
          }

          return (
            <motion.button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex flex-col items-center justify-center p-lg bg-surface-raised rounded-xl shadow-soft hover:shadow-md transition-all group border border-border ${customColors.bg}`}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.01 }}
            >
              <div className={`w-14 h-14 rounded-2xl ${customColors.iconBg} flex items-center justify-center mb-md group-hover:scale-110 group-hover:rotate-[8deg] transition-all duration-300`}>
                <IconComponent className={`w-7 h-7 ${customColors.text}`} />
              </div>
              <span className="font-label-md text-label-md text-ink text-center line-clamp-1">
                {cat.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
