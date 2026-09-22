import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Tv, Smartphone, Settings, Volume2, VolumeX, RefreshCw, ExternalLink, Sun, Moon } from 'lucide-react';
import { audioNotifier } from '../lib/audioNotifier';
import { t } from '../lib/i18n';
import { QESFordLogo } from './QESFordLogo';

interface HeaderNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  connected: boolean;
  incomingCount: number;
  inProgressCount: number;
  completedCount: number;
  onResetData: () => void;
  isLargeScreen?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onViewChange,
  connected,
  onResetData,
  isLargeScreen,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(audioNotifier.getMutedStatus());
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('qes_clay_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
      localStorage.setItem('qes_clay_theme', 'dark');
    } else {
      document.body.classList.remove('theme-dark');
      localStorage.setItem('qes_clay_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCurrentDate(
        d.toLocaleDateString('ms-MY', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAudio = () => {
    const muted = audioNotifier.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioNotifier.playChime('completed');
    }
  };

  const handleOpenStandaloneTv = () => {
    window.open(window.location.pathname + '?view=tv', '_blank');
  };

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 py-2.5 transition-colors">
      <div className="w-full clay-card px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left Brand Identifier (QES Ford Autoparts) */}
        <QESFordLogo size="md" />

        {/* Center Mode Badge & Navigation Toggle */}
        <div className="flex items-center gap-2">
          {currentView === 'settings' ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c45c3d]/10 text-[#c45c3d] dark:text-[#e08166] dark:bg-[#c45c3d]/20 font-serif font-bold text-xs clay-pill">
              <Settings className="w-3.5 h-3.5 animate-spin-slow text-[#c45c3d]" />
              <span>{t('setupTicker')}</span>
            </div>
          ) : currentView === 'tv' ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c382f]/10 text-[#1c382f] dark:text-[#a3c9bb] dark:bg-[#1c382f]/40 font-serif font-bold text-xs clay-pill" title="Paparan TV (Dikesan Automatik)">
              <Tv className="w-3.5 h-3.5 text-[#1c382f] dark:text-[#a3c9bb]" />
              <span className="hidden sm:inline">{t('tvView')}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1c382f]/20 text-[#1c382f] dark:text-[#d3e5dc] font-mono font-extrabold ml-1">AUTO</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#cca152]/20 text-[#7a5a1f] dark:text-[#dfb974] font-serif font-bold text-xs clay-pill" title="Konsol Operator Mobil">
              <Smartphone className="w-3.5 h-3.5 text-[#a87a25]" />
              <span className="hidden sm:inline">{t('operatorControl')}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#cca152]/30 text-[#614512] dark:text-[#fae5be] font-mono font-extrabold ml-1">AUTO</span>
            </div>
          )}

          {/* Settings / Tetapan Button */}
          <button
            onClick={() => onViewChange(currentView === 'settings' ? (isLargeScreen ? 'tv' : 'mobile') : 'settings')}
            className={`clay-btn px-4 py-1.5 text-xs font-serif font-semibold tracking-wide ${
              currentView === 'settings'
                ? 'clay-btn-primary'
                : 'clay-btn-neutral'
            }`}
            title="Sediakan Pengumuman Ticker / Tetapan Bengkel"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden md:inline">{currentView === 'settings' ? 'Tutup Tetapan' : 'Tetapan'}</span>
          </button>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full clay-pill bg-white/70 dark:bg-[#152720] text-xs font-medium text-[#2d4036] dark:text-[#c4d8ce]">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#2b7256] shadow-sm shadow-[#2b7256]/50 animate-pulse' : 'bg-red-500'}`}></span>
            <span>{connected ? t('online') : t('offline')}</span>
          </div>

          {/* Clock Inset Display */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1 rounded-2xl clay-inset text-right font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-[#867667] dark:text-[#8ea397] tracking-wider leading-tight">{t('currentTime')}</span>
              <span className="text-sm font-bold text-[#1c382f] dark:text-[#dfb974] leading-tight">{currentTime}</span>
            </div>
            <div className="w-[1px] h-5 bg-[#d8ccb8] dark:bg-[#253e34]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-[#867667] dark:text-[#8ea397] tracking-wider leading-tight">{t('date')}</span>
              <span className="text-[11px] font-semibold text-[#42372d] dark:text-[#d3ded8] leading-tight">{currentDate}</span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="clay-btn clay-btn-neutral p-2 rounded-full"
            title={isDarkMode ? 'Tukar ke Tema Parchment Terang' : 'Tukar ke Tema Forest Gelap'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-[#dfb974]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1c382f]" />
            )}
          </button>

          {/* Audio Toggle Button */}
          <button
            onClick={handleToggleAudio}
            className={`clay-btn p-2 rounded-full ${
              isMuted
                ? 'clay-btn-rose'
                : 'clay-btn-neutral text-[#1c382f] dark:text-[#dfb974]'
            }`}
            title={isMuted ? 'Audio Dinyahaktifkan' : 'Audio Aktif'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Standalone Window Button */}
          <button
            onClick={handleOpenStandaloneTv}
            className="clay-btn clay-btn-neutral p-2 rounded-full hidden sm:flex"
            title="Buka Paparan TV dalam Tetingkap Baharu"
          >
            <ExternalLink className="w-4 h-4 text-[#2b4036] dark:text-[#c4d8ce]" />
          </button>

          {/* Reset Demo Data Button */}
          {confirmReset ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="clay-btn clay-btn-rose px-3 py-1.5 text-xs font-serif"
              >
                {t('reset')}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="clay-btn clay-btn-neutral px-2.5 py-1.5 text-xs text-[#5c4f42]"
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="clay-btn clay-btn-neutral p-2 rounded-full hidden md:flex text-[#8c7e70] hover:text-[#c45c3d]"
              title="Set Semula Data Sampel"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

