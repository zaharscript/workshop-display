import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Tv, Smartphone, Settings, Volume2, VolumeX, RefreshCw, Radio, ExternalLink, ShieldCheck } from 'lucide-react';
import { audioNotifier } from '../lib/audioNotifier';

interface HeaderNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  connected: boolean;
  incomingCount: number;
  inProgressCount: number;
  completedCount: number;
  onResetData: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onViewChange,
  connected,
  incomingCount,
  inProgressCount,
  completedCount,
  onResetData,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(audioNotifier.getMutedStatus());
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCurrentDate(
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
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
    <header className="bg-[#0a0b0e] border-b border-white/10 text-slate-100 sticky top-0 z-40 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left Brand Identifier (Immersive UI Style) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-mono font-black text-lg">
            PA
          </div>
          <div>
            <span className="text-[#3b82f6] font-mono text-[11px] tracking-widest uppercase block leading-none mb-1">
              SYSTEM ONLINE // LIVE DASHBOARD
            </span>
            <h1 className="font-black text-xl text-white uppercase tracking-tighter leading-none flex items-center gap-2">
              PRECISION <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">AUTO-WORKSHOP</span>
            </h1>
          </div>
        </div>

        {/* Center Navigation Channel Tabs */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => onViewChange('tv')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold font-mono tracking-wide uppercase transition-all duration-200 ${
              currentView === 'tv'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="TV Monitor View (Live Dashboard)"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden md:inline">TV View</span>
            <span className="md:hidden">TV</span>
          </button>

          <button
            onClick={() => onViewChange('mobile')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold font-mono tracking-wide uppercase transition-all duration-200 ${
              currentView === 'mobile'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Mobile / Staff Operator Console"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:inline">Operator Control</span>
            <span className="md:hidden">Mobile</span>
          </button>

          <button
            onClick={() => onViewChange('settings')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold font-mono tracking-wide uppercase transition-all duration-200 ${
              currentView === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Workshop Announcements & Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Setup & Ticker</span>
            <span className="md:hidden">Settings</span>
          </button>
        </div>

        {/* Right Status & Clock Controls (Immersive UI Style) */}
        <div className="flex items-center gap-4">
          {/* Live Sync Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-white/80">{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Clock Display */}
          <div className="hidden md:flex gap-6 text-right">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-40 font-mono tracking-wider">Current Time</span>
              <span className="text-xl font-light font-mono text-cyan-400">{currentTime}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-40 font-mono tracking-wider">Date</span>
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
            title={isMuted ? 'Audio Muted' : 'Audio Active'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Open TV in New Window */}
          <button
            onClick={handleOpenStandaloneTv}
            className="p-2.5 rounded-xl bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all hidden sm:flex"
            title="Open Standalone TV View"
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
                Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="p-2.5 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:text-red-400 hover:border-red-500/30 transition-all hidden md:flex"
              title="Reset Sample Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
