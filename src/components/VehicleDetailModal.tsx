import React, { useState, useEffect, useRef } from 'react';
import { VehicleRecord, Mechanic, VehicleStatus, ServiceTask } from '../types';
import {
  X,
  User,
  Phone,
  Play,
  CheckCircle2,
  Trash2,
  Printer,
  MapPin,
  ListChecks,
  Plus,
  Check,
  Trash,
  Sparkles,
} from 'lucide-react';
import { t } from '../lib/i18n';
import {
  calculateServiceProgress,
  toggleTaskInList,
  addTaskToList,
  deleteTaskFromList,
  getDefaultTasksForService,
  getProgressColorTheme,
} from '../utils/serviceTasks';

interface VehicleDetailModalProps {
  vehicle: VehicleRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: VehicleStatus) => Promise<void>;
  onUpdateRecord: (id: string, updates: Partial<VehicleRecord>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  mechanics: Mechanic[];
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateRecord,
  onDelete,
  mechanics,
}) => {
  if (!isOpen || !vehicle) return null;

  const [editingNotes, setEditingNotes] = useState(vehicle.notes || '');
  const [selectedMechanic, setSelectedMechanic] = useState(vehicle.mechanicId || '');
  const [selectedBay, setSelectedBay] = useState(vehicle.bayNumber || '');
  const [tasks, setTasks] = useState<ServiceTask[]>(() =>
    vehicle.tasks && vehicle.tasks.length > 0
      ? vehicle.tasks
      : getDefaultTasksForService(vehicle.serviceType)
  );
  const [newTaskInput, setNewTaskInput] = useState('');
  const [saving, setSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (vehicle) {
      setEditingNotes(vehicle.notes || '');
      setSelectedMechanic(vehicle.mechanicId || '');
      setSelectedBay(vehicle.bayNumber || '');
      setTasks(
        vehicle.tasks && vehicle.tasks.length > 0
          ? vehicle.tasks
          : getDefaultTasksForService(vehicle.serviceType)
      );
    }
  }, [vehicle]);

  const handleToggleTask = async (taskId: string) => {
    const updated = toggleTaskInList(tasks, taskId);
    setTasks(updated);

    const anyDone = updated.some((t) => t.completed);
    const updates: Partial<VehicleRecord> = { tasks: updated };

    if (vehicle.status === 'incoming' && anyDone) {
      updates.status = 'in_progress';
      if (!vehicle.startTime) updates.startTime = new Date().toISOString();
    }

    await onUpdateRecord(vehicle.id, updates);
  };

  const handleAddTask = async () => {
    if (!newTaskInput.trim()) return;
    const updated = addTaskToList(tasks, newTaskInput);
    setTasks(updated);
    setNewTaskInput('');
    await onUpdateRecord(vehicle.id, { tasks: updated });
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = deleteTaskFromList(tasks, taskId);
    setTasks(updated);
    await onUpdateRecord(vehicle.id, { tasks: updated });
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await onUpdateRecord(vehicle.id, {
        notes: editingNotes,
        mechanicId: selectedMechanic || undefined,
        bayNumber: selectedBay,
        tasks,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintJobTicket = () => {
    window.print();
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'incoming':
        return <span className="clay-pill bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase">{t('incomingIntakeStage')}</span>;
      case 'in_progress':
        return <span className="clay-pill bg-orange-500 text-white px-3 py-1 text-xs font-bold uppercase flex items-center gap-1"><Sparkles className="w-3 h-3 animate-spin" /> {t('repairInProgressStage')}</span>;
      case 'completed':
        return <span className="clay-pill bg-emerald-500 text-white px-3 py-1 text-xs font-bold uppercase flex items-center gap-1"><Check className="w-3 h-3 stroke-[3]" /> {t('serviceCompletedStage')}</span>;
      case 'delivered':
        return <span className="clay-pill bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-bold uppercase">{t('deliveredToOwnerStage')}</span>;
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-2 sm:py-6">
        <div className="clay-card rounded-3xl w-full max-w-2xl overflow-hidden my-auto border-2 border-white/60 dark:border-white/10">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 font-mono">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="clay-pill bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-black text-sm sm:text-lg px-3 py-1 tracking-wider shadow-sm">
                {vehicle.plateNumber}
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {vehicle.vehicleMake} {vehicle.vehicleModel}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  {t('registeredAt')} {new Date(vehicle.entryTime).toLocaleString('ms-MY')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handlePrintJobTicket}
                className="clay-btn clay-btn-ghost text-xs font-bold p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1"
                title="Cetak Slip Kerja Pelanggan"
              >
                <Printer className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">{t('printSlip')}</span>
              </button>
              <button
                onClick={onClose}
                className="clay-btn clay-btn-ghost p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 text-slate-800 dark:text-slate-200 font-sans">
          {/* Status Quick Bar */}
          <div className="clay-inset p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">
                {t('currentJobStatus')}
              </span>
              {getStatusBadge(vehicle.status)}
            </div>

            {/* Stage Action Buttons */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {vehicle.status === 'incoming' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'in_progress')}
                  className="clay-btn clay-btn-orange py-2 px-4 text-xs font-black uppercase flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" /> {t('startRepairWork')}
                </button>
              )}

              {vehicle.status === 'in_progress' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'completed')}
                  className="clay-btn clay-btn-green py-2 px-4 text-xs font-black uppercase flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> {t('markServiceCompleted')}
                </button>
              )}

              {vehicle.status === 'completed' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'delivered')}
                  className="clay-btn clay-btn-ghost py-2 px-4 text-xs font-bold uppercase flex items-center gap-1.5"
                >
                  {t('markDeliveredHandover')}
                </button>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono">
            {/* Left Column: Photo & Owner */}
            <div className="space-y-4">
              <img
                src={vehicle.photoUrl}
                alt={vehicle.plateNumber}
                className="w-full h-44 object-cover rounded-2xl border-2 border-white/80 shadow-md bg-slate-200 dark:bg-slate-900"
              />

              <div className="clay-inset p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" /> {t('ownerContact')}
                </h4>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{vehicle.ownerName}</p>
                {vehicle.ownerPhone && (
                  <p className="text-xs text-blue-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {vehicle.ownerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Workshop Specs & Assignments */}
            <div className="space-y-4">
              {/* Service Type */}
              <div className="clay-inset p-4">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t('serviceCategory')}
                </label>
                <p className="text-sm font-black text-blue-600 dark:text-cyan-400">{vehicle.serviceType}</p>
              </div>

              {/* Bay Number */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t('workshopBayLocation')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={selectedBay}
                    onChange={(e) => setSelectedBay(e.target.value)}
                    className="clay-inset w-full pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Technician Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t('assignTechnician')}
                </label>
                <select
                  value={selectedMechanic}
                  onChange={(e) => setSelectedMechanic(e.target.value)}
                  className="clay-inset w-full px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold cursor-pointer"
                >
                  <option value="">{t('unassigned')}</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Repair Notes */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t('mechanicRepairNotes')}
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="clay-inset w-full px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                  placeholder="Tambah nota mengenai kemajuan pembaikan..."
                />
              </div>
            </div>
          </div>

          {/* To-Do Checklist & Progress Bar Section */}
          {(() => {
            const progress = calculateServiceProgress(tasks, vehicle.status);
            const theme = getProgressColorTheme(progress.percent);
            return (
              <div className="clay-card p-5 space-y-4 font-mono">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                      Senarai Semak Tugasan Servis (Job Checklist)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tandakan setiap tugasan setelah selesai. Kemajuan dikemas kini secara langsung di skrin TV pelanggan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="clay-pill px-3 py-1 text-xs font-black flex items-center gap-1 transition-all duration-300"
                      style={{
                        background: theme.accentLight,
                        color: theme.accentColor,
                        border: `1px solid ${theme.accentBorder}`,
                      }}
                    >
                      {progress.isAllCompleted ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>100% LENGKAP</span>
                        </>
                      ) : (
                        <span>
                          {progress.percent}% ({progress.completedCount}/{progress.totalCount} SIAP)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress Line */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">Kemajuan Keseluruhan Kerja</span>
                    <span className="font-black" style={{ color: theme.accentColor }}>{progress.percent}%</span>
                  </div>
                  <div className="w-full clay-inset h-3 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max(progress.percent, 2)}%`,
                        background: theme.progressBarGradient,
                        boxShadow: theme.progressBarGlow,
                      }}
                    />
                  </div>
                </div>

                {/* Task Checklist Items */}
                <div className="space-y-2">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition-all ${
                        task.completed
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40'
                          : 'clay-card hover:-translate-y-0.5 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 select-none"
                      >
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                            task.completed
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'border-2 border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs sm:text-sm leading-snug ${
                              task.completed ? 'line-through text-emerald-700 dark:text-emerald-300/70 font-medium' : 'text-slate-900 dark:text-white font-bold'
                            }`}
                          >
                            <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                            {task.title}
                          </p>
                          {task.completed && task.completedAt && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400/70 block mt-0.5">
                              Disiapkan pada {new Date(task.completedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                        title="Padam tugasan"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Task Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    placeholder="Tambah tugasan tersuai (contoh: Skim disc rotor brek belakang)..."
                    className="clay-inset flex-1 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="clay-btn clay-btn-primary px-3 py-2 text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Tambah Tugasan
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/60 font-mono">
            <button
              onClick={async () => {
                if (confirm(`Adakah anda pasti mahu memadam rekod kenderaan ${vehicle.plateNumber}?`)) {
                  await onDelete(vehicle.id);
                  onClose();
                }
              }}
              className="clay-btn clay-btn-ghost text-red-600 dark:text-red-400 px-3 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> {t('deleteRecord')}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="clay-btn clay-btn-ghost px-4 py-2 text-xs font-bold"
              >
                {t('close')}
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="clay-btn clay-btn-primary px-5 py-2 text-xs uppercase tracking-wider font-black shadow-md disabled:opacity-50"
              >
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
