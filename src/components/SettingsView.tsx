import React, { useState } from 'react';
import { Announcement, Mechanic } from '../types';
import { Megaphone, Plus, Wrench, RefreshCw, Database, Info, Clock, Coffee, Phone, MapPin, Trash2, Pencil, Check, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { QESFordLogo } from './QESFordLogo';

interface SettingsViewProps {
  announcements: Announcement[];
  mechanics: Mechanic[];
  onAddAnnouncement: (text: string, type: 'info' | 'alert' | 'promo') => Promise<any>;
  onUpdateAnnouncement?: (
    id: string,
    updates: { text?: string; type?: 'info' | 'alert' | 'promo'; active?: boolean }
  ) => Promise<any>;
  onDeleteAnnouncement?: (id: string) => Promise<any>;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  announcements,
  mechanics,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onResetData,
}) => {
  const [newTickerText, setNewTickerText] = useState('');
  const [tickerType, setTickerType] = useState<'info' | 'alert' | 'promo'>('info');
  const [addingTicker, setAddingTicker] = useState(false);
  const [deletingTickerId, setDeletingTickerId] = useState<string | null>(null);

  // Edit Ticker State
  const [editingTickerId, setEditingTickerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingType, setEditingType] = useState<'info' | 'alert' | 'promo'>('info');
  const [savingTicker, setSavingTicker] = useState(false);

  const [resetDoneMsg, setResetDoneMsg] = useState('');

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerText.trim()) return;
    setAddingTicker(true);
    try {
      await onAddAnnouncement(newTickerText.trim(), tickerType);
      setNewTickerText('');
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTicker(false);
    }
  };

  const startEditTicker = (ann: Announcement) => {
    setEditingTickerId(ann.id);
    setEditingText(ann.text);
    setEditingType(ann.type);
  };

  const cancelEditTicker = () => {
    setEditingTickerId(null);
    setEditingText('');
  };

  const handleSaveEditTicker = async (id: string) => {
    if (!onUpdateAnnouncement) return;
    if (!editingText.trim()) return;

    setSavingTicker(true);
    try {
      await onUpdateAnnouncement(id, {
        text: editingText.trim(),
        type: editingType,
      });
      setEditingTickerId(null);
    } catch (err) {
      console.error('Failed to update ticker:', err);
    } finally {
      setSavingTicker(false);
    }
  };

  const handleDeleteTicker = async (id: string, text: string) => {
    if (!onDeleteAnnouncement) return;
    if (!confirm(`${t('deleteTickerConfirm')}\n\n"${text}"`)) return;

    setDeletingTickerId(id);
    try {
      await onDeleteAnnouncement(id);
      if (editingTickerId === id) {
        cancelEditTicker();
      }
    } catch (err) {
      console.error('Failed to delete ticker:', err);
    } finally {
      setDeletingTickerId(null);
    }
  };

  const handleReset = async () => {
    if (confirm('Adakah anda pasti mahu set semula giliran bengkel kepada data sampel asal?')) {
      await onResetData();
      setResetDoneMsg(t('queueResetSuccess'));
      setTimeout(() => setResetDoneMsg(''), 4000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#353839] text-[#e0e0e0] p-4 sm:p-6 pb-24 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#282a2c] border border-white/10 p-6 rounded-xl shadow-2xl">
          <span className="text-[#3b82f6] font-mono text-[11px] tracking-widest uppercase block mb-1">
            {t('systemSetup')}
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            SISTEM BENGKEL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">{t('workshopSettingsTitle')}</span>
          </h2>
          <p className="text-xs text-white/50 mt-1 font-mono">
            {t('settingsDescription')}
          </p>
        </div>

        {/* Section 1: Live Marquee Announcement Ticker Control */}
        <div className="bg-[#282a2c] border border-white/10 rounded-xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Megaphone className="w-5 h-5 font-bold" />
            <h3 className="font-mono font-bold text-base tracking-widest uppercase text-white">
              {t('tvDisplayMarqueeAnnouncements')}
            </h3>
          </div>

          {/* Add New Announcement Form */}
          <form onSubmit={handleAddTicker} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder={t('typeNoticePlaceholder')}
              value={newTickerText}
              onChange={(e) => setNewTickerText(e.target.value)}
              className="flex-1 bg-[#242628] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-full font-mono"
            />
            <select
              value={tickerType}
              onChange={(e) => setTickerType(e.target.value as 'info' | 'alert' | 'promo')}
              className="bg-[#242628] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 shrink-0 font-mono"
            >
              <option value="info">{t('infoNotice')}</option>
              <option value="alert">{t('alertUrgent')}</option>
              <option value="promo">{t('specialOffer')}</option>
            </select>
            <button
              type="submit"
              disabled={addingTicker}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {t('addTicker')}
            </button>
          </form>

          {/* Active Tickers List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider">
                {t('activeTvTickers')} ({announcements.length})
              </h4>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-[#242628] border border-white/5 rounded-xl p-5 text-center font-mono text-xs text-white/40">
                {t('noActiveTickers')}
              </div>
            ) : (
              announcements.map((ann) => {
                const isDeleting = deletingTickerId === ann.id;
                const isEditing = editingTickerId === ann.id;

                if (isEditing) {
                  return (
                    <div
                      key={ann.id}
                      className="bg-[#1c1e20] border-2 border-cyan-500/50 p-3.5 rounded-xl space-y-3 text-xs font-mono shadow-xl transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          {t('editTickerAnnouncement')}
                        </span>
                        <button
                          type="button"
                          onClick={cancelEditTicker}
                          className="text-white/40 hover:text-white p-1"
                          title={t('cancelEdit')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-[#121416] border border-white/10 rounded-lg p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 uppercase"
                          placeholder="Masukkan teks pengumuman..."
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40 uppercase font-bold mr-1">Kategori:</span>
                          {(['info', 'alert', 'promo'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setEditingType(type)}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                                editingType === type
                                  ? type === 'alert'
                                    ? 'bg-red-500/30 text-red-300 border-red-500/60 shadow-sm'
                                    : type === 'promo'
                                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 shadow-sm'
                                    : 'bg-cyan-500/30 text-cyan-300 border-cyan-500/60 shadow-sm'
                                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {type === 'alert' ? t('alertUrgent') : type === 'promo' ? t('specialOffer') : t('infoNotice')}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditTicker}
                            disabled={savingTicker}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            {t('cancelEdit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditTicker(ann.id)}
                            disabled={savingTicker || !editingText.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{savingTicker ? t('savingTicker') : t('saveTicker')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={ann.id}
                    className="bg-[#242628] hover:bg-[#2a2c2f] border border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono transition-all group"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          ann.type === 'alert'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : ann.type === 'promo'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {ann.type === 'alert' ? t('alertUrgent') : ann.type === 'promo' ? t('specialOffer') : t('infoNotice')}
                      </span>
                      <span className="font-semibold text-white/90 break-words flex-1">{ann.text}</span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-[10px] text-white/40 mr-1">
                        {new Date(ann.createdAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {onUpdateAnnouncement && (
                        <button
                          type="button"
                          onClick={() => startEditTicker(ann)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          title={t('editTicker')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{t('editTicker')}</span>
                        </button>
                      )}

                      {onDeleteAnnouncement && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTicker(ann.id, ann.text)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                          title={t('deleteTicker')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeleting ? t('deletingTicker') : t('deleteTicker')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: QES Ford Autoparts Workshop Information & Operating Hours */}
        <div className="bg-[#282a2c] border border-cyan-500/30 rounded-xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <QESFordLogo size="lg" />
            <div className="bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest block">TELEFON / WHATSAPP</span>
              <span className="text-lg font-mono font-black text-white flex items-center justify-end gap-1.5">
                <Phone className="w-4 h-4 text-cyan-400" /> 011-3786 6127
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Waktu Operasi */}
            <div className="bg-[#242628] border border-white/10 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-sm border-b border-white/10 pb-2">
                <Clock className="w-4 h-4" />
                <span>Waktu Operasi</span>
              </div>
              <div className="space-y-2 text-white/90">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">ISNIN - JUMAAT</span>
                  <span className="font-bold text-amber-300">8.30 PAGI - 5.30 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">SABTU</span>
                  <span className="font-bold text-amber-300">8.30 PAGI - 2.30 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/60">AHAD & CUTI UMUM</span>
                  <span className="font-bold text-red-400 uppercase">TUTUP</span>
                </div>
              </div>
            </div>

            {/* Waktu Rehat & Lokasi */}
            <div className="bg-[#242628] border border-white/10 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider text-sm border-b border-white/10 pb-2">
                <Coffee className="w-4 h-4" />
                <span>Waktu Rehat</span>
              </div>
              <div className="space-y-2 text-white/90">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">ISNIN - SABTU</span>
                  <span className="font-bold text-orange-300">1.00 TGH HARI - 2.00 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/60">JUMAAT</span>
                  <span className="font-bold text-orange-300">12.30 TGH HARI - 2.30 PETANG</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-white/70 space-y-1">
                <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> ALAMAT BENGKEL:
                </div>
                <p className="text-white text-[11px] leading-snug">
                  19, Jalan Impian Putra 1/4, Taman Impian Putra, Bandar Seri Putra, 43000 Kajang, Selangor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Technician Roster */}
        <div className="bg-[#282a2c] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Wrench className="w-5 h-5 font-bold" />
            <h3 className="font-mono font-bold text-base tracking-widest uppercase text-white">
              {t('workshopTechniciansRoster')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mechanics.map((m) => (
              <div key={m.id} className="bg-[#242628] border border-white/10 p-4 rounded-xl flex items-center gap-3">
                <img src={m.avatarUrl} alt={m.name} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-900" />
                <div>
                  <h4 className="font-bold text-xs text-white">{m.name}</h4>
                  <p className="text-[11px] text-cyan-400 font-mono">{m.specialty}</p>
                  <p className="text-[10px] text-white/40 mt-1 font-mono">
                    {t('activeJobs')} <span className="font-bold text-white">{m.activeJobsCount}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: System Architecture & Optimization Note */}
        <div className="bg-[#282a2c] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4 font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <Database className="w-5 h-5 font-bold" />
            <h3 className="font-bold text-base tracking-widest uppercase text-white">
              {t('architectureDatabaseOptimization')}
            </h3>
          </div>

          <div className="bg-[#242628] border border-white/10 p-4 rounded-xl text-xs space-y-2 text-white/70 leading-relaxed">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
              <Info className="w-4 h-4" />
              <span>Spesifikasi Cermin Asal (Surau Display System):</span>
            </div>
            <p>
              • <strong>Saluran Dwi Paparan:</strong> TV View dioptimumkan khusus untuk monitor paparan awam (tanpa borang suntingan), manakala Mobile View membolehkan operator staf mengemaskini status kenderaan.
            </p>
            <p>
              • <strong>Pilihan Kamera Telefon & Mampatan:</strong> Mengambil foto secara terus dari kamera telefon pintar dengan mampatan WebP/JPEG automatik untuk menjimatkan saiz pangkalan data.
            </p>
            <p>
              • <strong>Penyelarasan Masa-Nyata (Real-Time):</strong> Perubahan status di Konsol Mobile serta-merta disegerakkan ke skrin TV melalui tindak balas pangkalan data & saluran siaran.
            </p>
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <div>
              <p className="text-xs font-bold text-white">{t('resetWorkshopQueue')}</p>
              <p className="text-[11px] text-white/40">{t('restoresInitialSampleData')}</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs flex items-center gap-1.5 border border-white/10"
            >
              <RefreshCw className="w-4 h-4" /> {t('resetSampleDataBtn')}
            </button>
          </div>

          {resetDoneMsg && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 text-xs font-bold">
              {resetDoneMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
