import React, { useState } from 'react';
import { VehicleRecord, Mechanic, VehicleStatus } from '../types';
import { X, Car, User, Phone, Wrench, Clock, FileText, CheckCircle2, Play, AlertTriangle, Trash2, Printer, MapPin } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await onUpdateRecord(vehicle.id, {
        notes: editingNotes,
        mechanicId: selectedMechanic || undefined,
        bayNumber: selectedBay,
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
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">1. INCOMING INTAKE</span>;
      case 'in_progress':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">2. REPAIR IN PROGRESS</span>;
      case 'completed':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">3. SERVICE COMPLETED</span>;
      case 'delivered':
        return <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase">4. DELIVERED TO OWNER</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#15171e] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header (Immersive UI Style) */}
        <div className="bg-[#0a0b0e] px-6 py-4 flex items-center justify-between border-b border-white/10 font-mono">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-lg px-3 py-1 rounded tracking-wider shadow-md">
              {vehicle.plateNumber}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                {vehicle.vehicleMake} {vehicle.vehicleModel}
              </h3>
              <p className="text-[11px] text-white/40">Registered: {new Date(vehicle.entryTime).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintJobTicket}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 border border-white/10"
              title="Print Customer Job Ticket"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 text-[#e0e0e0] font-sans">
          {/* Status Quick Bar */}
          <div className="bg-[#161922] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-xs text-white/50 uppercase font-bold tracking-wider block mb-1">Current Job Status</span>
              {getStatusBadge(vehicle.status)}
            </div>

            {/* Stage Action Buttons */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {vehicle.status === 'incoming' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'in_progress')}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-4 h-4" /> Start Repair Work
                </button>
              )}

              {vehicle.status === 'in_progress' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'completed')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Service Completed
                </button>
              )}

              {vehicle.status === 'completed' && (
                <button
                  onClick={() => onUpdateStatus(vehicle.id, 'delivered')}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase flex items-center gap-1.5"
                >
                  Mark Delivered
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

              <div className="bg-[#161922] p-4 rounded-xl border border-white/10 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Owner Contact
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
              <div className="bg-[#161922] p-4 rounded-xl border border-white/10">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  Service Category
                </label>
                <p className="text-sm font-bold text-cyan-400">{vehicle.serviceType}</p>
              </div>

              {/* Bay Number */}
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  Workshop Bay / Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                  <input
                    type="text"
                    value={selectedBay}
                    onChange={(e) => setSelectedBay(e.target.value)}
                    className="w-full bg-[#161922] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Technician Dropdown */}
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1">
                  Assigned Technician / Mechanic
                </label>
                <select
                  value={selectedMechanic}
                  onChange={(e) => setSelectedMechanic(e.target.value)}
                  className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Unassigned</option>
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
                  Mechanic Repair Notes
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  placeholder="Add notes about repair progress..."
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 font-mono">
            <button
              onClick={async () => {
                if (confirm(`Are you sure you want to remove ${vehicle.plateNumber} from queue?`)) {
                  await onDelete(vehicle.id);
                  onClose();
                }
              }}
              className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Delete Record
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 text-white/70 font-semibold text-xs hover:bg-white/20"
              >
                Close
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase shadow-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
