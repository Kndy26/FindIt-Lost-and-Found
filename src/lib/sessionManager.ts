/**
 * Session Manager untuk mengelola batas waktu sesi.
 * - Akun Mahasiswa / Pengguna Umum: Timeout 15 menit
 * - Akun Admin Middleman: Timeout 30 menit
 * - Peringatan interaktif muncul 2 menit (120 detik) sebelum sesi berakhir.
 */

export const STUDENT_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit
export const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000;   // 30 menit khusus admin
export const SESSION_TIMEOUT_MS = STUDENT_SESSION_TIMEOUT_MS; // default
export const SESSION_WARNING_MS = 2 * 60 * 1000;          // 2 menit peringatan sebelum kedaluwarsa (120 detik)
export const LAST_ACTIVE_KEY = 'campusfind_last_active';

export function getSessionTimeoutMs(role?: 'student' | 'admin' | null): number {
  return role === 'admin' ? ADMIN_SESSION_TIMEOUT_MS : STUDENT_SESSION_TIMEOUT_MS;
}

export function recordActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {
    // fallback jika browser menonaktifkan localStorage
  }
}

export function getLastActiveTime(): number | null {
  try {
    const val = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!val) return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

export function clearSessionActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {}
}

export function isSessionExpired(timeoutMs: number = SESSION_TIMEOUT_MS): boolean {
  const last = getLastActiveTime();
  if (last === null) return false;
  return Date.now() - last >= timeoutMs;
}

export function getIdleDurationMs(): number {
  const last = getLastActiveTime();
  if (last === null) return 0;
  return Math.max(0, Date.now() - last);
}

export function getRemainingSessionSeconds(timeoutMs: number = SESSION_TIMEOUT_MS): number {
  const idle = getIdleDurationMs();
  const remainingMs = Math.max(0, timeoutMs - idle);
  return Math.ceil(remainingMs / 1000);
}
