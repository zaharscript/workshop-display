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
  LogIn,
  LogOut,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { NewVehicleModal } from './NewVehicleModal';
import { VehicleDetailModal } from './VehicleDetailModal';
import { OperatorLoginModal } from './OperatorLoginModal';
import { useAuth } from '../lib/useAuth';
import { hasOperatorPermission } from '../lib/operatorAccess';
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
  const { isOperator, operatorProfile, user, logout } = useAuth();
  const operatorRole = isOperator ? operatorProfile?.role ?? null : null;
  const canRegisterVehicles = hasOperatorPermission(operatorRole, 'registerVehicles');
  const canAssignMechanics = hasOperatorPermission(operatorRole, 'assignMechanics');
  const canUpdateServiceProgress = hasOperatorPermission(operatorRole, 'updateServiceProgress');
  const canUpdateTaskChecklist = hasOperatorPermission(operatorRole, 'updateTaskChecklist');
  const canDeleteVehicleRecords = hasOperatorPermission(operatorRole, 'deleteVehicleRecords');
  const [activeTab, setActiveTab] = useState<VehicleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
    if (!canUpdateTaskChecklist) return;

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
    if (!canUpdateTaskChecklist || !newTaskTitle.trim()) return;
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

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`clay-btn ${showLogs ? 'clay-btn-primary' : 'clay-btn-neutral'} text-xs font-serif font-semibold gap-1.5`}
            >
              <History className="w-4 h-4" />
              <span>{t('log')} ({activityLogs.length})</span>
            </button>

            {isOperator ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full clay-pill bg-[#1c382f]/10 dark:bg-[#1c382f]/40 text-[#1c382f] dark:text-[#a3c9bb] text-xs font-serif font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2b7256]" />
                  <span className="max-w-[140px] truncate">{operatorProfile?.name || user?.email}</span>
                </div>
                <button
                  onClick={() => logout()}
                  className="clay-btn clay-btn-neutral text-xs font-serif font-semibold gap-1.5 text-rose-700 dark:text-rose-400"
                  title="Log Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Keluar</span>
                </button>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="clay-btn clay-btn-primary text-xs tracking-wide font-serif font-bold gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('intakeNewCar')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="clay-btn clay-btn-primary text-xs tracking-wide font-serif font-bold gap-2 shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Log Masuk Operator</span>
              </button>
            )}
          </div>
        </div>

        {/* Read-Only Notice for Signed-Out Visitors */}
        {!isOperator && (
          <div className="clay-card p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{t('readOnlyModeBanner')}</span>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="clay-btn clay-btn-primary text-xs font-serif font-bold px-3 py-1.5 self-start sm:self-auto shrink-0 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log Masuk Sekarang</span>
            </button>
          </div>
        )}

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
                  : 'text-[#2b7256] dark:text-[#8bd4b4] hover:bg-[#2b7256]/10'
              }`}
            >
              {t('readyStatus')} ({counts.completed})
            </button>

            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                activeTab === 'delivered'
                  ? 'clay-btn clay-btn-neutral shadow-sm text-[#1c382f] dark:text-[#f4efe4]'
                  : 'text-[#7a6a5b] dark:text-[#aabcb2] hover:bg-[#7a6a5b]/10'
              }`}
            >
              {t('deliveredStatus')} ({counts.delivered})
            </button>
          </div>
        </div>

        {/* Activity Logs Drawer */}
        {showLogs && (
          <div className="clay-card p-5 border border-slate-300 dark:border-slate-700/80 animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60 mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <History className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                {t('liveActivityAuditLog')}
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                {t('closeLog')}
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">{t('noLogsYet')}</p>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="clay-inset p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-black text-blue-600 dark:text-cyan-400 mr-2">[{log.plateNumber}]</span>
                      <span className="text-slate-700 dark:text-slate-200">{log.action}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString('ms-MY')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vehicles Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full clay-card p-12 text-center text-slate-400 font-mono">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">{t('noVehiclesFound')}</p>
              <p className="text-xs mt-1 text-slate-500">{t('adjustSearchOrIntake')}</p>
            </div>
          ) : (
            filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className="clay-card p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform relative overflow-hidden"
              >
                {/* Priority Ribbon */}
                {veh.priority === 'express' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-bl-xl font-mono uppercase shadow-sm">
                    {t('expressPriority')}
                  </div>
                )}
                {veh.priority === 'vip' && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl font-mono uppercase shadow-sm">
                    {t('vipPriority')}
                  </div>
                )}

                {/* Top Details & Photo */}
                <div className="space-y-3 font-mono">
                  <div className="flex items-start gap-3">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-20 h-20 object-cover rounded-2xl border border-white/60 shadow-sm shrink-0 bg-slate-200 dark:bg-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="clay-pill bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-sm px-2.5 py-0.5 tracking-wider">
                          {veh.plateNumber}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">
                        {veh.vehicleMake} {veh.vehicleModel}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-cyan-400 font-bold truncate mt-0.5">
                        {veh.serviceType}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" /> {veh.ownerName}
                      </p>
                    </div>
                  </div>

                  {/* Technician & Bay Tags */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="clay-pill bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[11px] font-bold">
                      {veh.bayNumber || 'Bay 01'}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      {veh.mechanicName || t('unassigned')}
                    </span>
                  </div>

                  {/* Task Progress & Checklist Section */}
                  {(() => {
                    const tasks = veh.tasks && veh.tasks.length > 0
                      ? veh.tasks
                      : getDefaultTasksForService(veh.serviceType);
                    const progress = calculateServiceProgress(tasks, veh.status);
                    const theme = getProgressColorTheme(progress.percent);
                    const isExpanded = expandedCards[veh.id] ?? false;

                    return (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                        {/* Progress Header */}
                        <div
                          onClick={() => toggleExpandCardTasks(veh.id)}
                          className="flex items-center justify-between cursor-pointer select-none py-1 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-1.5">
                            <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Tugasan ({progress.completedCount}/{progress.totalCount})
                            </span>
                            {progress.isAllCompleted && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-black"
                              style={{ color: theme.accentColor }}
                            >
                              {progress.percent}%
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full clay-inset h-2 p-0.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${Math.max(progress.percent, 3)}%`,
                              background: theme.progressBarGradient,
                            }}
                          />
                        </div>

                        {/* Expandable Task Checklist */}
                        {isExpanded && (
                          <div className="pt-2 space-y-1.5 animate-fade-in font-mono">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={(e) => handleToggleTask(veh, task.id, e)}
                                className={`flex items-start gap-2 p-2 rounded-xl transition-all select-none ${
                                  canUpdateTaskChecklist ? 'cursor-pointer' : 'cursor-default'
                                } ${
                                  task.completed
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'clay-inset text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {task.completed ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded border border-slate-400 dark:border-slate-500" />
                                  )}
                                </div>
                                <span
                                  className={`text-xs leading-tight flex-1 ${
                                    task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            ))}

                            {/* Quick Add Custom Task (Operator Only) */}
                            {canUpdateTaskChecklist && (
                              addingTaskId === veh.id ? (
                                <div className="flex gap-1 pt-1">
                                  <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddNewTask(veh);
                                    }}
                                    placeholder="Tugasan baharu..."
                                    className="clay-inset px-2 py-1 text-xs flex-1 text-slate-900 dark:text-white"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleAddNewTask(veh)}
                                    className="clay-btn clay-btn-primary px-2 text-xs font-bold"
                                  >
                                    Tambah
                                  </button>
                                  <button
                                    onClick={() => setAddingTaskId(null)}
                                    className="clay-btn clay-btn-ghost px-2 text-xs"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddingTaskId(veh.id);
                                  }}
                                  className="w-full text-center py-1 text-[11px] text-blue-600 dark:text-cyan-400 font-bold hover:underline flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Tambah Tugasan Tersuai
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {progress.isAllCompleted && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                            <Sparkles className="w-3 h-3" />
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
                    {/* Action Stage Progress Button (Operator Only) */}
                    {canUpdateServiceProgress && veh.status === 'incoming' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'in_progress')}
                        className="col-span-2 clay-btn clay-btn-orange py-2 px-3 text-xs uppercase font-black flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> {t('startRepairWork')}
                      </button>
                    )}

                    {canUpdateServiceProgress && veh.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'completed')}
                        className="col-span-2 clay-btn clay-btn-green py-2 px-3 text-xs uppercase font-black flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('markServiceCompleted')}
                      </button>
                    )}

                    {canUpdateServiceProgress && veh.status === 'completed' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'delivered')}
                        className="col-span-2 clay-btn clay-btn-ghost py-2 px-3 text-xs uppercase font-extrabold flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> {t('markDeliveredHandover')}
                      </button>
                    )}

                    {canUpdateServiceProgress && veh.status === 'delivered' && (
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
                      <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      {isOperator ? t('editJobSheet') : 'Lihat Butiran Kenderaan'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {canRegisterVehicles && (
        <NewVehicleModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={onAddVehicle}
          mechanics={mechanics}
          canAssignMechanic={canAssignMechanics}
        />
      )}

      <VehicleDetailModal
        vehicle={selectedVehicleForDetail}
        isOpen={!!selectedVehicleForDetail}
        onClose={() => setSelectedVehicleForDetail(null)}
        onUpdateStatus={onUpdateStatus}
        onUpdateRecord={onUpdateRecord}
        onDelete={onDeleteVehicle}
        mechanics={mechanics}
        readOnly={!isOperator}
        canAssignMechanic={canAssignMechanics}
        canDeleteVehicle={canDeleteVehicleRecords}
      />

      <OperatorLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
