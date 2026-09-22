import React, { useState } from 'react';
import { VehicleRecord, Mechanic, VehicleStatus, ActivityLog } from '../types';
import {
  Plus,
  Search,
  Wrench,
  CheckCircle2,
  Play,
  Check,
  History,
  Eye,
  Car,
  User,
  ListChecks,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NewVehicleModal } from './NewVehicleModal';
import { VehicleDetailModal } from './VehicleDetailModal';
import {
  calculateServiceProgress,
  toggleTaskInList,
  addTaskToList,
  getDefaultTasksForService,
  getProgressColorTheme,
} from '../utils/serviceTasks';
import { t } from '../lib/i18n';

interface MobileOperatorViewProps {
  vehicles: VehicleRecord[];
  mechanics: Mechanic[];
  activityLogs: ActivityLog[];
  onAddVehicle: (payload: Partial<VehicleRecord>) => Promise<void>;
  onUpdateStatus: (id: string, newStatus: VehicleStatus) => Promise<void>;
  onUpdateRecord: (id: string, updates: Partial<VehicleRecord>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onResetData: () => void;
}

export const MobileOperatorView: React.FC<MobileOperatorViewProps> = ({
  vehicles,
  mechanics,
  activityLogs,
  onAddVehicle,
  onUpdateStatus,
  onUpdateRecord,
  onDeleteVehicle,
}) => {
  const [activeTab, setActiveTab] = useState<VehicleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<VehicleRecord | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpandCardTasks = (vehicleId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [vehicleId]: !prev[vehicleId],
    }));
  };

  const handleToggleTask = async (veh: VehicleRecord, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTasks = veh.tasks && veh.tasks.length > 0
      ? veh.tasks
      : getDefaultTasksForService(veh.serviceType);
    const updatedTasks = toggleTaskInList(currentTasks, taskId);

    // If vehicle was incoming and technician starts marking jobs done, move to in_progress
    const anyDone = updatedTasks.some((t) => t.completed);
    const updates: Partial<VehicleRecord> = { tasks: updatedTasks };

    if (veh.status === 'incoming' && anyDone) {
      updates.status = 'in_progress';
      if (!veh.startTime) updates.startTime = new Date().toISOString();
    }

    await onUpdateRecord(veh.id, updates);
  };

  const handleAddNewTask = async (veh: VehicleRecord) => {
    if (!newTaskTitle.trim()) return;
    const currentTasks = veh.tasks && veh.tasks.length > 0
      ? veh.tasks
      : getDefaultTasksForService(veh.serviceType);
    const updatedTasks = addTaskToList(currentTasks, newTaskTitle);
    await onUpdateRecord(veh.id, { tasks: updatedTasks });
    setNewTaskTitle('');
    setAddingTaskId(null);
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesTab = activeTab === 'all' || v.status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.plateNumber.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.vehicleMake.toLowerCase().includes(q) ||
      v.vehicleModel.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const counts = {
    all: vehicles.length,
    incoming: vehicles.filter((v) => v.status === 'incoming').length,
    in_progress: vehicles.filter((v) => v.status === 'in_progress').length,
    completed: vehicles.filter((v) => v.status === 'completed').length,
    delivered: vehicles.filter((v) => v.status === 'delivered').length,
  };

  return (
    <div className="min-h-[calc(100vh-5.5rem)] p-3 sm:p-6 pb-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Actions Bar */}
        <div className="clay-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#e5dac7] dark:border-[#2f5547]">
          <div>
            <span className="text-[#c45c3d] dark:text-[#df785d] font-serif italic text-xs tracking-wider block mb-1">
              ❧ Bengkel Artisan & Alat Ganti Tulen Ford
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#1c382f] dark:text-[#f4efe4] flex items-center gap-2">
              Konsol <span className="text-[#c45c3d] font-normal italic">Pengurusan Bengkel</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`clay-btn ${showLogs ? 'clay-btn-primary' : 'clay-btn-neutral'} text-xs font-serif font-semibold gap-1.5`}
            >
              <History className="w-4 h-4" />
              <span>{t('log')} ({activityLogs.length})</span>
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="clay-btn clay-btn-primary text-xs tracking-wide font-serif font-bold gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('intakeNewCar')}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8c7e70]" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clay-inset w-full pl-10 pr-4 py-2.5 text-xs text-[#2b3a32] dark:text-[#f2eee4] placeholder:text-[#918376] focus:outline-none focus:ring-1 focus:ring-[#c45c3d] font-serif font-medium"
            />
          </div>

          {/* Status Tabs as Botanical Artisan Pills */}
          <div className="clay-inset p-1.5 flex items-center gap-1.5 overflow-x-auto w-full md:w-auto font-serif text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'clay-btn clay-btn-forest shadow-sm'
                  : 'text-[#5f5043] dark:text-[#c4d6cc] hover:text-[#1c382f]'
              }`}
            >
              {t('allStatus')} ({counts.all})
            </button>

            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'incoming'
                  ? 'clay-btn bg-[#1c382f] text-white shadow-sm'
                  : 'text-[#1c382f] dark:text-[#9bc2b1] hover:bg-[#1c382f]/10'
              }`}
            >
              Masuk ({counts.incoming})
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'in_progress'
                  ? 'clay-btn clay-btn-orange shadow-sm text-white'
                  : 'text-[#a3442a] dark:text-[#f1a48e] hover:bg-[#c45c3d]/10'
              }`}
            >
              {t('repairingStatus')} ({counts.in_progress})
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'clay-btn clay-btn-green shadow-sm text-white'
                  : 'text-[#7d591b] dark:text-[#e4c281] hover:bg-[#cca152]/10'
              }`}
            >
              {t('readyStatus')} ({counts.completed})
            </button>

            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'delivered'
                  ? 'clay-btn clay-btn-neutral shadow-sm text-[#483d33]'
                  : 'text-[#827466] dark:text-[#99ada2] hover:text-[#2d2218]'
              }`}
            >
              {t('deliveredStatus')} ({counts.delivered})
            </button>
          </div>
        </div>

        {/* Activity Log Drawer Panel */}
        {showLogs && (
          <div className="clay-card p-4 sm:p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                <History className="w-4 h-4" /> {t('liveActivityAuditLog')}
              </h3>
              <button onClick={() => setShowLogs(false)} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white">
                {t('closeLog')}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {activityLogs.length === 0 ? (
                <p className="text-slate-400 text-center py-4">{t('noLogsYet')}</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="clay-inset flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="clay-pill bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 text-[10px] font-black">
                        {log.plateNumber}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{log.action}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 clay-card border-dashed p-10">
              <Car className="w-12 h-12 mb-3 opacity-40 text-blue-500 dark:text-cyan-400" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">{t('noVehiclesFound')}</p>
              <p className="text-xs text-slate-400">{t('adjustSearchOrIntake')}</p>
            </div>
          ) : (
            filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className={`clay-card p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  veh.status === 'completed'
                    ? 'clay-card-green'
                    : veh.status === 'in_progress'
                    ? 'clay-card-orange'
                    : ''
                }`}
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      onClick={() => setSelectedVehicleForDetail(veh)}
                      className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      {veh.plateNumber}
                    </button>

                    <div className="flex items-center gap-1.5 font-mono">
                      {veh.priority === 'express' && (
                        <span className="clay-pill bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-black px-2 py-0.5">
                          {t('expressPriority')}
                        </span>
                      )}
                      {veh.priority === 'vip' && (
                        <span className="clay-pill bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2 py-0.5">
                          {t('vipPriority')}
                        </span>
                      )}

                      {/* Status Badge */}
                      {veh.status === 'incoming' && (
                        <span className="clay-pill bg-blue-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase">
                          Masuk
                        </span>
                      )}
                      {veh.status === 'in_progress' && (
                        <span className="clay-pill bg-orange-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                          <Wrench className="w-3 h-3 animate-spin" /> Pembaikan
                        </span>
                      )}
                      {veh.status === 'completed' && (
                        <span className="clay-pill bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Siap
                        </span>
                      )}
                      {veh.status === 'delivered' && (
                        <span className="clay-pill bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 text-[10px] font-black uppercase">
                          Diserahkan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="flex gap-4 mb-4 items-center">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-24 h-20 object-cover rounded-2xl border-2 border-white/80 shadow-md bg-slate-200 dark:bg-slate-800 shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {veh.vehicleMake} {veh.vehicleModel}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-cyan-400 font-bold truncate font-mono">{veh.serviceType}</p>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 font-mono">
                        <p className="truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {veh.ownerName}
                        </p>
                        {veh.ownerPhone && <p className="text-slate-400 text-[10px]">{veh.ownerPhone}</p>}
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px]">
                          {t('location')} {veh.bayNumber || 'Bay 01'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mechanic Line */}
                  <div className="clay-inset p-2.5 mb-4 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" /> {t('technician')}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-white">{veh.mechanicName || t('unassigned')}</span>
                  </div>

                  {/* To-Do List & Progress Line Section */}
                  {(() => {
                    const tasks = veh.tasks && veh.tasks.length > 0 ? veh.tasks : getDefaultTasksForService(veh.serviceType);
                    const progress = calculateServiceProgress(tasks, veh.status);
                    const theme = getProgressColorTheme(progress.percent);
                    const isExpanded = !!expandedCards[veh.id];
                    const isAdding = addingTaskId === veh.id;
                    const visibleTasks = isExpanded ? tasks : tasks.slice(0, 3);
                    const hasMore = tasks.length > 3;

                    return (
                      <div className="clay-inset p-3 mb-4 space-y-2.5 font-mono">
                        {/* Header: Title + Progress Percentage Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
                            <ListChecks className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                            <span>Senarai Tugasan</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="clay-pill px-2.5 py-0.5 text-[11px] font-black flex items-center gap-1 transition-all duration-300"
                              style={{
                                background: theme.accentLight,
                                color: theme.accentColor,
                                border: `1px solid ${theme.accentBorder}`,
                              }}
                            >
                              {progress.isAllCompleted ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>100% SIAP</span>
                                </>
                              ) : (
                                <>
                                  <span>SIAP {progress.percent}%</span>
                                  <span className="opacity-70 font-medium text-[10px]">({progress.completedCount}/{progress.totalCount})</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Progress Line (Animated Bar) */}
                        <div className="space-y-1">
                          <div className="w-full clay-inset h-2.5 p-0.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${Math.max(progress.percent, 3)}%`,
                                background: theme.progressBarGradient,
                                boxShadow: theme.progressBarGlow,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="truncate max-w-[200px] font-medium">
                              {progress.isAllCompleted
                                ? '✨ Semua kerja disiapkan'
                                : progress.activeTaskTitle
                                ? `Sedang: ${progress.activeTaskTitle}`
                                : 'Menunggu giliran mula'}
                            </span>
                            <span className="font-black shrink-0 ml-1" style={{ color: theme.accentColor }}>
                              {progress.completedCount}/{progress.totalCount} Siap ({progress.percent}%)
                            </span>
                          </div>
                        </div>

                        {/* Checklist Tasks */}
                        <div className="space-y-1.5 pt-1">
                          {visibleTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={(e) => handleToggleTask(veh, task.id, e)}
                              className={`flex items-start gap-2 p-2 rounded-xl cursor-pointer transition-all select-none ${
                                task.completed
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30'
                                  : 'clay-card hover:translate-y-[-1px] text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-4 h-4 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                  task.completed
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'border-2 border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800'
                                }`}
                              >
                                {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs leading-snug ${
                                    task.completed ? 'line-through text-emerald-700 dark:text-emerald-300/70' : 'font-semibold'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.completed && task.completedAt && (
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400/70 block mt-0.5">
                                    ✓ Siap {new Date(task.completedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Expand / Collapse & Add Task Controls */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          {hasMore ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCardTasks(veh.id);
                              }}
                              className="text-[11px] text-blue-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 py-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Ringkaskan ({tasks.length} tugasan)
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> Lihat {tasks.length - 3} lagi...
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">{tasks.length} tugasan berdaftar</span>
                          )}

                          {!isAdding ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingTaskId(veh.id);
                                setNewTaskTitle('');
                              }}
                              className="clay-btn clay-btn-ghost text-[11px] px-2.5 py-1 gap-1"
                            >
                              <Plus className="w-3 h-3 text-blue-600 dark:text-cyan-400" /> Tambah Kerja
                            </button>
                          ) : null}
                        </div>

                        {/* Inline Add Task Form */}
                        {isAdding && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="clay-card p-2.5 space-y-2 mt-2"
                          >
                            <input
                              type="text"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNewTask(veh);
                                }
                              }}
                              placeholder="Contoh: Skim disc rotor brek belakang..."
                              className="clay-inset w-full px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTaskId(null);
                                  setNewTaskTitle('');
                                }}
                                className="clay-btn clay-btn-ghost px-2.5 py-1 text-[11px]"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddNewTask(veh)}
                                className="clay-btn clay-btn-primary px-3 py-1 text-[11px] font-bold flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Simpan Tugasan
                              </button>
                            </div>
                          </div>
                        )}

                        {/* All Completed Notice */}
                        {progress.isAllCompleted && veh.status !== 'completed' && veh.status !== 'delivered' && (
                          <div className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 p-2 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center gap-1.5 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                            <span>Semua tugas selesai! Sedia untuk ditandakan siap.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Action Stage Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2 font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Action Stage Progress Button */}
                    {veh.status === 'incoming' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'in_progress')}
                        className="col-span-2 clay-btn clay-btn-orange py-2 px-3 text-xs uppercase font-black flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> {t('startRepairWork')}
                      </button>
                    )}

                    {veh.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'completed')}
                        className="col-span-2 clay-btn clay-btn-green py-2 px-3 text-xs uppercase font-black flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('markServiceCompleted')}
                      </button>
                    )}

                    {veh.status === 'completed' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'delivered')}
                        className="col-span-2 clay-btn clay-btn-ghost py-2 px-3 text-xs uppercase font-extrabold flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> {t('markDeliveredHandover')}
                      </button>
                    )}

                    {veh.status === 'delivered' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'incoming')}
                        className="col-span-2 clay-btn clay-btn-ghost py-2 px-3 text-xs uppercase font-bold flex items-center justify-center gap-1.5"
                      >
                        {t('reopenIntake')}
                      </button>
                    )}

                    {/* Secondary Detail Button */}
                    <button
                      onClick={() => setSelectedVehicleForDetail(veh)}
                      className="col-span-2 clay-btn clay-btn-ghost py-2 px-3 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" /> {t('editJobSheet')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <NewVehicleModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={onAddVehicle}
        mechanics={mechanics}
      />

      <VehicleDetailModal
        vehicle={selectedVehicleForDetail}
        isOpen={!!selectedVehicleForDetail}
        onClose={() => setSelectedVehicleForDetail(null)}
        onUpdateStatus={onUpdateStatus}
        onUpdateRecord={onUpdateRecord}
        onDelete={onDeleteVehicle}
        mechanics={mechanics}
      />
    </div>
  );
};
