import React from 'react';
import qesFordLogoImg from '../assets/images/qes_ford_logo_1785776614306.jpg';

interface QESFordLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const QESFordLogo: React.FC<QESFordLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const logoDimensions = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-15 h-15',
  };

  const titleSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Generated QES Ford Logo Image with vintage artisan frame */}
      <div
        className={`relative ${logoDimensions[size]} rounded-2xl overflow-hidden shrink-0 border-2 border-[#d9cdb8] dark:border-[#2f5547] transition-transform duration-200 hover:scale-105 shadow-sm`}
      >
        <img
          src={qesFordLogoImg}
          alt="QES Ford Autoparts Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Typography Brand Identifier */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className="font-serif italic font-bold text-xs sm:text-sm px-2 py-0.5 rounded-full border border-[#c45c3d]/30 bg-[#c45c3d]/10 text-[#c45c3d] dark:text-[#e08166] dark:bg-[#c45c3d]/20"
          >
            QES
          </span>
          <h1 className={`font-serif font-black ${titleSizes[size]} text-[#1c382f] dark:text-[#f7f2e9] tracking-tight leading-none`}>
            Ford <span className="text-[#c45c3d] dark:text-[#df785d] font-normal italic">Autoparts</span>
          </h1>
        </div>
        {showTagline && (
          <span className={`text-[#7c6a58] dark:text-[#a8bdb2] font-serif italic ${taglineSizes[size]} tracking-wide mt-1 block leading-none flex items-center gap-1`}>
            <span>Reliable Product For You</span>
            <span className="text-[#c45c3d] opacity-80 not-italic">❦</span>
          </span>
        )}
      </div>
    </div>
  );
};


