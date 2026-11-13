import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  X,
  Upload,
  Plus,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  compressImageFile,
  fetchPublicItems,
  formatEventTime,
  submitItemClaim,
} from '../lib/api.ts';
import type { PublicItem, User } from '../types.ts';
import { ItemThumbnail } from './ItemThumbnail.tsx';

interface CatalogViewProps {
  currentUser: User | null;
  onRequireAuth: () => void;
  onNavigateReport: () => void;
  onToast: (message: string, variant?: 'success' | 'error') => void;
}

const CATEGORIES = [
  'Semua Kategori',
  'Elektronik',
  'Dompet & Kartu',
  'Botol & Pribadi',
  'Kunci & Aksesori',
  'Dokumen & Buku',
  'Lainnya',
];

export function CatalogView({
  currentUser,
  onRequireAuth,
  onNavigateReport,
  onToast,
}: CatalogViewProps) {
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'found' | 'lost'>('all');
  const [categoryFilter, setCategoryFilter] = useState('Semua Kategori');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d' | 'exact'>('all');
  const [exactDate, setExactDate] = useState('');
  const [includeClaimed, setIncludeClaimed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [claimNim, setClaimNim] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [ktmImageUrl, setKtmImageUrl] = useState('');
  const [uploadingKtm, setUploadingKtm] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPublicItems(typeFilter, includeClaimed);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat katalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, [typeFilter, includeClaimed]);

  useEffect(() => {
    if (currentUser) {
      setClaimNim(currentUser.nim);
      setContactInfo(currentUser.email);
    }
  }, [currentUser]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return items.filter((item) => {
      if (categoryFilter !== 'Semua Kategori' && item.category !== categoryFilter) {
        return false;
      }

      if (dateFilter !== 'all') {
        const itemDateStr = item.eventTime.slice(0, 10);
        const itemTimeMs = new Date(item.eventTime).getTime();

        if (dateFilter === 'today') {
          if (itemDateStr !== todayIso) return false;
        } else if (dateFilter === '7d') {
          if (Number.isNaN(itemTimeMs) || now.getTime() - itemTimeMs > 7 * 24 * 60 * 60 * 1000) {
            return false;
          }
        } else if (dateFilter === '30d') {
          if (Number.isNaN(itemTimeMs) || now.getTime() - itemTimeMs > 30 * 24 * 60 * 60 * 1000) {
            return false;
          }
        } else if (dateFilter === 'exact' && exactDate) {
          if (itemDateStr !== exactDate) return false;
        }
      }

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, categoryFilter, dateFilter, exactDate, searchQuery]);

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'Semua Kategori' ||
    dateFilter !== 'all' ||
    includeClaimed ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('Semua Kategori');
    setDateFilter('all');
    setExactDate('');
    setIncludeClaimed(false);
    setSearchQuery('');
  };

  const handleOpenDrawer = (item: PublicItem) => {
    setSelectedItem(item);
    setSecretAnswer('');
    setKtmImageUrl('');
    if (currentUser) {
      setClaimNim(currentUser.nim);
      setContactInfo((prev) => prev || currentUser.email);
    }
  };

  const handleKtmUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKtm(true);
    try {
      const compressed = await compressImageFile(file, 900);
      setKtmImageUrl(compressed);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses foto KTM.', 'error');
    } finally {
      setUploadingKtm(false);
    }
  };

  const handleSubmitClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setSubmittingClaim(true);
    try {
      await submitItemClaim(selectedItem.id, {
        claimantNim: claimNim,
        secretAnswer,
        contactInfo,
        ktmImageUrl,
      });
      onToast('Pengajuan klaim terkirim ke antrean Admin Middleman untuk verifikasi.');
      setSelectedItem(null);
      setSecretAnswer('');
      setKtmImageUrl('');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal mengirim klaim.', 'error');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              Catalog Barang Kampus Terverifikasi
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Setiap laporan diverifikasi oleh Admin Middleman. Ciri rahasia barang disembunyikan dari publik hingga pemilik mengajukan klaim dengan NIM &amp; bukti KTM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                onRequireAuth();
              } else {
                onNavigateReport();
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Laporkan Barang</span>
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang, kategori, atau lokasi..."
                aria-label="Cari barang berdasarkan nama atau kategori"
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus kata pencarian"
                  className="p-1 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['all', 'found', 'lost'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTypeFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      typeFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'all' ? 'Semua' : tab === 'found' ? 'Found' : 'Lost'}
                  </button>
                ))}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter kategori barang"
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-1.5">
                <div className="relative inline-flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      const val = e.target.value as 'all' | 'today' | '7d' | '30d' | 'exact';
                      setDateFilter(val);
                      if (val !== 'exact') setExactDate('');
                    }}
                    aria-label="Filter tanggal temuan atau hilang"
                    className="pl-8 pr-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="all">Semua Tanggal</option>
                    <option value="today">Hari Ini</option>
                    <option value="7d">7 Hari Terakhir</option>
                    <option value="30d">30 Hari Terakhir</option>
                    <option value="exact">Pilih Tanggal</option>
                  </select>
                </div>

                {dateFilter === 'exact' && (
                  <input
                    type="date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    aria-label="Tanggal spesifik"
                    className="px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono tabular-nums">
                Menampilkan {filteredItems.length} dari {items.length} barang
              </span>
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeClaimed}
                  onChange={(e) => setIncludeClaimed(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Tampilkan sudah diklaim</span>
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">Belum ada barang yang cocok</p>
          <p className="mt-1 text-sm text-slate-500">
            Coba ubah filter pencarian atau laporkan barang temuan/hilang baru untuk diverifikasi admin.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!currentUser) onRequireAuth();
              else onNavigateReport();
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Laporan Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
            >
              <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-200">
                <ItemThumbnail src={item.imageUrl} alt={item.title} className="w-full h-full" />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {item.reportType === 'found' ? 'Temuan' : 'Kehilangan'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        item.status === 'claimed' ? 'text-emerald-700 font-medium' : 'text-blue-700 font-medium'
                      }
                    >
                      {item.status === 'claimed' ? 'Sudah Diklaim' : 'Terverifikasi'}
                    </span>
                  </div>

                  <h2 className="text-base font-semibold text-slate-900 leading-snug">
                    {item.title}
                  </h2>

                  <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono tabular-nums">{formatEventTime(item.eventTime)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDrawer(item)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {item.status === 'claimed'
                      ? 'Lihat Detail Barang'
                      : item.reportType === 'found'
                        ? 'Detail & Ajukan Klaim'
                        : 'Detail & Hubungi Pelapor'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-item-title"
        >
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
              <div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  ID #{selectedItem.id} · {selectedItem.reportType === 'found' ? 'FOUND' : 'LOST'}
                </div>
                <h2 id="drawer-item-title" className="text-base font-semibold text-slate-900">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Tutup panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <ItemThumbnail
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{selectedItem.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Pelapor: {selectedItem.reporterName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {formatEventTime(selectedItem.eventTime)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedItem.location}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedItem.description}</p>
              </div>

              {selectedItem.status === 'claimed' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-900">
                    <p className="font-semibold">Barang Sudah Diklaim</p>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Kepemilikan barang ini telah diverifikasi oleh Admin Middleman dan diserahkan ke pemiliknya.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitClaim}
                  className="pt-5 border-t border-slate-200 space-y-4"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {selectedItem.reportType === 'found'
                          ? 'Formulir Klaim Kepemilikan (Verifikasi Admin)'
                          : 'Konfirmasi Penemuan Barang'}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Untuk menjaga kejujuran, masukkan NIM dan ciri khusus barang yang hanya diketahui pemilik asli. Bukti akan diperiksa oleh Admin Middleman.
                      </p>
                    </div>
                  </div>

                  {!currentUser ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-600">
                        Anda harus login akun kampus terlebih dahulu untuk mengajukan klaim.
                      </p>
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sign In Sekarang
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            NIM Pengklaim
                          </label>
                          <input
                            type="text"
                            required
                            value={claimNim}
                            onChange={(e) => setClaimNim(e.target.value)}
                            placeholder="Contoh: 2201753118"
                            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Kontak (WhatsApp / Email)
                          </label>
                          <input
                            type="text"
                            required
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            placeholder="0812xxxx / email@kampus.ac.id"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Sebutkan Ciri Rahasia / Bukti Spesifik Barang
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={secretAnswer}
                          onChange={(e) => setSecretAnswer(e.target.value)}
                          placeholder="Contoh: Ada goresan di sudut kiri, inisial nama di bagian dalam, wallpaper lockscreen, atau isi spesifik dompet..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Foto KTM / Kartu Mahasiswa (Opsional tapi Mempercepat Verifikasi)
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingKtm ? 'Mengompres...' : 'Unggah Foto KTM'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleKtmUpload}
                              className="hidden"
                            />
                          </label>
                          {ktmImageUrl && (
                            <button
                              type="button"
                              onClick={() => setKtmImageUrl('')}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Hapus foto KTM
                            </button>
                          )}
                        </div>
                        {ktmImageUrl && (
                          <div className="mt-2.5 w-48 aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img
                              src={ktmImageUrl}
                              alt="Preview KTM"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingClaim || uploadingKtm}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {submittingClaim ? 'Mengirim Pengajuan...' : 'Kirim Klaim untuk Verifikasi Admin'}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
