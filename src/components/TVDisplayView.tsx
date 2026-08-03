import React, { useState, useEffect } from 'react';
import { VehicleRecord } from '../types';
import { Clock, Wrench, CheckCircle2, Car, User, AlertCircle, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { MarqueeTicker } from './MarqueeTicker';
import { Announcement } from '../types';

interface TVDisplayViewProps {
  vehicles: VehicleRecord[];
  announcements: Announcement[];
  recentCompletedPlate?: { plate: string; owner: string } | null;
}

export const TVDisplayView: React.FC<TVDisplayViewProps> = ({
  vehicles,
  announcements,
  recentCompletedPlate,
}) => {
  const incomingList = vehicles.filter((v) => v.status === 'incoming');
  const inProgressList = vehicles.filter((v) => v.status === 'in_progress');
  const completedList = vehicles.filter((v) => v.status === 'completed');

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format Elapsed Minutes
  const getElapsedText = (isoString: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0a0b0e] text-[#e0e0e0] flex flex-col justify-between select-none">
      {/* Top Status Counter Strip (Immersive UI Style) */}
      <div className="bg-[#15171e] border-b border-white/10 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shadow-md">
              <Car className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[#3b82f6] font-mono text-xs tracking-widest uppercase block mb-0.5">
                SYSTEM ONLINE // LIVE DASHBOARD
              </span>
              <h2 className="text-xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
                WORKSHOP STATUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">TELEMETRY BOARD</span>
              </h2>
            </div>
          </div>

          {/* Column Summary Badges (Immersive UI Style) */}
          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            {/* Incoming Badge */}
            <div className="bg-[#161922] border border-blue-500/30 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-blue-400 tracking-wider uppercase">INCOMING</span>
              </div>
              <span className="text-xl font-mono font-bold bg-blue-500/20 text-blue-400 px-3 py-0.5 rounded-full text-xs">
                {String(incomingList.length).padStart(2, '0')} UNITS
              </span>
            </div>

            {/* In Progress Badge */}
            <div className="bg-[#1c140e] border border-orange-500/40 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-xs font-mono font-bold text-orange-400 tracking-wider uppercase">IN REPAIR</span>
              </div>
              <span className="text-xl font-mono font-bold bg-orange-500/20 text-orange-400 px-3 py-0.5 rounded-full text-xs">
                {String(inProgressList.length).padStart(2, '0')} UNITS
              </span>
            </div>

            {/* Service Completed Badge */}
            <div className="bg-emerald-900/10 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase">READY</span>
              </div>
              <span className="text-xl font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-0.5 rounded-full text-xs">
                {String(completedList.length).padStart(2, '0')} UNITS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Display Board Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: INCOMING INTAKE */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-white/10 p-4 shadow-2xl">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-white">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span> Incoming
            </h2>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(incomingList.length).padStart(2, '0')} UNITS
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
            {incomingList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
                <Car className="w-10 h-10 mb-2 opacity-30 text-blue-400" />
                <p className="text-sm font-semibold">No Incoming Vehicles</p>
                <p className="text-xs text-white/30">New car registrations will appear here</p>
              </div>
            ) : (
              incomingList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-[#161922] p-4 rounded-lg border-l-4 border-blue-500 shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg font-bold tracking-tight text-white font-mono">
                      {veh.plateNumber}
                    </span>
                    <span className="text-xs text-blue-400 uppercase font-bold tracking-wider font-mono">
                      INTAKE • {veh.bayNumber || 'BAY 1'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-20 h-14 object-cover rounded border border-white/10 shrink-0 bg-slate-950"
                    />
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <p className="text-sm text-white/90 font-semibold truncate">{veh.ownerName}</p>
                      <p className="text-[11px] text-white/40 uppercase tracking-tighter truncate font-mono">
                        {veh.vehicleMake} {veh.vehicleModel} • {veh.serviceType}
                      </p>
                      <span className="text-[10px] text-blue-400/80 font-mono mt-1">
                        WAITING: {getElapsedText(veh.entryTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: REPAIR WORK IN PROGRESS (Immersive Glowing Orange Style) */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-orange-500/30 p-4 shadow-[0_0_40px_rgba(249,115,22,0.1)]">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-orange-500/20">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-orange-400">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span> In Progress
            </h2>
            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(inProgressList.length).padStart(2, '0')} UNITS
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
            {inProgressList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-white/40 border border-dashed border-orange-500/20 rounded-xl p-6 text-center">
                <Wrench className="w-10 h-10 mb-2 opacity-30 text-orange-400" />
                <p className="text-sm font-semibold">No Active Repairs</p>
                <p className="text-xs text-white/30">Vehicles being repaired will display here</p>
              </div>
            ) : (
              inProgressList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-[#1c140e] p-5 rounded-lg border border-orange-500/40 shadow-lg relative overflow-hidden transition-all transform hover:-translate-y-0.5"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-black text-white italic tracking-tighter font-mono">
                      {veh.plateNumber}
                    </span>
                    <span className="text-xs bg-orange-500 text-black px-2.5 py-0.5 font-bold uppercase tracking-wider rounded">
                      REPAIRING
                    </span>
                  </div>
                  <div className="flex gap-4 mb-3">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-24 h-16 object-cover rounded border border-orange-900/50 bg-[#2d1d0e] shrink-0"
                    />
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <p className="text-base text-white font-bold truncate">{veh.ownerName}</p>
                      <p className="text-xs text-orange-400/90 uppercase truncate font-mono font-medium">
                        {veh.vehicleMake} {veh.vehicleModel}
                      </p>
                      <p className="text-[11px] text-white/60 truncate font-mono">
                        {veh.serviceType}
                      </p>
                      {veh.mechanicName && (
                        <p className="text-[10px] text-amber-300 font-mono mt-0.5">
                          Tech: {veh.mechanicName}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-600 to-amber-400 h-full w-[70%] animate-pulse"></div>
                  </div>
                  <p className="text-[10px] mt-2 text-right text-orange-500/80 font-mono">
                    WORK TIME: {getElapsedText(veh.startTime || veh.entryTime)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: SERVICE COMPLETED (Immersive Emerald Ready Style) */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-emerald-500/20 p-4 shadow-2xl">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-emerald-500/20">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span> Ready
            </h2>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(completedList.length).padStart(2, '0')} TODAY
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
            {completedList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-white/40 border border-dashed border-emerald-500/20 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-30 text-emerald-400" />
                <p className="text-sm font-semibold">No Vehicles Ready</p>
                <p className="text-xs text-white/30">Completed jobs will be highlighted here</p>
              </div>
            ) : (
              completedList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-500/40 flex items-center justify-between shadow-inner transition-all transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-white leading-tight uppercase font-mono tracking-wide truncate">
                        {veh.plateNumber}
                      </p>
                      <p className="text-xs text-emerald-400 font-semibold truncate">
                        Owner: {veh.ownerName}
                      </p>
                      <p className="text-[10px] text-white/50 truncate font-mono">
                        {veh.vehicleMake} {veh.vehicleModel}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500 text-black font-black px-2.5 py-1.5 rounded uppercase tracking-wider shrink-0 shadow-md">
                    COLLECT
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Marquee Announcement Ticker */}
      <MarqueeTicker announcements={announcements} recentCompletedPlate={recentCompletedPlate} />
    </div>
  );
};
