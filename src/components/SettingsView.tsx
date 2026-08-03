import React, { useState } from 'react';
import { Announcement, Mechanic } from '../types';
import { Megaphone, Plus, Wrench, RefreshCw, Check, Database, Radio, ShieldCheck, Info } from 'lucide-react';

interface SettingsViewProps {
  announcements: Announcement[];
  mechanics: Mechanic[];
  onAddAnnouncement: (text: string, type: 'info' | 'alert' | 'promo') => Promise<void>;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  announcements,
  mechanics,
  onAddAnnouncement,
  onResetData,
}) => {
  const [newTickerText, setNewTickerText] = useState('');
  const [tickerType, setTickerType] = useState<'info' | 'alert' | 'promo'>('info');
  const [addingTicker, setAddingTicker] = useState(false);
  const [resetDoneMsg, setResetDoneMsg] = useState('');

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerText.trim()) return;
    setAddingTicker(true);
    try {
      await onAddAnnouncement(newTickerText.trim(), tickerType);
      setNewTickerText('');
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTicker(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the workshop queue to sample preset data?')) {
      await onResetData();
      setResetDoneMsg('Workshop queue data reset successfully!');
      setTimeout(() => setResetDoneMsg(''), 4000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0a0b0e] text-[#e0e0e0] p-4 sm:p-6 pb-24 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#15171e] border border-white/10 p-6 rounded-xl shadow-2xl">
          <span className="text-[#3b82f6] font-mono text-[11px] tracking-widest uppercase block mb-1">
            SYSTEM SETUP // CONFIGURATION
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            WORKSHOP SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">TELEMETRY & TV TICKER CONTROL</span>
          </h2>
          <p className="text-xs text-white/50 mt-1 font-mono">
            Configure live customer TV announcements, view staff technician roster, and manage system database state.
          </p>
        </div>

        {/* Section 1: Live Marquee Announcement Ticker Control */}
        <div className="bg-[#15171e] border border-white/10 rounded-xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Megaphone className="w-5 h-5 font-bold" />
            <h3 className="font-mono font-bold text-base tracking-widest uppercase text-white">
              TV DISPLAY MARQUEE TICKER ANNOUNCEMENTS
            </h3>
          </div>

          {/* Add New Announcement Form */}
          <form onSubmit={handleAddTicker} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Type customer notice (e.g. SPECIAL PROMO: 15% OFF TRANSMISSION OIL CHANGE)"
              value={newTickerText}
              onChange={(e) => setNewTickerText(e.target.value)}
              className="flex-1 bg-[#161922] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-full font-mono"
            />
            <select
              value={tickerType}
              onChange={(e) => setTickerType(e.target.value as 'info' | 'alert' | 'promo')}
              className="bg-[#161922] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 shrink-0 font-mono"
            >
              <option value="info">Info Notice</option>
              <option value="alert">Alert / Urgent</option>
              <option value="promo">Special Offer</option>
            </select>
            <button
              type="submit"
              disabled={addingTicker}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Ticker
            </button>
          </form>

          {/* Active Tickers List */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider">Active TV Tickers</h4>
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-[#161922] border border-white/10 p-3 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ann.type === 'alert'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : ann.type === 'promo'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}
                  >
                    {ann.type}
                  </span>
                  <span className="font-semibold text-white/90">{ann.text}</span>
                </div>
                <span className="text-[10px] text-white/40">
                  {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Technician Roster */}
        <div className="bg-[#15171e] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Wrench className="w-5 h-5 font-bold" />
            <h3 className="font-mono font-bold text-base tracking-widest uppercase text-white">
              WORKSHOP TECHNICIANS & MECHANIC STAFF
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mechanics.map((m) => (
              <div key={m.id} className="bg-[#161922] border border-white/10 p-4 rounded-xl flex items-center gap-3">
                <img src={m.avatarUrl} alt={m.name} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-900" />
                <div>
                  <h4 className="font-bold text-xs text-white">{m.name}</h4>
                  <p className="text-[11px] text-cyan-400 font-mono">{m.specialty}</p>
                  <p className="text-[10px] text-white/40 mt-1 font-mono">
                    Active Jobs: <span className="font-bold text-white">{m.activeJobsCount}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: System Architecture & Firebase Cost-Optimization Note */}
        <div className="bg-[#15171e] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4 font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <Database className="w-5 h-5 font-bold" />
            <h3 className="font-bold text-base tracking-widest uppercase text-white">
              ARCHITECTURE & DATABASE OPTIMIZATION
            </h3>
          </div>

          <div className="bg-[#161922] border border-white/10 p-4 rounded-xl text-xs space-y-2 text-white/70 leading-relaxed">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
              <Info className="w-4 h-4" />
              <span>Surau Display Skeleton Mirroring Specification:</span>
            </div>
            <p>
              • <strong>Dual Display Channels:</strong> TV View is strictly optimized for public display monitors (no edit forms or inputs visible), while Mobile View allows authorized operators to update car repair progress.
            </p>
            <p>
              • <strong>Cost Optimization Strategy:</strong> Photos are served via high-performance cached vehicle image assets to keep database payloads lightweight (storing text identifiers & image references in Firestore/Express).
            </p>
            <p>
              • <strong>Real-Time Synchronization:</strong> Real-time status changes triggered on Mobile View instantly propagate to the TV monitor via Server-Sent Events (SSE) and cross-tab BroadcastChannel.
            </p>
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <div>
              <p className="text-xs font-bold text-white">Reset Workshop Queue</p>
              <p className="text-[11px] text-white/40">Restores initial Malaysian/International sample queue data</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs flex items-center gap-1.5 border border-white/10"
            >
              <RefreshCw className="w-4 h-4" /> Reset Sample Data
            </button>
          </div>

          {resetDoneMsg && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 text-xs font-bold">
              {resetDoneMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
