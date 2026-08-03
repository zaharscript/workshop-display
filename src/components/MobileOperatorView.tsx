import React, { useState } from 'react';
import { VehicleRecord, Mechanic, VehicleStatus, ActivityLog } from '../types';
import {
  Plus,
  Search,
  Filter,
  Car,
  User,
  Phone,
  Wrench,
  Clock,
  CheckCircle2,
  Play,
  Check,
  ChevronRight,
  Sparkles,
  History,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { NewVehicleModal } from './NewVehicleModal';
import { VehicleDetailModal } from './VehicleDetailModal';

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
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<VehicleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<VehicleRecord | null>(null);
  const [showLogs, setShowLogs] = useState(false);

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
    <div className="min-h-[calc(100vh-5rem)] bg-[#0a0b0e] text-[#e0e0e0] p-4 sm:p-6 pb-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Actions Bar (Immersive UI Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#15171e] p-5 rounded-xl border border-white/10 shadow-2xl">
          <div>
            <span className="text-[#3b82f6] font-mono text-[11px] tracking-widest uppercase block mb-1">
              OPERATOR CONSOLE // LIVE CONTROL
            </span>
            <h2 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              MOBILE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">TELEMETRY & INTAKE</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 ${
                showLogs
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/40'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Log ({activityLogs.length})</span>
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Intake New Car</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-white/40" />
            <input
              type="text"
              placeholder="Search plate, owner, make..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161922] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 shadow-inner font-mono"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#15171e] p-1 rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({counts.all})
            </button>

            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'incoming'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'text-blue-400/60 hover:text-blue-400 hover:bg-white/5'
              }`}
            >
              Incoming ({counts.incoming})
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'in_progress'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : 'text-orange-400/60 hover:text-orange-400 hover:bg-white/5'
              }`}
            >
              Repairing ({counts.in_progress})
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-emerald-400/60 hover:text-emerald-400 hover:bg-white/5'
              }`}
            >
              Ready ({counts.completed})
            </button>

            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'delivered'
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              Delivered ({counts.delivered})
            </button>
          </div>
        </div>

        {/* Activity Log Drawer Panel if toggled */}
        {showLogs && (
          <div className="bg-[#15171e] border border-white/10 rounded-xl p-4 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <History className="w-4 h-4" /> Live Activity Audit Log
              </h3>
              <button onClick={() => setShowLogs(false)} className="text-xs text-white/40 hover:text-white">
                Close Log
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-[#161922] p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                      {log.plateNumber}
                    </span>
                    <span className="text-white/80 font-medium">{log.action}</span>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-white/40 border border-dashed border-white/10 rounded-2xl">
              <Car className="w-12 h-12 mb-3 opacity-30 text-cyan-400" />
              <p className="text-base font-bold text-white/70">No Vehicles Found</p>
              <p className="text-xs text-white/30">Try adjusting search or intake a new car</p>
            </div>
          ) : (
            filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className={`bg-[#161922] border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xl transition-all duration-200 hover:border-white/20 ${
                  veh.status === 'completed'
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : veh.status === 'in_progress'
                    ? 'border-orange-500/40 bg-[#1c140e]'
                    : 'border-white/10'
                }`}
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      onClick={() => setSelectedVehicleForDetail(veh)}
                      className="text-lg font-bold tracking-tight text-white font-mono hover:text-cyan-400 transition-colors"
                    >
                      {veh.plateNumber}
                    </button>

                    <div className="flex items-center gap-1.5 font-mono">
                      {veh.priority === 'express' && (
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          ⚡ EXPRESS
                        </span>
                      )}
                      {veh.priority === 'vip' && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          ⭐ VIP
                        </span>
                      )}

                      {/* Status Badge */}
                      {veh.status === 'incoming' && (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Intake
                        </span>
                      )}
                      {veh.status === 'in_progress' && (
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                          <Wrench className="w-3 h-3 animate-spin" /> Repairing
                        </span>
                      )}
                      {veh.status === 'completed' && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {veh.status === 'delivered' && (
                        <span className="bg-white/10 text-white/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Delivered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="flex gap-4 mb-4">
                    <img
                      src={veh.photoUrl}
                      alt={veh.plateNumber}
                      className="w-24 h-20 object-cover rounded border border-white/10 bg-slate-950 shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-sm text-white truncate">
                        {veh.vehicleMake} {veh.vehicleModel}
                      </h4>
                      <p className="text-xs text-cyan-400 font-medium truncate font-mono">{veh.serviceType}</p>

                      <div className="text-[11px] text-white/60 space-y-0.5 pt-1 font-mono">
                        <p className="truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-white/40" />
                          {veh.ownerName}
                        </p>
                        {veh.ownerPhone && <p className="text-white/40 text-[10px]">{veh.ownerPhone}</p>}
                        <p className="text-white/50 font-semibold text-[10px]">Location: {veh.bayNumber || 'Intake Bay'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mechanic Line */}
                  <div className="bg-[#0a0b0e] p-2.5 rounded-lg border border-white/5 mb-4 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40 font-medium flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Technician:
                    </span>
                    <span className="font-bold text-white">{veh.mechanicName || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Card Action Stage Buttons */}
                <div className="pt-3 border-t border-white/10 space-y-2 font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Action Stage Progress Button */}
                    {veh.status === 'incoming' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'in_progress')}
                        className="col-span-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md transition-all"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Repair Work
                      </button>
                    )}

                    {veh.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'completed')}
                        className="col-span-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Service Completed
                      </button>
                    )}

                    {veh.status === 'completed' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'delivered')}
                        className="col-span-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Delivered & Handover
                      </button>
                    )}

                    {veh.status === 'delivered' && (
                      <button
                        onClick={() => onUpdateStatus(veh.id, 'incoming')}
                        className="col-span-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                      >
                        Re-open Intake
                      </button>
                    )}

                    {/* Secondary Detail Button */}
                    <button
                      onClick={() => setSelectedVehicleForDetail(veh)}
                      className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 font-medium text-xs flex items-center justify-center gap-1 col-span-2 border border-white/10"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> Edit / Job Sheet
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
