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
    <div className="px-3 sm:px-6 py-2 z-30">
      <div className="clay-card flex items-center h-13 overflow-hidden px-4 sm:px-6 relative border border-[#e2d6c3] dark:border-[#2f5345]">
        {/* Alert Highlight Banner if a vehicle recently completed */}
        {recentCompletedPlate ? (
          <div className="absolute inset-0 bg-gradient-to-r from-[#1c382f] via-[#2a5647] to-[#1c382f] text-[#f7f2e9] font-serif font-bold flex items-center justify-center px-4 z-20 animate-pulse shadow-inner">
            <Volume2 className="w-5 h-5 mr-3 animate-bounce text-[#dfb974]" />
            <span className="text-sm tracking-wide">
              ❧ {t('attentionCarPlate')}{' '}
              <span className="bg-[#c45c3d] text-white px-3 py-0.5 rounded-full mx-1 shadow-sm font-mono font-bold">
                {recentCompletedPlate.plate}
              </span>{' '}
              UNTUK {recentCompletedPlate.owner.toUpperCase()} {t('isReadyForPickup')} ❧
            </span>
          </div>
        ) : null}

        {/* Marquee Label (Botanical Pill Style) */}
        <div className="clay-btn clay-btn-forest px-3.5 py-1 text-xs uppercase z-10 shrink-0 mr-4 tracking-wider gap-1.5 shadow-sm font-serif font-semibold">
          <Megaphone className="w-3.5 h-3.5 text-[#dfb974]" />
          <span>{t('announcements')}</span>
        </div>

        {/* Scrolling Container */}
        <div className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center">
          <div className="inline-block animate-[marquee_32s_linear_infinite] hover:[animation-play-state:paused] font-serif text-xs font-semibold tracking-wide text-[#34483e] dark:text-[#cde0d7]">
            <span className="mx-8">{tickerText}</span>
            <span className="mx-8">{tickerText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};


