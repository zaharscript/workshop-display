import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Tv, Smartphone, Settings, Volume2, VolumeX, RefreshCw, ExternalLink } from 'lucide-react';
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
    <header className="bg-[#282a2c] border-b border-white/10 text-slate-100 sticky top-0 z-40 shadow-2xl backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left Brand Identifier (QES Ford Autoparts) */}
        <QESFordLogo size="md" />

        {/* Center Auto-Detect Mode Badge & Settings Switch */}
        <div className="flex items-center gap-2">
          {currentView === 'settings' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold uppercase shadow-sm">
              <Settings className="w-4 h-4 animate-spin-slow" />
              <span>{t('setupTicker')}</span>
            </div>
          ) : currentView === 'tv' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase shadow-sm" title="Paparan TV (Dikesan Automatik mengikut Saiz Skrin Besar)">
              <Tv className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t('tvView')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 font-semibold ml-1">AUTO</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold uppercase shadow-sm" title="Konsol Mobil Operator (Dikesan Automatik mengikut Saiz Skrin Mobil)">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('operatorControl')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-semibold ml-1">AUTO</span>
            </div>
          )}

          {/* Settings / Tetapan Toggle Button */}
          <button
            onClick={() => onViewChange('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wide uppercase transition-all duration-200 border ${
              currentView === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/50 shadow-lg'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Sediakan Pengumuman Ticker / Tetapan Bengkel"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">{currentView === 'settings' ? 'Tutup Tetapan' : 'Tetapan'}</span>
          </button>
        </div>

        {/* Right Status & Clock Controls */}
        <div className="flex items-center gap-4">
          {/* Live Sync Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-white/80">{connected ? t('online') : t('offline')}</span>
          </div>

          {/* Clock Display */}
          <div className="hidden md:flex gap-6 text-right">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-40 font-mono tracking-wider">{t('currentTime')}</span>
              <span className="text-xl font-light font-mono text-cyan-400">{currentTime}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-40 font-mono tracking-wider">{t('date')}</span>
              <span className="text-xl font-light font-mono text-white/90">{currentDate}</span>
            </div>
          </div>

          {/* Audio Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-red-950/40 text-red-400 border-red-500/30 hover:bg-red-900/50'
                : 'bg-white/5 text-cyan-400 border-white/10 hover:bg-white/10'
            }`}
            title={isMuted ? 'Audio Dinyahaktifkan' : 'Audio Aktif'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Open TV in New Window */}
          <button
            onClick={handleOpenStandaloneTv}
            className="p-2.5 rounded-xl bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all hidden sm:flex"
            title="Buka Paparan TV dalam Tetingkap Baharu"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Reset Demo Data Confirmation */}
          {confirmReset ? (
            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 rounded-lg text-xs bg-red-600 text-white font-bold hover:bg-red-500 shadow-md"
              >
                {t('reset')}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20"
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="p-2.5 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:text-red-400 hover:border-red-500/30 transition-all hidden md:flex"
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
