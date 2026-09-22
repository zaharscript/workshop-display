import React, { useState, useEffect } from 'react';
import { VehicleRecord, Announcement } from '../types';
import { Wrench, CheckCircle2, Car, Phone, Clock, ListChecks, Check, Sparkles } from 'lucide-react';
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
    <div className="h-[calc(100vh-5.5rem)] flex flex-col justify-between select-none font-sans overflow-hidden">
      {/* Top Status Counter Strip */}
      <div className="px-3 sm:px-6 pt-1 pb-2 shrink-0">
        <div className="clay-card px-5 py-2.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <QESFordLogo size="sm" showTagline={false} />
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full clay-inset text-xs font-serif">
              <Phone className="w-3.5 h-3.5 text-[#c45c3d]" />
              <span className="text-[#2b3d34] dark:text-[#d3ded8] font-bold">011-3786 6127</span>
              <span className="text-[#8e7e6f] mx-1">❧</span>
              <Clock className="w-3.5 h-3.5 text-[#cca152]" />
              <span className="text-[#594d40] dark:text-[#a8bdb2]">8.30am - 5.30pm</span>
            </div>
          </div>

          {/* Column Summary Badges as Botanical Artisan Pills */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full md:w-auto">
            {/* Incoming Badge */}
            <div className="clay-card-blue px-3.5 py-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1c382f] animate-pulse"></span>
                <span className="text-xs font-serif font-bold text-[#1c382f] dark:text-[#b4d4c7] tracking-wide">{t('incoming')}</span>
              </div>
              <span className="clay-pill bg-[#1c382f] text-white font-mono font-bold text-[11px] px-2.5 py-0.5">
                {String(incomingList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>

            {/* In Progress Badge */}
            <div className="clay-card-orange px-3.5 py-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c45c3d]"></span>
                <span className="text-xs font-serif font-bold text-[#963c22] dark:text-[#f3ab96] tracking-wide">{t('inProgress')}</span>
              </div>
              <span className="clay-pill bg-[#c45c3d] text-white font-mono font-bold text-[11px] px-2.5 py-0.5">
                {String(inProgressList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>

            {/* Ready Badge */}
            <div className="clay-card-green px-3.5 py-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#cca152]"></span>
                <span className="text-xs font-serif font-bold text-[#7a591e] dark:text-[#edd19d] tracking-wide">{t('ready')}</span>
              </div>
              <span className="clay-pill bg-[#cca152] text-white font-mono font-bold text-[11px] px-2.5 py-0.5">
                {String(completedList.length).padStart(2, '0')} {t('units')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Display Board Grid */}
      <div className="flex-1 w-full px-3 sm:px-6 py-2 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-h-0 overflow-hidden">
        {/* Column 1: INCOMING INTAKE */}
        <div className="clay-card-blue p-4 sm:p-5 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-[#1c382f]/15 dark:border-[#a3c9bb]/20 shrink-0">
            <h2 className="text-base sm:text-lg font-serif font-bold tracking-wide flex items-center gap-2 text-[#1c382f] dark:text-[#d3e5dc]">
              <span className="text-[#c45c3d] text-sm not-italic">❧</span> {t('incoming')}
            </h2>
            <span className="clay-pill px-3 py-0.5 text-xs font-mono font-bold bg-[#1c382f]/15 text-[#1c382f] dark:text-[#c4ded3]">
              {String(incomingList.length).padStart(2, '0')} {t('units')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 min-h-0">
            {incomingList.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#7a6f62] dark:text-[#8b9e94] clay-inset p-6 text-center">
                <Car className="w-9 h-9 mb-2 opacity-50 text-[#1c382f]" />
                <p className="text-sm font-serif font-bold text-[#2d4036] dark:text-[#d8e5df]">{t('noIncomingVehicles')}</p>
                <p className="text-xs opacity-75">{t('newCarRegistrationsWillAppear')}</p>
              </div>
            ) : (
              incomingList.map((veh) => (
                <div
                  key={veh.id}
                  className="clay-card p-4 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg sm:text-xl font-mono font-black tracking-tight text-[#1c382f] dark:text-white">
                      {veh.plateNumber}
                    </span>
                    <span className="clay-pill text-[10px] bg-[#1c382f]/10 text-[#1c382f] dark:text-[#c4ded3] font-serif font-bold px-2.5 py-0.5 tracking-wider">
                      Masuk • {veh.bayNumber || 'Bay 1'}
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-18 h-15 object-cover rounded-xl border border-[#d9cdb8] dark:border-[#2f5547] shadow-sm shrink-0 bg-[#eee7db]"
                    />
                    <div className="flex flex-col justify-center min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-serif font-bold text-[#1f2d26] dark:text-[#f4f0e6] truncate">{veh.ownerName}</p>
                      <p className="text-xs text-[#c45c3d] dark:text-[#e08166] font-medium truncate font-serif italic">
                        {veh.vehicleMake} {veh.vehicleModel} • {veh.serviceType}
                      </p>
                      <span className="text-[11px] text-[#786b5d] dark:text-[#9bb0a5] font-mono">
                        {t('waitingTime')} {getElapsedText(veh.entryTime)}
                      </span>
                    </div>
                  </div>

                  {/* To-Do Scheduled Indicator */}
                  {(() => {
                    const tasks = veh.tasks && veh.tasks.length > 0 ? veh.tasks : getDefaultTasksForService(veh.serviceType);
                    return (
                      <div className="mt-2.5 pt-2 border-t border-[#e2d7c5] dark:border-[#253f33] space-y-1 font-mono">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[#1c382f] dark:text-[#b4d4c7] font-serif font-bold flex items-center gap-1 truncate">
                            <ListChecks className="w-3.5 h-3.5 text-[#1c382f]" /> {tasks.length} Tugasan Didaftarkan
                          </span>
                          <span className="clay-pill bg-[#1c382f]/10 text-[#1c382f] dark:text-[#b4d4c7] px-2 py-0.5 text-[9px] font-bold">
                            0% (GILIRAN)
                          </span>
                        </div>
                        <div className="w-full clay-inset h-2 p-0.5 overflow-hidden">
                          <div className="bg-[#1c382f]/30 h-full w-0 rounded-full" />
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
        <div className="clay-card-orange p-4 sm:p-5 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-[#c45c3d]/20 shrink-0">
            <h2 className="text-base sm:text-lg font-serif font-bold tracking-wide flex items-center gap-2 text-[#963c22] dark:text-[#f3ab96]">
              <span className="text-[#c45c3d] text-sm not-italic">❧</span> {t('inProgress')}
            </h2>
            <span className="clay-pill px-3 py-0.5 text-xs font-mono font-bold bg-[#c45c3d]/15 text-[#963c22] dark:text-[#f3ab96]">
              {String(inProgressList.length).padStart(2, '0')} {t('units')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 min-h-0">
            {inProgressList.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#877868] dark:text-[#9ea9a2] clay-inset p-6 text-center">
                <Wrench className="w-9 h-9 mb-2 opacity-50 text-[#c45c3d]" />
                <p className="text-sm font-serif font-bold text-[#3d2a20] dark:text-[#e8ded5]">{t('noActiveRepairs')}</p>
                <p className="text-xs opacity-75">{t('vehiclesBeingRepairedWillDisplay')}</p>
              </div>
            ) : (
              inProgressList.map((veh) => {
                const tasks = veh.tasks && veh.tasks.length > 0 ? veh.tasks : getDefaultTasksForService(veh.serviceType);
                const progress = calculateServiceProgress(tasks, veh.status);
                const theme = getProgressColorTheme(progress.percent);

                return (
                  <div
                    key={veh.id}
                    className="clay-card p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {/* Row 1: Plate Number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl font-mono font-black text-[#1c382f] dark:text-white tracking-tight">
                        {veh.plateNumber}
                      </span>
                      {veh.bayNumber && (
                        <span className="clay-pill px-2.5 py-0.5 text-[10px] font-serif font-bold bg-[#cca152]/20 text-[#6f4f18] dark:text-[#dfb974]">
                          {veh.bayNumber}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Car Info + Artisan SIAP % Badge */}
                    <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3">
                      {/* Left: Thumbnail + Owner & Details */}
                      <div className="flex gap-3 items-center min-w-0 flex-1">
                        <img
                          src={veh.photoUrl}
                          alt={veh.plateNumber}
                          className="w-20 h-16 sm:w-24 sm:h-18 object-cover rounded-xl border border-[#d9cdb8] dark:border-[#2f5547] shadow-sm shrink-0 bg-[#eee7db]"
                        />
                        <div className="flex flex-col justify-center min-w-0 flex-1 space-y-0.5">
                          <p className="text-sm sm:text-base font-serif font-bold text-[#1f2d26] dark:text-white truncate">
                            {veh.ownerName}
                          </p>
                          <p className="text-xs text-[#c45c3d] dark:text-[#e08166] font-serif italic truncate">
                            {veh.vehicleMake} {veh.vehicleModel}
                          </p>
                          <p className="text-[11px] text-[#6d5f52] dark:text-[#bccfc6] truncate">
                            {veh.serviceType}
                          </p>
                          {veh.mechanicName && (
                            <p className="text-[11px] text-[#1c382f] dark:text-[#dfb974] font-serif font-semibold mt-0.5 flex items-center gap-1 truncate">
                              <Wrench className="w-3.5 h-3.5 text-[#c45c3d] shrink-0" /> {t('tech')} {veh.mechanicName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Big and Bold Artisan SIAP Percentage Badge */}
                      <div
                        className="shrink-0 w-24 sm:w-28 px-3 py-2.5 rounded-2xl flex flex-col items-center justify-center text-center select-none shadow-sm"
                        style={{
                          background: theme.badgeBg,
                          border: `1.5px solid ${theme.badgeBorder}`,
                        }}
                      >
                        <span className="text-[10px] font-serif font-bold text-white tracking-widest uppercase leading-none">
                          SIAP
                        </span>
                        <span className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-none mt-1">
                          {progress.percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Indicator & Line */}
                    <div className="space-y-1.5 pt-2 border-t border-[#ebd8c8] dark:border-[#38261e]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className="font-serif font-bold flex items-center gap-1.5 transition-colors duration-500"
                          style={{ color: theme.accentColor }}
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          Kemajuan Servis
                        </span>
                        <span
                          className="font-mono font-bold transition-colors duration-500 text-[10px]"
                          style={{ color: theme.accentColor }}
                        >
                          {progress.completedCount}/{progress.totalCount} SIAP ({progress.percent}%)
                        </span>
                      </div>

                      {/* Animated Progress Line Bar with clay-inset track */}
                      <div className="w-full clay-inset h-2.5 p-0.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(progress.percent, 6)}%`,
                            background: theme.progressBarGradient,
                          }}
                        />
                      </div>

                      {/* Current Active Task Notice */}
                      <div className="flex items-center justify-between text-[10px] text-[#635649] dark:text-[#a8bdb2] pt-0.5">
                        <p
                          className="truncate font-serif italic flex items-center gap-1 transition-colors duration-500"
                          style={{ color: progress.isAllCompleted ? '#27614d' : theme.accentColor }}
                        >
                          <span className="text-sm leading-none">↳</span>
                          <span>{progress.isAllCompleted ? '✨ Semua tugasan selesai (Sedia diambil)' : `Sedang: ${progress.activeTaskTitle}`}</span>
                        </p>
                        <span className="text-[#84776a] dark:text-[#8ea397] shrink-0 ml-2 font-mono font-bold text-[9px] uppercase">
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
        <div className="clay-card-green p-4 sm:p-5 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Column Header */}
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-[#cca152]/25 shrink-0">
            <h2 className="text-base sm:text-lg font-serif font-bold tracking-wide flex items-center gap-2 text-[#684914] dark:text-[#edd19d]">
              <span className="text-[#cca152] text-sm not-italic">❧</span> {t('ready')}
            </h2>
            <span className="clay-pill px-3 py-0.5 text-xs font-mono font-bold bg-[#cca152]/15 text-[#684914] dark:text-[#edd19d]">
              {String(completedList.length).padStart(2, '0')} {t('today')}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 min-h-0">
            {completedList.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#786b5d] dark:text-[#9bb0a5] clay-inset p-6 text-center">
                <CheckCircle2 className="w-9 h-9 mb-2 opacity-50 text-[#cca152]" />
                <p className="text-sm font-serif font-bold text-[#3b3024] dark:text-[#e8ded5]">{t('noVehiclesReady')}</p>
                <p className="text-xs opacity-75">{t('completedJobsHighlighted')}</p>
              </div>
            ) : (
              completedList.map((veh) => (
                <div
                  key={veh.id}
                  className="clay-card p-4 transition-all duration-200 hover:-translate-y-0.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <img
                        src={veh.photoUrl}
                        alt={veh.plateNumber}
                        className="w-14 h-14 rounded-xl object-cover border border-[#cca152]/40 bg-[#eee7db] shrink-0 shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-mono font-black text-[#1c382f] dark:text-white leading-tight uppercase tracking-tight truncate">
                          {veh.plateNumber}
                        </p>
                        <p className="text-xs text-[#285e49] dark:text-[#88cbb0] font-serif font-bold truncate">
                          Pemilik: {veh.ownerName}
                        </p>
                        <p className="text-[11px] text-[#685a4d] dark:text-[#bccfc6] font-serif italic truncate">
                          {veh.vehicleMake} {veh.vehicleModel}
                        </p>
                      </div>
                    </div>
                    <span className="clay-btn clay-btn-primary text-[10px] px-3.5 py-1 uppercase tracking-wider shrink-0 font-serif font-bold shadow-sm">
                      {t('collect')}
                    </span>
                  </div>

                  {/* 100% Completed Progress Indicator */}
                  <div className="pt-2 border-t border-[#e2d7c5] dark:border-[#284033] flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-serif font-bold text-[#285e49] dark:text-[#88cbb0]">
                      <Check className="w-4 h-4 stroke-[3] text-[#285e49] dark:text-[#88cbb0]" /> 100% SIAP (LULUS)
                    </span>
                    <span className="text-[#84776a] dark:text-[#8ea397] font-mono text-[10px]">
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

