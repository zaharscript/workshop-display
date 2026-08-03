import React, { useState, useRef, useEffect } from 'react';
import { VehicleRecord, Mechanic, PriorityLevel } from '../types';
import { SERVICE_CATEGORIES, PRESET_VEHICLE_IMAGES } from '../data/presetData';
import { X, Car, User, Phone, Wrench, Clock, FileText, Image as ImageIcon, ShieldAlert, Check, Camera, Upload, FlipHorizontal, Trash2, Zap } from 'lucide-react';
import { compressImageSource, CompressionResult } from '../utils/imageCompressor';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<VehicleRecord>) => Promise<void>;
  mechanics: Mechanic[];
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({ isOpen, onClose, onSubmit, mechanics }) => {
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
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(PRESET_VEHICLE_IMAGES[0].url);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
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

  // Stop camera when component unmounts or modal closes
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      setErrorMsg('Could not access device camera. Please check camera permissions or use file upload.');
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
        // Compress photo to WebP/JPEG format (800x600 max, 70% quality)
        const compressed = await compressImageSource(rawDataUrl, 800, 600, 0.70);
        setCapturedPhoto(compressed.dataUrl);
        setSelectedPhotoUrl(compressed.dataUrl);
        setCompressionInfo(compressed);
        setCustomPhotoUrl('');
      } catch (err) {
        console.error('Compression failed, using uncompressed fallback:', err);
        setCapturedPhoto(rawDataUrl);
        setSelectedPhotoUrl(rawDataUrl);
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
        // Compress file to WebP/JPEG format (800x600 max, 70% quality)
        const compressed = await compressImageSource(file, 800, 600, 0.70);
        setCapturedPhoto(compressed.dataUrl);
        setSelectedPhotoUrl(compressed.dataUrl);
        setCompressionInfo(compressed);
        setCustomPhotoUrl('');
      } catch (err) {
        console.error('File compression failed, using standard reader:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setCapturedPhoto(result);
          setSelectedPhotoUrl(result);
          setCustomPhotoUrl('');
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
      setErrorMsg('Owner Name and Car Plate Number are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const photoToUse = customPhotoUrl.trim() ? customPhotoUrl.trim() : selectedPhotoUrl;
      await onSubmit({
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim() || vehicleMake.trim(),
        serviceType,
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#15171e] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header (Immersive UI Style) */}
        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 px-6 py-4 flex items-center justify-between text-white font-mono">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 font-bold" />
            <h3 className="text-base font-black tracking-wider uppercase">REGISTER NEW INCOMING VEHICLE</h3>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-[#e0e0e0] font-sans">
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
                Owner Name <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmad Razak"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#161922] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  placeholder="e.g. +60 12-345 6789"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full bg-[#161922] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Grid 2: Vehicle Identifier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                Car Plate Number <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WYY 8829"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-[#161922] border border-cyan-500/50 uppercase font-mono font-black text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                Make / Brand
              </label>
              <select
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
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
                <option value="Other">Other Make</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-white/70 uppercase tracking-wider mb-1">
                Model Name
              </label>
              <input
                type="text"
                placeholder="e.g. X70 Executive"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Service Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                Service Category
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="normal">Normal Priority</option>
                <option value="express">⚡ Express Service</option>
                <option value="vip">⭐ VIP Customer</option>
              </select>
            </div>
          </div>

          {/* Mechanic Assignment & Bay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                Assign Technician
              </label>
              <select
                value={mechanicId}
                onChange={(e) => setMechanicId(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Unassigned (Queue Pool)</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.activeJobsCount} active jobs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                Assigned Bay / Lift
              </label>
              <input
                type="text"
                placeholder="e.g. Bay 01"
                value={bayNumber}
                onChange={(e) => setBayNumber(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                Est. Duration (mins)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Vehicle Photo Selection */}
          <div className="font-mono space-y-3">
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Vehicle Photo Selection
              </span>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Live Phone Camera Supported
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Open Phone Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Snap / Upload Photo</span>
              </button>
            </div>

            {/* Live Camera Viewfinder Modal/Box */}
            {isCameraActive && (
              <div className="bg-black/90 border-2 border-cyan-500/80 rounded-xl p-3 relative overflow-hidden space-y-3 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between text-xs text-cyan-400 font-bold pb-1 border-b border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    LIVE CAMERA STREAM ({facingMode === 'environment' ? 'Rear' : 'Front'})
                  </span>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                    title="Switch Camera"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" /> Switch
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
                    Cancel Camera
                  </button>
                  <button
                    type="button"
                    onClick={takeSnap}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" /> Snap Photo Now
                  </button>
                </div>
              </div>
            )}

            {/* Captured Camera Photo Preview Display */}
            {isCompressing && (
              <div className="bg-[#10141d] border border-cyan-500/40 rounded-xl p-3 flex items-center gap-3 text-cyan-400 text-xs font-mono animate-pulse">
                <Zap className="w-4 h-4 animate-bounce text-amber-400" />
                <span>Compressing photo to WebP/JPEG to save DB bandwidth...</span>
              </div>
            )}

            {capturedPhoto && !isCameraActive && !isCompressing && (
              <div className="bg-[#10141d] border border-cyan-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <img
                    src={capturedPhoto}
                    alt="Captured vehicle snap"
                    className="w-16 h-12 object-cover rounded-lg border-2 border-cyan-400 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded uppercase">
                        📷 Phone Photo Selected
                      </span>
                      {compressionInfo && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-300" />
                          {compressionInfo.format.toUpperCase()} Compressed ({compressionInfo.compressedSizeKB} KB)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/80 font-semibold">
                      {compressionInfo ? (
                        <span className="text-emerald-300">
                          Reduced by ~{compressionInfo.savingsPercent}% (Saved DB Storage & Bandwidth)
                        </span>
                      ) : (
                        'Active Vehicle Photo Selected'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedPhoto(null);
                    setCompressionInfo(null);
                    setSelectedPhotoUrl(PRESET_VEHICLE_IMAGES[0].url);
                  }}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all text-xs flex items-center justify-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}

            {/* Preset Stock Vehicle Images */}
            <div>
              <p className="text-[11px] text-white/50 mb-1.5">Or choose from preset vehicles gallery:</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_VEHICLE_IMAGES.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => {
                      setSelectedPhotoUrl(img.url);
                      setCustomPhotoUrl('');
                      setCapturedPhoto(null);
                      setCompressionInfo(null);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 h-12 transition-all ${
                      selectedPhotoUrl === img.url && !customPhotoUrl && !capturedPhoto
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    {selectedPhotoUrl === img.url && !customPhotoUrl && !capturedPhoto && (
                      <span className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                        <Check className="w-4 h-4 bg-slate-950 rounded-full p-0.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL option */}
            <input
              type="text"
              placeholder="Or paste custom image URL (Optional)"
              value={customPhotoUrl}
              onChange={(e) => {
                setCustomPhotoUrl(e.target.value);
                setCapturedPhoto(null);
                setCompressionInfo(null);
              }}
              className="w-full bg-[#161922] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Notes */}
          <div className="font-mono">
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
              Initial Service Notes / Customer Complaints
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Customer reported noise in front brake assembly."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'REGISTER VEHICLE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
