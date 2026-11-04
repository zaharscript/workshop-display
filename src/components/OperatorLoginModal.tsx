import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

interface OperatorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OperatorLoginModal: React.FC<OperatorLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Sila masukkan alamat emel operator.');
      return;
    }
    if (!password) {
      setLocalError('Sila masukkan kata laluan.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await login(trimmedEmail, password);
      if (success) {
        setEmail('');
        setPassword('');
        onSuccess?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setLocalError(null);
    clearError();
    onClose();
  };

  const displayedError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md clay-card p-6 border border-[#e5dac7] dark:border-[#2f5547] shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="clay-btn clay-btn-neutral p-1.5 rounded-full absolute right-4 top-4 text-[#8c7e70] hover:text-[#c45c3d]"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-[#c45c3d]/15 text-[#c45c3d] clay-pill">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#1c382f] dark:text-[#f4efe4]">
              Log Masuk Operator
            </h3>
            <p className="text-xs text-[#716152] dark:text-[#a3b8ad] font-sans">
              Konsol Kawalan & Telemetri Bengkel
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {displayedError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span className="font-medium leading-relaxed">{displayedError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-serif font-bold text-[#3d332a] dark:text-[#d3ded8] mb-1.5">
              Alamat Emel Operator
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#8c7e70]" />
              <input
                type="email"
                required
                disabled={submitting}
                placeholder="cth. operator@qesford.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="clay-inset w-full pl-10 pr-3 py-2.5 text-xs text-[#2b3a32] dark:text-[#f2eee4] placeholder:text-[#918376] focus:outline-none focus:ring-1 focus:ring-[#c45c3d] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-serif font-bold text-[#3d332a] dark:text-[#d3ded8] mb-1.5">
              Kata Laluan
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#8c7e70]" />
              <input
                type="password"
                required
                disabled={submitting}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="clay-inset w-full pl-10 pr-3 py-2.5 text-xs text-[#2b3a32] dark:text-[#f2eee4] placeholder:text-[#918376] focus:outline-none focus:ring-1 focus:ring-[#c45c3d] font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-[#8c7e70] dark:text-[#9baea4] italic leading-tight pt-1">
            * Hanya akaun operator berdaftar dengan peranan aktif boleh mengemas kini status kenderaan dan membuat pendaftaran baharu.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e5dac7] dark:border-[#2f5547]">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="clay-btn clay-btn-neutral px-4 py-2 text-xs font-serif font-semibold text-[#5c4f42] dark:text-[#d3ded8]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clay-btn clay-btn-primary px-5 py-2 text-xs font-serif font-bold text-white flex items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengesahkan...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log Masuk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
