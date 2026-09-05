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
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Generated QES Ford Logo Image with fallback SVG */}
      <div className={`relative ${logoDimensions[size]} rounded-xl overflow-hidden border border-white/20 shadow-lg shadow-cyan-500/10 shrink-0 bg-[#12141a]`}>
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
          <span className="font-mono font-black text-white tracking-wider text-xs sm:text-sm bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
            QES
          </span>
          <h1 className={`font-black ${titleSizes[size]} text-white uppercase tracking-tight leading-none`}>
            FORD <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-300">AUTOPARTS</span>
          </h1>
        </div>
        {showTagline && (
          <span className={`text-cyan-400 font-mono ${taglineSizes[size]} tracking-widest uppercase mt-1 font-semibold block leading-none`}>
            RELIABLE PRODUCT FOR YOU
          </span>
        )}
      </div>
    </div>
  );
};
