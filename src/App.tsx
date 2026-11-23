import { useEffect, useState } from 'react';
import { LogOut, UserCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getCurrentUser, logoutAccount } from './lib/api.ts';
import type { MyItem, User } from './types.ts';
import { AuthModal } from './components/AuthModal.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { ReportFormView } from './components/ReportFormView.tsx';
import { MyReportsView } from './components/MyReportsView.tsx';
import { AdminTriageView } from './components/AdminTriageView.tsx';

type ActiveView = 'catalog' | 'report' | 'my-reports' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('catalog');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MyItem | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutAccount();
      setCurrentUser(null);
      setEditingItem(null);
      if (activeView === 'admin' || activeView === 'my-reports') {
        setActiveView('catalog');
      }
      showToast('Anda telah keluar dari sesi akun.');
    } catch {
      showToast('Gagal keluar dari sesi.', 'error');
    }
  };

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'catalog', label: 'Catalog' },
    { id: 'report', label: 'Report Item' },
    { id: 'my-reports', label: 'My Reports' },
    { id: 'admin', label: 'Admin Triage' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setActiveView('catalog');
            }}
            className="font-display text-lg font-bold tracking-tight text-campus-navy hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue rounded-md px-1"
          >
            CampusFind
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Navigasi Utama">
            {navItems.map((nav) => {
              const isActive = activeView === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    if (nav.id !== 'report') setEditingItem(null);
                    setActiveView(nav.id);
                  }}
                  className={`relative text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue rounded-md px-2 ${
                    isActive
                      ? 'text-campus-blue font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {nav.label}
                  {isActive && (
                    <motion.div
                      layoutId="main-nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-campus-blue rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {authLoading ? (
              <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : currentUser ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue"
                  title="Ganti akun"
                >
                  <UserCircle2 className="w-4 h-4 text-slate-600" />
                  <span className="max-w-[130px] truncate">{currentUser.fullName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  aria-label="Sign Out"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-campus-navy hover:bg-campus-navy-dark rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue focus-visible:ring-offset-2"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* COMPACT MOBILE NAVIGATION */}
        <nav
          className="md:hidden border-t border-slate-200 px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto bg-white"
          aria-label="Navigasi Mobile"
        >
          {navItems.map((nav) => {
            const isActive = activeView === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => {
                  if (nav.id !== 'report') setEditingItem(null);
                  setActiveView(nav.id);
                }}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-blue ${
                  isActive ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 bg-campus-navy rounded-md shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{nav.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'catalog' && (
          <CatalogView
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
            onNavigateReport={() => {
              setEditingItem(null);
              setActiveView('report');
            }}
            onToast={showToast}
          />
        )}

        {activeView === 'report' && (
          <ReportFormView
            currentUser={currentUser}
            editingItem={editingItem}
            onCancelEdit={() => {
              setEditingItem(null);
              setActiveView('my-reports');
            }}
            onRequireAuth={() => setAuthModalOpen(true)}
            onSaved={(msg) => {
              setEditingItem(null);
              setActiveView('my-reports');
              showToast(msg);
            }}
            onToast={showToast}
          />
        )}

        {activeView === 'my-reports' && (
          <MyReportsView
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
            onEditItem={(item) => {
              setEditingItem(item);
              setActiveView('report');
            }}
            onCreateNew={() => {
              setEditingItem(null);
              setActiveView('report');
            }}
            onToast={showToast}
          />
        )}

        {activeView === 'admin' && (
          <AdminTriageView
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
            onToast={showToast}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>CampusFind — Portal Lost &amp; Found Kampus</span>
          <span>Verifikasi Tengah oleh Admin Kemahasiswaan</span>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user, message) => {
          setCurrentUser(user);
          showToast(message);
          if (user.role === 'admin') {
            setActiveView('admin');
          }
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 max-w-sm pointer-events-auto"
          >
            <div
              role="status"
              className={`px-4 py-3 rounded-xl border shadow-lg text-xs font-medium ${
                toast.variant === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-campus-navy border-campus-navy-dark text-white'
              }`}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
