import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
  open: boolean;
  remainingSeconds: number;
  role?: 'student' | 'admin';
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export function SessionTimeoutModal({
  open,
  remainingSeconds,
  role,
  onStayLoggedIn,
  onLogoutNow,
}: SessionTimeoutModalProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalMinutes = role === 'admin' ? 30 : 15;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-timeout-title"
            aria-describedby="session-timeout-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 z-10 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/80 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 id="session-timeout-title" className="text-base font-semibold text-slate-900">
                  Sesi {role === 'admin' ? 'Admin ' : ''}Anda Akan Berakhir
                </h2>
                <p id="session-timeout-desc" className="text-xs text-slate-600 leading-relaxed">
                  Tidak ada aktivitas terdeteksi selama hampir {totalMinutes} menit. Untuk melindungi keamanan akun {role === 'admin' ? 'admin kemahasiswaan' : 'kampus'} Anda, sesi akan ditutup otomatis.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Sisa waktu aktif:</span>
              </div>
              <span className="font-mono text-base font-bold tabular-nums text-campus-navy bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs">
                {formattedTime}
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onLogoutNow}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Keluar Sekarang</span>
              </button>
              <button
                type="button"
                onClick={onStayLoggedIn}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-white bg-campus-navy hover:bg-campus-navy-dark rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue focus-visible:ring-offset-2"
                autoFocus
              >
                <RefreshCw className="w-4 h-4" />
                <span>Lanjutkan Sesi</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
