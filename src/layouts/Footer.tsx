import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface border-t border-border py-6 mt-auto">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink/60">
        <p className="font-semibold text-center md:text-left">
          Made with ❤️ and ☕ for DYLP Hackathon
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:tahatabassum9@gmail.com"
            className="hover:text-primary transition-colors font-medium"
          >
            tahatabassum9@gmail.com
          </a>
          <span className="hidden md:inline text-ink/30">|</span>
          <a
            href="mailto:mabdullahramday08@gmail.com"
            className="hover:text-primary transition-colors font-medium"
          >
            mabdullahramday08@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
};
