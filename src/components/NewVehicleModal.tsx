import React, { useState, useRef, useEffect } from 'react';
import { VehicleRecord, Mechanic, PriorityLevel } from '../types';
import { SERVICE_CATEGORIES, PRESET_VEHICLE_IMAGES } from '../data/presetData';
import {
  X,
  Car,
  User,
  Phone,
  ShieldAlert,
  Camera,
  Upload,
  FlipHorizontal,
  Trash2,
  Zap,
  ImageIcon,
} from 'lucide-react';
import {
  compressImage,
  handleFileUpload,
  compressImageSource,
  CompressionResult,
} from '../utils/imageCompressor';
import { getDefaultTasksForService } from '../utils/serviceTasks';
import { t } from '../lib/i18n';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<VehicleRecord>) => Promise<void>;
  mechanics: Mechanic[];
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mechanics,
}) => {
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('Proton');
  const [vehicleModel, setVehicleModel] = useState('');
  const [serviceType, setServiceType] = useState(SERVICE_CATEGORIES[0]);
  const [mechanicId, setMechanicId] = useState('');
  const [bayNumber, setBayNumber] = useState('Bay 01');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState('45');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [notes, setNotes] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Stop camera stream when component unmounts or modal closes
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Ensure scroll container starts at the very top
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      stopCamera();
    }
    return () => {
      document.body.style.overflow = '';
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMsg('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMsg('Tidak dapat mengakses kamera peranti. Sila semak kebenaran kamera atau muat naik fail foto.');
      setIsCameraActive(false);
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const takeSnap = async () => {
    if (!videoRef.current) return;
    setIsCompressing(true);
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      try {
        // Compress photo to JPEG format (1200px max, 0.70 quality) for storage optimization
        const compressed = await compressImageSource(rawDataUrl, 1200, 900, 0.70);
        setCapturedPhoto(compressed.dataUrl);
        setCompressionInfo(compressed);
      } catch (err) {
        console.error('Compression failed, using uncompressed fallback:', err);
        setCapturedPhoto(rawDataUrl);
      } finally {
        setIsCompressing(false);
        stopCamera();
      }
    } else {
      setIsCompressing(false);
    }
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        // Compress image using HTML Canvas (max 1200px, 0.7 quality) and upload/process
        const uploadResult = await handleFileUpload(e, 'vehicle_photos', 1200, 0.7);
        if (uploadResult) {
          setCapturedPhoto(uploadResult.downloadURL);
          const originalKB = Math.round(uploadResult.originalSizeMB * 1024);
          const compressedKB = Math.round(uploadResult.compressedSizeMB * 1024);
          setCompressionInfo({
            dataUrl: uploadResult.downloadURL,
            blob: uploadResult.compressedBlob,
            originalSizeKB: originalKB,
            compressedSizeKB: compressedKB,
            savingsPercent: uploadResult.savingsPercent,
            format: 'jpeg',
            width: 1200,
            height: 900,
          });
        }
      } catch (err) {
        console.error('File compression/upload failed, using standard reader:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setCapturedPhoto(result);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim() || !plateNumber.trim()) {
      setErrorMsg(t('ownerNameAndPlateRequired'));
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const photoToUse = capturedPhoto || PRESET_VEHICLE_IMAGES[0].url;
      await onSubmit({
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim() || vehicleMake.trim(),
        serviceType,
        tasks: getDefaultTasksForService(serviceType),
        mechanicId: mechanicId || undefined,
        bayNumber: bayNumber.trim(),
        estimatedDurationMinutes: Number(estimatedDurationMinutes) || 45,
        priority,
        notes: notes.trim(),
        photoUrl: photoToUse,
      });

      // Reset & close
      stopCamera();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan kenderaan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-2 sm:py-6">
        <div className="bg-[#282a2c] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
          {/* Header (Immersive UI Style) */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white font-mono shadow-md">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 sm:w-6 sm:h-6 font-bold" />
              <h3 className="text-sm sm:text-base font-black tracking-wider uppercase">{t('registerNewVehicle')}</h3>
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-all"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-[#e0e0e0] font-sans">
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Grid 1: Owner Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('ownerName')} <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  required
                  placeholder="cth. Ahmad Razak"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#242628] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('phoneNumber')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  placeholder="cth. +60 12-345 6789"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full bg-[#242628] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Grid 2: Vehicle Identifier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('carPlateNumber')} <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="cth. WYY 8829"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-[#242628] border border-cyan-500/50 uppercase font-mono font-black text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('makeBrand')}
              </label>
              <select
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              >
                <option value="Proton">Proton</option>
                <option value="Perodua">Perodua</option>
                <option value="Honda">Honda</option>
                <option value="Toyota">Toyota</option>
                <option value="BMW">BMW</option>
                <option value="Mercedes-Benz">Mercedes-Benz</option>
                <option value="Nissan">Nissan</option>
                <option value="Mazda">Mazda</option>
                <option value="Ford">Ford</option>
                <option value="Lain-lain">Jenama Lain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('modelName')}
              </label>
              <input
                type="text"
                placeholder="cth. X70 Executive"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Service Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('serviceCategory')}
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('priorityLevel')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="normal">{t('normalPriority')}</option>
                <option value="express">{t('expressService')}</option>
                <option value="vip">{t('vipCustomer')}</option>
              </select>
            </div>
          </div>

          {/* Mechanic Assignment & Bay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('assignTechnician')}
              </label>
              <select
                value={mechanicId}
                onChange={(e) => setMechanicId(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">{t('unassignedQueuePool')}</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.activeJobsCount} tugasan aktif)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('assignedBayLift')}
              </label>
              <input
                type="text"
                placeholder="cth. Bay 01"
                value={bayNumber}
                onChange={(e) => setBayNumber(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                {t('estDurationMinutes')}
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                className="w-full bg-[#242628] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Vehicle Photo Selection: PHONE CAMERA ONLY */}
          <div className="font-mono space-y-3 bg-[#212325] p-4 rounded-xl border border-white/10">
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                {t('vehiclePhotoSelection')}
              </span>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {t('livePhoneCameraSupported')}
              </span>
            </label>

            {/* Hidden native camera/file picker input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileCapture}
              className="hidden"
            />

            {/* Camera Action Buttons Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>{t('openPhoneCamera')}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>{t('snapUploadPhoto')}</span>
              </button>
            </div>

            {/* Live Camera Viewfinder Stream */}
            {isCameraActive && (
              <div className="bg-black/90 border-2 border-cyan-500/80 rounded-xl p-3 relative overflow-hidden space-y-3 shadow-2xl animate-fade-in mt-2">
                <div className="flex items-center justify-between text-xs text-cyan-400 font-bold pb-1 border-b border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    {t('liveCameraStream')} ({facingMode === 'environment' ? 'Belakang' : 'Hadapan'})
                  </span>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                    title="Tukar Kamera"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" /> {t('switchCamera')}
                  </button>
                </div>

                <div className="relative rounded-lg overflow-hidden bg-slate-950 flex justify-center items-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-64 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-400/40 pointer-events-none rounded-lg"></div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs font-semibold"
                  >
                    {t('cancelCamera')}
                  </button>
                  <button
                    type="button"
                    onClick={takeSnap}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" /> {t('snapPhotoNow')}
                  </button>
                </div>
              </div>
            )}

            {/* Compression Loader indicator */}
            {isCompressing && (
              <div className="bg-[#15171e] border border-cyan-500/40 rounded-xl p-3 flex items-center gap-3 text-cyan-400 text-xs font-mono animate-pulse">
                <Zap className="w-4 h-4 animate-bounce text-amber-400" />
                <span>{t('compressingPhotoText')}</span>
              </div>
            )}

            {/* Captured Camera Photo Preview Display */}
            {capturedPhoto && !isCameraActive && !isCompressing && (
              <div className="bg-[#15171e] border border-cyan-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mt-2">
                <div className="flex items-center gap-3">
                  <img
                    src={capturedPhoto}
                    alt="Foto kenderaan ditangkap"
                    className="w-16 h-12 object-cover rounded-lg border-2 border-cyan-400 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded uppercase">
                        {t('phonePhotoSelected')}
                      </span>
                      {compressionInfo && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-300" />
                          {compressionInfo.format.toUpperCase()} ({compressionInfo.compressedSizeKB} KB)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/80 font-semibold">
                      {compressionInfo ? (
                        <span className="text-emerald-300">
                          Dijimatkan ~{compressionInfo.savingsPercent}% (Mampatan JPEG Canvas 1200px // Jimat Kos Storan)
                        </span>
                      ) : (
                        t('activePhotoSelected')
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedPhoto(null);
                    setCompressionInfo(null);
                  }}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all text-xs flex items-center justify-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('remove')}
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="font-mono">
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
              {t('initialServiceNotes')}
            </label>
            <textarea
              rows={2}
              placeholder={t('notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 font-mono">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-xl bg-white/10 text-white/70 font-semibold text-xs hover:bg-white/20 transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? t('registering') : t('registerVehicleButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
