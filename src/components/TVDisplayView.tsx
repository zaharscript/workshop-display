import React, { useState, useEffect } from 'react';
import { VehicleRecord, Announcement } from '../types';
import { Wrench, CheckCircle2, Car, Phone, Clock, ListChecks, Check } from 'lucide-react';
import { MarqueeTicker } from './MarqueeTicker';
import { t } from '../lib/i18n';
import { QESFordLogo } from './QESFordLogo';
import { calculateServiceProgress, getDefaultTasksForService, getProgressColorTheme } from '../utils/serviceTasks';

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
      setCurrentTime(now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}j ${remMins}m`;
  };

  return (
    <div className="h-[calc(100vh-5rem)] bg-[#353839] text-[#e0e0e0] flex flex-col justify-between select-none font-sans overflow-hidden">
      {/* Top Status Counter Strip */}
      <div className="bg-[#282a2c] border-b border-white/10 px-6 py-4 shadow-xl shrink-0">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <QESFordLogo size="sm" showTagline={false} />
            <div className="hidden lg:flex items-center gap-2 bg-[#242628] border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-white/80 font-bold">011-3786 6127</span>
              <span className="text-white/30 ml-2">|</span>
              <Clock className="w-3.5 h-3.5 text-amber-400 ml-1" />
              <span className="text-amber-300 font-semibold">8.30am - 5.30pm</span>
            </div>
          </div>

          {/* Column Summary Badges */}
          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            {/* Incoming Badge */}
            <div className="bg-[#242628] border border-blue-500/30 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-blue-400 tracking-wider uppercase">{t('incoming')}</span>
              </div>
              <span className="text-xl font-mono font-bold bg-blue-500/20 text-blue-400 px-3 py-0.5 rounded-full text-xs">
                {String(incomingList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>

            {/* In Progress Badge */}
            <div className="bg-[#2e2620] border border-orange-500/40 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-xs font-mono font-bold text-orange-400 tracking-wider uppercase">{t('inProgress')}</span>
              </div>
              <span className="text-xl font-mono font-bold bg-orange-500/20 text-orange-400 px-3 py-0.5 rounded-full text-xs">
                {String(inProgressList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>

            {/* Service Completed Badge */}
            <div className="bg-emerald-900/10 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center justify-between gap-4 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase">{t('ready')}</span>
              </div>
              <span className="text-xl font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-0.5 rounded-full text-xs">
                {String(completedList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Display Board Grid */}
      <div className="flex-1 w-full px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Column 1: INCOMING INTAKE */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-white/10 p-5 shadow-2xl h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10 shrink-0">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-white font-mono">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span> {t('incoming')}
            </h2>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(incomingList.length).padStart(2, '0')} {t('units')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1.5 min-h-0">
            {incomingList.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
                <Car className="w-10 h-10 mb-2 opacity-30 text-blue-400" />
                <p className="text-sm font-semibold">{t('noIncomingVehicles')}</p>
                <p className="text-xs text-white/30">{t('newCarRegistrationsWillAppear')}</p>
              </div>
            ) : (
              incomingList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-[#242628] p-4 rounded-lg border-l-4 border-blue-500 shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg font-bold tracking-tight text-white font-mono">
                      {veh.plateNumber}
                    </span>
                    <span className="text-xs text-blue-400 uppercase font-bold tracking-wider font-mono">
                      MASUK • {veh.bayNumber || 'BAY 1'}
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
                        {t('waitingTime')} {getElapsedText(veh.entryTime)}
                      </span>
                    </div>
                  </div>

                  {/* To-Do Scheduled Indicator */}
                  {(() => {
                    const tasks = veh.tasks && veh.tasks.length > 0 ? veh.tasks : getDefaultTasksForService(veh.serviceType);
                    return (
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 font-mono">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-blue-300/90 font-semibold flex items-center gap-1 truncate">
                            <ListChecks className="w-3 h-3 text-blue-400" /> {tasks.length} Tugasan Didaftarkan
                          </span>
                          <span className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            0% (GILIRAN)
                          </span>
                        </div>
                        <div className="w-full bg-black/60 h-1 rounded-full overflow-hidden border border-white/5">
                          <div className="bg-blue-500/30 h-full w-0" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: REPAIR WORK IN PROGRESS */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-orange-500/30 p-5 shadow-[0_0_40px_rgba(249,115,22,0.1)] h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-orange-500/20 shrink-0">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-orange-400 font-mono">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span> {t('inProgress')}
            </h2>
            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(inProgressList.length).padStart(2, '0')} {t('units')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1.5 min-h-0">
            {inProgressList.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-white/40 border border-dashed border-orange-500/20 rounded-xl p-6 text-center">
                <Wrench className="w-10 h-10 mb-2 opacity-30 text-orange-400" />
                <p className="text-sm font-semibold">{t('noActiveRepairs')}</p>
                <p className="text-xs text-white/30">{t('vehiclesBeingRepairedWillDisplay')}</p>
              </div>
            ) : (
              inProgressList.map((veh) => {
                const tasks = veh.tasks && veh.tasks.length > 0 ? veh.tasks : getDefaultTasksForService(veh.serviceType);
                const progress = calculateServiceProgress(tasks, veh.status);
                const theme = getProgressColorTheme(progress.percent);

                return (
                  <div
                    key={veh.id}
                    className="bg-[#241e1a] p-5 rounded-2xl border shadow-xl relative overflow-hidden transition-all duration-300 transform hover:-translate-y-0.5 font-mono"
                    style={{
                      borderColor: theme.accentBorder,
                      boxShadow: `0 8px 30px hsla(${theme.hue}, 90%, 40%, 0.12)`,
                    }}
                  >
                    {/* Top gradient glow line shifting dynamically to green */}
                    <div
                      className="absolute top-0 left-0 w-full h-1"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
                      }}
                    />

                    {/* Row 1: Plate Number */}
                    <div className="mb-2">
                      <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter drop-shadow-sm">
                        {veh.plateNumber}
                      </span>
                    </div>

                    {/* Row 2: Car Info + Big SIAP % Badge */}
                    <div className="flex items-center justify-between gap-4 mb-3.5">
                      {/* Left: Thumbnail + Owner & Vehicle Details */}
                      <div className="flex gap-3.5 items-center min-w-0 flex-1">
                        <img
                          src={veh.photoUrl}
                          alt={veh.plateNumber}
                          className="w-24 h-18 sm:w-28 sm:h-20 object-cover rounded-xl border border-white/10 bg-[#19130d] shrink-0 shadow-md"
                        />
                        <div className="flex flex-col justify-center min-w-0 flex-1 space-y-0.5">
                          <p className="text-base sm:text-lg text-white font-black truncate tracking-tight">
                            {veh.ownerName}
                          </p>
                          <p className="text-xs text-orange-400/95 font-bold uppercase truncate">
                            {veh.vehicleMake} {veh.vehicleModel}
                          </p>
                          <p className="text-[11px] text-white/60 truncate">
                            {veh.serviceType}
                          </p>
                          {veh.mechanicName && (
                            <p className="text-[11px] text-amber-300 font-medium mt-0.5 flex items-center gap-1 truncate">
                              <Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> {t('tech')} {veh.mechanicName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Big and Bold SIAP Percentage Badge */}
                      <div
                        className="shrink-0 w-32 sm:w-38 px-3 py-3 rounded-2xl flex flex-col items-center justify-center text-center select-none transition-all duration-500 transform hover:scale-105"
                        style={{
                          background: theme.badgeBg,
                          boxShadow: theme.badgeShadow,
                          border: `2px solid ${theme.badgeBorder}`,
                        }}
                      >
                        <span className="text-xs sm:text-sm font-black text-black tracking-widest uppercase leading-none">
                          SIAP
                        </span>
                        <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-none mt-1">
                          {progress.percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Indicator & Line */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className="font-bold flex items-center gap-1.5 transition-colors duration-500"
                          style={{ color: theme.accentColor }}
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          KEMAJUAN SERVIS
                        </span>
                        <span
                          className="font-bold transition-colors duration-500"
                          style={{ color: theme.accentColor }}
                        >
                          {progress.completedCount}/{progress.totalCount} TUGASAN SELESAI ({progress.percent}%)
                        </span>
                      </div>

                      {/* Animated Progress Line Bar with gradual color transition */}
                      <div className="w-full bg-black/80 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(progress.percent, 6)}%`,
                            background: theme.progressBarGradient,
                            boxShadow: theme.progressBarGlow,
                          }}
                        />
                      </div>

                      {/* Current Active Task Notice giving reassurance */}
                      <div className="flex items-center justify-between text-[10px] text-white/70 pt-0.5">
                        <p
                          className="truncate font-medium flex items-center gap-1 transition-colors duration-500"
                          style={{ color: progress.isAllCompleted ? '#34d399' : theme.accentColor }}
                        >
                          <span className="text-sm leading-none">↳</span>
                          <span>{progress.isAllCompleted ? 'Semua tugasan selesai (Ujian akhir & pengesahan)' : `Sedang: ${progress.activeTaskTitle}`}</span>
                        </p>
                        <span className="text-white/50 shrink-0 ml-2 font-semibold uppercase">
                          {t('workTime')} {getElapsedText(veh.startTime || veh.entryTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: SERVICE COMPLETED */}
        <div className="flex flex-col bg-white/5 rounded-xl border border-emerald-500/20 p-5 shadow-2xl h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-emerald-500/20 shrink-0">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400 font-mono">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span> {t('ready')}
            </h2>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono font-bold">
              {String(completedList.length).padStart(2, '0')} {t('today')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1.5 min-h-0">
            {completedList.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-white/40 border border-dashed border-emerald-500/20 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-30 text-emerald-400" />
                <p className="text-sm font-semibold">{t('noVehiclesReady')}</p>
                <p className="text-xs text-white/30">{t('completedJobsHighlighted')}</p>
              </div>
            ) : (
              completedList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-500/40 shadow-inner transition-all transform hover:scale-[1.01] font-mono space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <img
                        src={veh.photoUrl}
                        alt={veh.plateNumber}
                        className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 bg-slate-900 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-white leading-tight uppercase tracking-wide truncate">
                          {veh.plateNumber}
                        </p>
                        <p className="text-xs text-emerald-400 font-semibold truncate">
                          Pemilik: {veh.ownerName}
                        </p>
                        <p className="text-[10px] text-white/50 truncate">
                          {veh.vehicleMake} {veh.vehicleModel}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500 text-black font-black px-2.5 py-1.5 rounded uppercase tracking-wider shrink-0 shadow-md">
                      {t('collect')}
                    </span>
                  </div>

                  {/* 100% Completed Progress Indicator */}
                  <div className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-emerald-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" /> 100% SIAP (LULUS PEMERIKSAAN)
                    </span>
                    <span className="text-emerald-300/60">
                      {getElapsedText(veh.completionTime || veh.entryTime)} lalu
                    </span>
                  </div>
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
