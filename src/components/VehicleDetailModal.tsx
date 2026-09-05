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
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">{t('incomingIntakeStage')}</span>;
      case 'in_progress':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">{t('repairInProgressStage')}</span>;
      case 'completed':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">{t('serviceCompletedStage')}</span>;
      case 'delivered':
        return <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase">{t('deliveredToOwnerStage')}</span>;
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-2 sm:py-6">
        <div className="bg-[#282a2c] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-[#1e2022] px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-white/10 font-mono shadow-md">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-sm sm:text-lg px-2.5 sm:px-3 py-1 rounded tracking-wider shadow-md">
                {vehicle.plateNumber}
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {vehicle.vehicleMake} {vehicle.vehicleModel}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-white/40">
                  {t('registeredAt')} {new Date(vehicle.entryTime).toLocaleString('ms-MY')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handlePrintJobTicket}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 border border-white/10"
                title="Cetak Slip Kerja Pelanggan"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">{t('printSlip')}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 text-[#e0e0e0] font-sans">
          {/* Status Quick Bar */}
          <div className="bg-[#242628] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-xs text-white/50 uppercase font-bold tracking-wider block mb-1">
                {t('currentJobStatus')}
              </span>
              {getStatusBadge(vehicle.status)}
            </div>

            {/* Stage Action Buttons */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {vehicle.status === 'incoming' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'in_progress')}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-4 h-4" /> {t('startRepairWork')}
                </button>
              )}

              {vehicle.status === 'in_progress' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'completed')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> {t('markServiceCompleted')}
                </button>
              )}

              {vehicle.status === 'completed' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'delivered')}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase flex items-center gap-1.5"
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
                className="w-full h-44 object-cover rounded-xl border border-white/10 bg-slate-950"
              />

              <div className="bg-[#242628] p-4 rounded-xl border border-white/10 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> {t('ownerContact')}
                </h4>
                <p className="text-sm font-bold text-white">{vehicle.ownerName}</p>
                {vehicle.ownerPhone && (
                  <p className="text-xs text-cyan-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-white/40" />
                    {vehicle.ownerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Workshop Specs & Assignments */}
            <div className="space-y-4">
              {/* Service Type */}
              <div className="bg-[#242628] p-4 rounded-xl border border-white/10">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  {t('serviceCategory')}
                </label>
                <p className="text-sm font-bold text-cyan-400">{vehicle.serviceType}</p>
              </div>

              {/* Bay Number */}
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  {t('workshopBayLocation')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                  <input
                    type="text"
                    value={selectedBay}
                    onChange={(e) => setSelectedBay(e.target.value)}
                    className="w-full bg-[#242628] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Technician Dropdown */}
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  {t('assignTechnician')}
                </label>
                <select
                  value={selectedMechanic}
                  onChange={(e) => setSelectedMechanic(e.target.value)}
                  className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  {t('mechanicRepairNotes')}
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
              <div className="bg-[#1a1c1e] p-5 rounded-2xl border border-white/10 space-y-4 font-mono">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-cyan-400" />
                      Senarai Semak Tugasan Servis (Job Checklist)
                    </h4>
                    <p className="text-xs text-white/50 mt-0.5">
                      Tandakan setiap tugasan setelah selesai. Kemajuan dikemas kini secara langsung di skrin TV pelanggan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all duration-300"
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
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Kemajuan Keseluruhan Kerja</span>
                    <span className="font-bold" style={{ color: theme.accentColor }}>{progress.percent}%</span>
                  </div>
                  <div className="w-full bg-[#0e1013] h-3 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
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
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        task.completed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                          : 'bg-[#242628] border-white/10 text-white/90 hover:border-white/20'
                      }`}
                    >
                      <div
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 select-none"
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
                            task.completed
                              ? 'bg-emerald-500 text-black shadow-sm'
                              : 'border border-white/30 hover:border-cyan-400 bg-black/40'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs sm:text-sm font-medium leading-snug ${
                              task.completed ? 'line-through text-emerald-300/70' : 'text-white'
                            }`}
                          >
                            <span className="text-white/40 mr-1.5">{idx + 1}.</span>
                            {task.title}
                          </p>
                          {task.completed && task.completedAt && (
                            <span className="text-[10px] text-emerald-400/70 block mt-0.5">
                              Disiapkan pada {new Date(task.completedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
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
                    className="flex-1 bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Tugasan
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 font-mono">
            <button
              onClick={async () => {
                if (confirm(`Adakah anda pasti mahu memadam rekod kenderaan ${vehicle.plateNumber}?`)) {
                  await onDelete(vehicle.id);
                  onClose();
                }
              }}
              className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" /> {t('deleteRecord')}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 text-white/70 font-semibold text-xs hover:bg-white/20"
              >
                {t('close')}
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase shadow-md disabled:opacity-50"
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
