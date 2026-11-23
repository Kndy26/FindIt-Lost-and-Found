import { useEffect, useState, type FormEvent } from 'react';
import { X, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { loginAccount, registerAccount } from '../lib/api.ts';
import type { User } from '../types.ts';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User, message: string) => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await loginAccount({ identifier, password });
        onSuccess(res.user, `Selamat datang kembali, ${res.user.fullName}.`);
      } else {
        const res = await registerAccount({ fullName, nim, email, password });
        onSuccess(res.user, `Akun berhasil didaftarkan untuk NIM ${res.user.nim}.`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentikasi gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoIdentifier: string, demoPassword: string) => {
    setMode('login');
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-campus-navy" />
            <h2 id="auth-modal-title" className="text-base font-semibold text-campus-navy">
              {mode === 'login' ? 'Sign In Akun Kampus' : 'Registrasi Akun Baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-campus-blue cursor-pointer"
            aria-label="Tutup dialog autentikasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Pilihan Autentikasi">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              id="tab-login"
              aria-controls="auth-form-panel"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-campus-blue ${
                mode === 'login'
                  ? 'bg-white text-campus-navy shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              id="tab-register"
              aria-controls="auth-form-panel"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-campus-blue ${
                mode === 'register'
                  ? 'bg-white text-campus-navy shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Akun
            </button>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2"
            >
              <span>{error}</span>
            </div>
          )}

          <form
            id="auth-form-panel"
            role="tabpanel"
            aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'login' ? (
              <>
                <div>
                  <label htmlFor="login-identifier" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email Kampus atau NIM <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="contoh: 2301849201 atau nadia.putri@kampus.ac.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="reg-fullname" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nama Lengkap <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-fullname"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama sesuai KTM"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-nim" className="block text-xs font-medium text-slate-700 mb-1.5">
                      NIM (Nomor Induk) <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="reg-nim"
                      name="nim"
                      type="text"
                      inputMode="numeric"
                      required
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      placeholder="2301849201"
                      className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Email Kampus <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@kampus.ac.id"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password (min. 6 karakter) <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Buat password akun"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-campus-navy hover:bg-campus-navy-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-campus-blue focus:ring-offset-2"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{submitting ? 'Memproses...' : 'Masuk ke CampusFind'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Mendaftarkan...' : 'Daftar & Masuk'}</span>
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <p className="text-xs font-medium text-slate-600">
                Isi cepat akun uji coba untuk simulasi peran:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@kampus.ac.id', 'admin123')}
                  className="px-2.5 py-2 text-left border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">Admin Middleman</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">admin@kampus.ac.id</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('nadia.putri@kampus.ac.id', 'mahasiswa123')}
                  className="px-2.5 py-2 text-left border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">Nadia (Finder)</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">NIM 2301849201</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('bima.pratama@kampus.ac.id', 'mahasiswa123')}
                  className="px-2.5 py-2 text-left border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">Bima (Claimant)</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">NIM 2201753118</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
