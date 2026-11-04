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
  Lock,
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
  readOnly?: boolean;
  /** When false the mechanic-assignment dropdown is disabled (mechanic role). Defaults to !readOnly. */
  canAssignMechanic?: boolean;
  /** Vehicle deletion is available to both active operator roles. */
  canDeleteVehicle: boolean;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateRecord,
  onDelete,
  mechanics,
  readOnly = false,
  canAssignMechanic,
  canDeleteVehicle,
}) => {
  if (!isOpen || !vehicle) return null;

  // canAssignMechanic defaults to write-mode (not readOnly), but is independently
  // overridable so mechanic-role operators can edit other fields while being blocked
  // from changing the mechanic assignment.
  const assignMechanic = canAssignMechanic ?? !readOnly;

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
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setEditingNotes(vehicle.notes || '');
    setSelectedMechanic(vehicle.mechanicId || '');
    setSelectedBay(vehicle.bayNumber || '');
    setTasks(
      vehicle.tasks && vehicle.tasks.length > 0
        ? vehicle.tasks
        : getDefaultTasksForService(vehicle.serviceType)
    );
  }, [vehicle]);

  const handleToggleTask = (taskId: string) => {
    if (readOnly) return;
    const updated = toggleTaskInList(tasks, taskId);
    setTasks(updated);
  };

  const handleAddTask = () => {
    if (readOnly || !newTaskInput.trim()) return;
    const updated = addTaskToList(tasks, newTaskInput);
    setTasks(updated);
    setNewTaskInput('');
  };

  const handleDeleteTask = (taskId: string) => {
    if (readOnly) return;
    const updated = deleteTaskFromList(tasks, taskId);
    setTasks(updated);
  };

  const handleSaveDetails = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const updates: Partial<VehicleRecord> = {
        notes: editingNotes.trim(),
        bayNumber: selectedBay.trim() || undefined,
        tasks,
      };
      // Only include mechanic assignment change when the user has admin permission.
      // This is a belt-and-suspenders guard on top of the Firestore rule.
      if (assignMechanic) {
        updates.mechanicId = selectedMechanic || undefined;
      }
      await onUpdateRecord(vehicle.id, updates);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePrintJobTicket = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job Slip - ${vehicle.plateNumber}</title>
          <style>
            @page { size: A5; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.4; color: #111; padding: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 15px; }
            .brand { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
            .sub { font-size: 11px; text-transform: uppercase; margin-top: 2px; }
            .badge { display: inline-block; font-size: 24px; font-weight: 900; background: #000; color: #fff; padding: 4px 14px; border-radius: 4px; margin: 8px 0; letter-spacing: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
            .label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #666; margin-bottom: 2px; }
            .val { font-size: 13px; font-weight: 700; }
            .checklist { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 15px; }
            .check-item { display: flex; align-items: center; margin-bottom: 6px; font-size: 12px; }
            .box { width: 14px; height: 14px; border: 1.5px solid #333; margin-right: 8px; display: inline-block; }
            .checked { background: #333; color: white; text-align: center; line-height: 14px; font-size: 10px; }
            .notes { border: 1px solid #ddd; padding: 8px; border-radius: 4px; margin-top: 10px; font-style: italic; background: #fdfdfd; }
            .footer { margin-top: 25px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #aaa; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">QES FORD AUTOPARTS</div>
            <div class="sub">LEMBARAN KERJA & TIKET GILIRAN BENGKEL</div>
            <div class="badge">${vehicle.plateNumber}</div>
            <div style="font-size: 11px; margin-top: 4px;">Didaftarkan: ${new Date(vehicle.entryTime).toLocaleString('ms-MY')}</div>
          </div>

          <div class="grid">
            <div>
              <div class="label">Nama Pemilik:</div>
              <div class="val">${vehicle.ownerName}</div>
            </div>
            <div>
              <div class="label">No. Telefon:</div>
              <div class="val">${vehicle.ownerPhone || '-'}</div>
            </div>
            <div>
              <div class="label">Model Kenderaan:</div>
              <div class="val">${vehicle.vehicleMake} ${vehicle.vehicleModel}</div>
            </div>
            <div>
              <div class="label">Kategori Servis:</div>
              <div class="val">${vehicle.serviceType}</div>
            </div>
            <div>
              <div class="label">Lokasi / Bay:</div>
              <div class="val">${vehicle.bayNumber || 'Bay 01'}</div>
            </div>
            <div>
              <div class="label">Juruteknik Ditugaskan:</div>
              <div class="val">${mechanics.find((m) => m.id === vehicle.mechanicId)?.name || 'Belum Ditugaskan'}</div>
            </div>
          </div>

          <div class="checklist">
            <div class="label" style="margin-bottom: 8px;">Senarai Semak Tugasan Servis:</div>
            ${tasks.map((t, i) => `
              <div class="check-item">
                <span class="box ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</span>
                <span><strong>${i + 1}.</strong> ${t.title}</span>
              </div>
            `).join('')}
          </div>

          ${vehicle.notes ? `
            <div style="margin-top: 12px;">
              <div class="label">Nota Pembaikan / Aduan:</div>
              <div class="notes">${vehicle.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>Terima kasih atas kepercayaan anda memilih QES Ford Autoparts.</div>
            <div>Sebarang pertanyaan hubungi talian hotline: 011-3786 6127</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    printIframeRef.current = iframe;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'incoming':
        return <span className="clay-pill bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-xs px-3 py-1.5">{t('incomingIntakeStage')}</span>;
      case 'in_progress':
        return <span className="clay-pill bg-blue-500/10 text-blue-600 dark:text-cyan-400 font-extrabold text-xs px-3 py-1.5">{t('repairInProgressStage')}</span>;
      case 'completed':
        return <span className="clay-pill bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs px-3 py-1.5">{t('serviceCompletedStage')}</span>;
      case 'delivered':
        return <span className="clay-pill bg-slate-500/10 text-slate-600 dark:text-slate-400 font-extrabold text-xs px-3 py-1.5">{t('deliveredToOwnerStage')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in flex items-center justify-center">
      <div className="relative w-full max-w-2xl my-6">
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
            {readOnly && (
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Mod Baca Sahaja: Log masuk operator diperlukan untuk mengemas kini maklumat ini.</span>
              </div>
            )}

            {/* Status Quick Bar */}
            <div className="clay-inset p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">
                  {t('currentJobStatus')}
                </span>
                {getStatusBadge(vehicle.status)}
              </div>

              {/* Stage Action Buttons */}
              {!readOnly && (
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
              )}
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
                      disabled={readOnly}
                      value={selectedBay}
                      onChange={(e) => setSelectedBay(e.target.value)}
                      className="clay-inset w-full pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Technician Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {t('assignTechnician')}
                  </label>
                  <select
                    disabled={!assignMechanic}
                    value={selectedMechanic}
                    onChange={(e) => setSelectedMechanic(e.target.value)}
                    className="clay-inset w-full px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold cursor-pointer disabled:opacity-60"
                  >
                    <option value="">{t('unassigned')}</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.specialty})
                      </option>
                    ))}
                  </select>
                  {!assignMechanic && !readOnly && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-mono">
                      Hanya pentadbir boleh menukar penugasan juruteknik.
                    </p>
                  )}
                </div>

                {/* Repair Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {t('mechanicRepairNotes')}
                  </label>
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="clay-inset w-full px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono disabled:opacity-60"
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                        Senarai Semak Tugasan Servis
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tandakan tugasan apabila juruteknik selesai melaksanakan servis.
                      </p>
                    </div>

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
                          className={`flex items-center gap-3 flex-1 min-w-0 select-none ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
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

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                            title="Padam tugasan"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add New Task Input */}
                  {!readOnly && (
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
                  )}
                </div>
              );
            })()}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/60 font-mono">
              {canDeleteVehicle ? (
                <button
                  onClick={async () => {
                    if (!canDeleteVehicle) return;
                    if (confirm(`Adakah anda pasti mahu memadam rekod kenderaan ${vehicle.plateNumber}?`)) {
                      await onDelete(vehicle.id);
                      onClose();
                    }
                  }}
                  className="clay-btn clay-btn-ghost text-red-600 dark:text-red-400 px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> {t('deleteRecord')}
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="clay-btn clay-btn-ghost px-4 py-2 text-xs font-bold"
                >
                  {t('close')}
                </button>
                {!readOnly && (
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className="clay-btn clay-btn-primary px-5 py-2 text-xs uppercase tracking-wider font-black shadow-md disabled:opacity-50"
                  >
                    {saving ? t('saving') : t('saveChanges')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
