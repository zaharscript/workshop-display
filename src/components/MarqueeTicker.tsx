import React from 'react';
import { Announcement } from '../types';
import { Volume2, Megaphone } from 'lucide-react';
import { t } from '../lib/i18n';

interface MarqueeTickerProps {
  announcements: Announcement[];
  recentCompletedPlate?: { plate: string; owner: string } | null;
}

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({ announcements, recentCompletedPlate }) => {
  const activeAnnouncements = announcements.filter((a) => a.active);
  const tickerText =
    activeAnnouncements.length > 0
      ? activeAnnouncements.map((a) => a.text).join('   ✦   ')
      : t('defaultTickerText');

  return (
    <div className="bg-[#282a2c] border-t border-white/10 text-white flex items-center h-14 overflow-hidden px-6 relative shadow-2xl z-30">
      {/* Alert Highlight Banner if a vehicle recently completed */}
      {recentCompletedPlate ? (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-slate-950 font-black flex items-center justify-center px-4 z-20 animate-pulse font-mono">
          <Volume2 className="w-5 h-5 mr-3 animate-bounce text-slate-950" />
          <span className="text-sm tracking-wider uppercase">
            🎉 {t('attentionCarPlate')}{' '}
            <span className="bg-slate-950 text-emerald-400 px-2.5 py-1 rounded ml-1 mr-1">
              {recentCompletedPlate.plate}
            </span>{' '}
            UNTUK {recentCompletedPlate.owner.toUpperCase()} {t('isReadyForPickup')}
          </span>
        </div>
      ) : null}

      {/* Marquee Label (Immersive UI Style) */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-md shadow-md z-10 shrink-0 mr-4 tracking-wider">
        <Megaphone className="w-4 h-4" />
        <span>{t('announcements')}</span>
      </div>

      {/* Scrolling Container */}
      <div className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center">
        <div className="inline-block animate-[marquee_28s_linear_infinite] hover:[animation-play-state:paused] font-mono text-xs tracking-wider text-cyan-300/90">
          <span className="mx-8">{tickerText}</span>
          <span className="mx-8">{tickerText}</span>
        </div>
      </div>
    </div>
  );
};
