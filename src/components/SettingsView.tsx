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
    <div className="min-h-[calc(100vh-5.5rem)] p-3 sm:p-6 pb-24 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="clay-card p-6 border border-[#e5dac7] dark:border-[#2f5547]">
          <span className="text-[#c45c3d] dark:text-[#df785d] font-serif italic text-xs tracking-wider block mb-1">
            ❧ Bengkel Artisan & Konfigurasi Paparan Ticker
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-[#1c382f] dark:text-[#f4efe4] tracking-tight flex items-center gap-2">
            Tetapan <span className="text-[#c45c3d] font-normal italic">{t('workshopSettingsTitle')}</span>
          </h2>
          <p className="text-xs text-[#6e5e50] dark:text-[#a0b5a9] mt-1 font-serif italic">
            {t('settingsDescription')}
          </p>
        </div>

        {/* Section 1: Live Marquee Announcement Ticker Control */}
        <div className="clay-card p-6 space-y-6 border border-[#e5dac7] dark:border-[#2f5547]">
          <div className="flex items-center gap-2 text-[#1c382f] dark:text-[#dfb974]">
            <Megaphone className="w-5 h-5 text-[#c45c3d]" />
            <h3 className="font-serif font-bold text-base tracking-wide text-[#1c382f] dark:text-[#f7f2e9]">
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
              className="clay-inset flex-1 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none w-full font-mono font-medium"
            />
            <select
              value={tickerType}
              onChange={(e) => setTickerType(e.target.value as 'info' | 'alert' | 'promo')}
              className="clay-inset px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none shrink-0 font-mono font-bold cursor-pointer"
            >
              <option value="info">{t('infoNotice')}</option>
              <option value="alert">{t('alertUrgent')}</option>
              <option value="promo">{t('specialOffer')}</option>
            </select>
            <button
              type="submit"
              disabled={addingTicker}
              className="clay-btn clay-btn-primary px-5 py-2.5 text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> {t('addTicker')}
            </button>
          </form>

          {/* Active Tickers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('activeTvTickers')} ({announcements.length})
              </h4>
            </div>

            {announcements.length === 0 ? (
              <div className="clay-inset p-5 text-center font-mono text-xs text-slate-400">
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
                      className="clay-card-blue p-4 space-y-3 text-xs font-mono transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          {t('editTickerAnnouncement')}
                        </span>
                        <button
                          type="button"
                          onClick={cancelEditTicker}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
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
                          className="clay-inset w-full p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none uppercase"
                          placeholder="Masukkan teks pengumuman..."
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 uppercase font-extrabold mr-1">Kategori:</span>
                          {(['info', 'alert', 'promo'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setEditingType(type)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                                editingType === type
                                  ? type === 'alert'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : type === 'promo'
                                    ? 'bg-purple-500 text-white shadow-sm'
                                    : 'clay-btn clay-btn-primary shadow-sm'
                                  : 'clay-btn clay-btn-ghost text-slate-500'
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
                            className="clay-btn clay-btn-ghost px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                          >
                            {t('cancelEdit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditTicker(ann.id)}
                            disabled={savingTicker || !editingText.trim()}
                            className="clay-btn clay-btn-primary px-3.5 py-1.5 text-xs uppercase tracking-wider font-black flex items-center gap-1.5 disabled:opacity-50"
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
                    className="clay-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono transition-all group hover:-translate-y-0.5"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`clay-pill px-2 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                          ann.type === 'alert'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                            : ann.type === 'promo'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {ann.type === 'alert' ? t('alertUrgent') : ann.type === 'promo' ? t('specialOffer') : t('infoNotice')}
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 break-words flex-1">{ann.text}</span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 mr-1">
                        {new Date(ann.createdAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {onUpdateAnnouncement && (
                        <button
                          type="button"
                          onClick={() => startEditTicker(ann)}
                          className="clay-btn clay-btn-ghost px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                          title={t('editTicker')}
                        >
                          <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                          <span>{t('editTicker')}</span>
                        </button>
                      )}

                      {onDeleteAnnouncement && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTicker(ann.id, ann.text)}
                          disabled={isDeleting}
                          className="clay-btn clay-btn-ghost text-red-600 dark:text-red-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="clay-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-4">
            <QESFordLogo size="lg" />
            <div className="clay-card-blue px-4 py-2 text-right">
              <span className="text-[10px] font-mono text-blue-800 dark:text-blue-200 font-extrabold uppercase tracking-widest block">TELEFON / WHATSAPP</span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                <Phone className="w-4 h-4 text-blue-600 dark:text-cyan-400" /> 011-3786 6127
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Waktu Operasi */}
            <div className="clay-inset p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-black uppercase tracking-wider text-sm border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <Clock className="w-4 h-4" />
                <span>Waktu Operasi</span>
              </div>
              <div className="space-y-2 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/40">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">ISNIN - JUMAAT</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-300">8.30 PAGI - 5.30 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/40">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">SABTU</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-300">8.30 PAGI - 2.30 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">AHAD & CUTI UMUM</span>
                  <span className="font-extrabold text-red-500 uppercase">TUTUP</span>
                </div>
              </div>
            </div>

            {/* Waktu Rehat & Lokasi */}
            <div className="clay-inset p-4 space-y-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black uppercase tracking-wider text-sm border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <Coffee className="w-4 h-4" />
                <span>Waktu Rehat</span>
              </div>
              <div className="space-y-2 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/40">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">ISNIN - SABTU</span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-300">1.00 TGH HARI - 2.00 PETANG</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">JUMAAT</span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-300">12.30 TGH HARI - 2.30 PETANG</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-[10px] uppercase font-black text-blue-600 dark:text-cyan-400 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> ALAMAT BENGKEL:
                </div>
                <p className="text-slate-800 dark:text-slate-100 text-[11px] leading-snug font-semibold">
                  19, Jalan Impian Putra 1/4, Taman Impian Putra, Bandar Seri Putra, 43000 Kajang, Selangor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Technician Roster */}
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400">
            <Wrench className="w-5 h-5 font-bold" />
            <h3 className="font-mono font-black text-base tracking-wider uppercase text-slate-900 dark:text-white">
              {t('workshopTechniciansRoster')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mechanics.map((m) => (
              <div key={m.id} className="clay-card p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5">
                <img src={m.avatarUrl} alt={m.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-slate-200 dark:bg-slate-800" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{m.name}</h4>
                  <p className="text-[11px] text-blue-600 dark:text-cyan-400 font-mono font-bold">{m.specialty}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {t('activeJobs')} <span className="font-black text-slate-800 dark:text-white">{m.activeJobsCount}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: System Architecture & Optimization Note */}
        <div className="clay-card p-6 space-y-4 font-mono">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Database className="w-5 h-5 font-bold" />
            <h3 className="font-black text-base tracking-wider uppercase text-slate-900 dark:text-white">
              {t('architectureDatabaseOptimization')}
            </h3>
          </div>

          <div className="clay-inset p-4 text-xs space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold mb-1">
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
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60">
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">{t('resetWorkshopQueue')}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('restoresInitialSampleData')}</p>
            </div>
            <button
              onClick={handleReset}
              className="clay-btn clay-btn-ghost text-xs font-bold gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> {t('resetSampleDataBtn')}
            </button>
          </div>

          {resetDoneMsg && (
            <div className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-sm">
              {resetDoneMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
