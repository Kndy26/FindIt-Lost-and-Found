import { useEffect, useState } from 'react';
import {
  Check,
  X,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Clock,
  UserCheck,
  FileCheck2,
} from 'lucide-react';
import {
  fetchAdminQueue,
  formatEventTime,
  verifyClaimByAdmin,
  verifyItemByAdmin,
} from '../lib/api.ts';
import type {
  AdminPendingClaim,
  AdminPendingItem,
  AdminQueueResponse,
  User,
} from '../types.ts';
import { ItemThumbnail } from './ItemThumbnail.tsx';

interface AdminTriageViewProps {
  currentUser: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, variant?: 'success' | 'error') => void;
}

type QueueTab = 'items' | 'claims' | 'history';

export function AdminTriageView({
  currentUser,
  onRequireAuth,
  onToast,
}: AdminTriageViewProps) {
  const [queue, setQueue] = useState<AdminQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QueueTab>('items');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadQueue = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAdminQueue();
      setQueue(data);

      if (data.pendingItems.length > 0) {
        setSelectedItemId((prev) =>
          prev && data.pendingItems.some((i) => i.id === prev) ? prev : data.pendingItems[0].id
        );
      } else {
        setSelectedItemId(null);
      }

      if (data.pendingClaims.length > 0) {
        setSelectedClaimId((prev) =>
          prev && data.pendingClaims.some((c) => c.id === prev) ? prev : data.pendingClaims[0].id
        );
      } else {
        setSelectedClaimId(null);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memuat antrean admin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [currentUser?.id, currentUser?.role]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto">
        <ShieldCheck className="w-8 h-8 text-slate-700 mx-auto" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">
          Panel Admin Middleman
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Halaman triage verifikasi hanya dapat diakses oleh akun dengan peran{' '}
          <span className="font-mono text-slate-800">admin</span> di PostgreSQL. Gunakan akun demo{' '}
          <span className="font-mono text-slate-800">admin@kampus.ac.id</span> pada form Sign In untuk mencoba alur verifikasi cepat.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          {currentUser ? 'Ganti ke Akun Admin' : 'Sign In Admin Middleman'}
        </button>
      </div>
    );
  }

  const pendingItems = queue?.pendingItems ?? [];
  const pendingClaims = queue?.pendingClaims ?? [];
  const selectedItem: AdminPendingItem | null =
    pendingItems.find((i) => i.id === selectedItemId) ?? pendingItems[0] ?? null;
  const selectedClaim: AdminPendingClaim | null =
    pendingClaims.find((c) => c.id === selectedClaimId) ?? pendingClaims[0] ?? null;

  const handleVerifyItem = async (itemId: number, decision: 'verified' | 'rejected') => {
    setProcessing(true);
    try {
      await verifyItemByAdmin(itemId, decision, adminNote);
      onToast(
        decision === 'verified'
          ? `Laporan #${itemId} disetujui dan dipublikasikan ke Catalog.`
          : `Laporan #${itemId} ditolak.`
      );
      setAdminNote('');
      setShowMobileDetail(false);
      await loadQueue();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses verifikasi.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyClaim = async (claimId: number, decision: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      await verifyClaimByAdmin(claimId, decision, adminNote);
      onToast(
        decision === 'approved'
          ? `Klaim #${claimId} disetujui! Status barang berubah menjadi Sudah Diklaim.`
          : `Klaim #${claimId} ditolak.`
      );
      setAdminNote('');
      setShowMobileDetail(false);
      await loadQueue();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses verifikasi klaim.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
            Admin Triage — Split-View Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Periksa laporan masuk dan cocokkan ciri rahasia + NIM/KTM pengklaim sebelum menyetujui publikasi atau serah terima.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="text-xs font-mono tabular-nums text-slate-600">
            {pendingItems.length} Laporan · {pendingClaims.length} Klaim
          </div>
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[600px]">
        {/* LEFT PANE: MASTER TRIAGE QUEUE */}
        <aside
          className={`border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col ${
            showMobileDetail ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-2.5 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('items');
                  setAdminNote('');
                }}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'items'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laporan ({pendingItems.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('claims');
                  setAdminNote('');
                }}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'claims'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Klaim ({pendingClaims.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Riwayat
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-16 bg-slate-100 rounded-lg" />
                <div className="h-16 bg-slate-100 rounded-lg" />
              </div>
            ) : activeTab === 'items' ? (
              pendingItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Semua laporan masuk sudah diverifikasi.
                </div>
              ) : (
                pendingItems.map((item) => {
                  const isActive = selectedItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setAdminNote('');
                        setShowMobileDetail(true);
                      }}
                      className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <ItemThumbnail
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
                          <span>
                            #{item.id} · {item.reportType === 'found' ? 'FOUND' : 'LOST'}
                          </span>
                          <span>{item.reporterNim}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{item.location}</div>
                      </div>
                    </button>
                  );
                })
              )
            ) : activeTab === 'claims' ? (
              pendingClaims.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada pengajuan klaim yang menunggu verifikasi.
                </div>
              ) : (
                pendingClaims.map((claim) => {
                  const isActive = selectedClaim?.id === claim.id;
                  return (
                    <button
                      key={claim.id}
                      type="button"
                      onClick={() => {
                        setSelectedClaimId(claim.id);
                        setAdminNote('');
                        setShowMobileDetail(true);
                      }}
                      className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <ItemThumbnail
                          src={claim.itemImageUrl}
                          alt={claim.itemTitle}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
                          <span>KLAIM #{claim.id}</span>
                          <span>NIM {claim.claimantNim}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {claim.itemTitle}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          Pengklaim: {claim.claimantName}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              <div className="p-4 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Laporan Terakhir Diproses
                  </h3>
                  <div className="space-y-2">
                    {(queue?.reviewedItems ?? []).slice(0, 8).map((ri) => (
                      <div
                        key={ri.id}
                        className="p-2.5 border border-slate-200 rounded-lg text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 truncate">{ri.title}</span>
                          <span
                            className={`font-medium shrink-0 ${
                              ri.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {ri.status === 'verified'
                              ? 'Verified'
                              : ri.status === 'claimed'
                                ? 'Claimed'
                                : 'Rejected'}
                          </span>
                        </div>
                        <div className="text-slate-500 truncate">
                          {ri.reporterName} · {ri.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Klaim Terakhir Diproses
                  </h3>
                  <div className="space-y-2">
                    {(queue?.reviewedClaims ?? []).slice(0, 8).map((rc) => (
                      <div
                        key={rc.id}
                        className="p-2.5 border border-slate-200 rounded-lg text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {rc.itemTitle}
                          </span>
                          <span
                            className={`font-medium shrink-0 ${
                              rc.status === 'approved' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {rc.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          {rc.claimantName} · NIM {rc.claimantNim}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANE: FAST VERIFICATION INSPECTION WORKSPACE */}
        <section
          className={`flex flex-col bg-slate-50/40 ${
            showMobileDetail ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {showMobileDetail && (
            <div className="lg:hidden px-4 py-3 bg-white border-b border-slate-200">
              <button
                type="button"
                onClick={() => setShowMobileDetail(false)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Antrean</span>
              </button>
            </div>
          )}

          {activeTab === 'items' && selectedItem ? (
            <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 gap-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                      <span>LAPORAN #{selectedItem.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700">Menunggu Verifikasi</span>
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedItem.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Pelapor: <span className="font-medium text-slate-800">{selectedItem.reporterName}</span> · NIM{' '}
                      <span className="font-mono tabular-nums">{selectedItem.reporterNim}</span> ·{' '}
                      {selectedItem.reporterEmail}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-5">
                    <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <ItemThumbnail
                        src={selectedItem.imageUrl}
                        alt={selectedItem.title}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="xl:col-span-7 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">
                          {selectedItem.reportType === 'found' ? 'Barang Temuan' : 'Barang Hilang'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{selectedItem.category}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedItem.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono tabular-nums">
                          {formatEventTime(selectedItem.eventTime)}
                        </span>
                      </div>
                      <p className="pt-2 border-t border-slate-100 text-sm text-slate-700">
                        {selectedItem.description}
                      </p>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1">
                      <div className="text-xs font-semibold text-amber-900">
                        Ciri Rahasia Penemu (Rahasia dari Katalog Publik)
                      </div>
                      <p className="text-sm text-amber-950">{selectedItem.secretNote}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 bg-white -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Catatan Admin Middleman (Opsional)
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Contoh: Barang sudah diamankan di Pos Keamanan Gedung Utama / Alasan penolakan..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleVerifyItem(selectedItem.id, 'rejected')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Tolak Laporan</span>
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleVerifyItem(selectedItem.id, 'verified')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui &amp; Publikasikan</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'claims' && selectedClaim ? (
            <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 gap-6">
              <div className="space-y-5">
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                    <span>VERIFIKASI KLAIM #{selectedClaim.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-700">Cocokkan Bukti Kepemilikan</span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedClaim.itemTitle}
                  </h2>
                </div>

                {/* SIDE-BY-SIDE EVIDENCE COMPARISON */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <span>Data Barang &amp; Ciri Rahasia Penemu</span>
                    </div>
                    <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <ItemThumbnail
                        src={selectedClaim.itemImageUrl}
                        alt={selectedClaim.itemTitle}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        <span className="font-medium text-slate-800">Lokasi:</span>{' '}
                        {selectedClaim.itemLocation}
                      </div>
                      <div className="font-mono tabular-nums">
                        <span className="font-sans font-medium text-slate-800">Waktu:</span>{' '}
                        {formatEventTime(selectedClaim.itemEventTime)}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                      <div className="text-[11px] font-semibold text-amber-900">
                        Ciri Rahasia Tercatat (Patokan Verifikasi)
                      </div>
                      <p className="text-sm text-amber-950">{selectedClaim.itemSecretNote}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Bukti Pengklaim (Akuntabilitas NIM &amp; KTM)</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div>
                        <span className="font-medium text-slate-700">Nama Akun:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {selectedClaim.claimantName}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums">
                        <span className="font-sans font-medium text-slate-700">NIM Klaim:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {selectedClaim.claimantNim}
                        </span>{' '}
                        (Akun: {selectedClaim.claimantAccountNim})
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Kontak:</span>{' '}
                        {selectedClaim.contactInfo}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                      <div className="text-[11px] font-semibold text-blue-900">
                        Jawaban Ciri Rahasia dari Pengklaim
                      </div>
                      <p className="text-sm text-slate-900">{selectedClaim.secretAnswer}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-700">
                        Lampiran Foto KTM / Kartu Mahasiswa
                      </div>
                      {selectedClaim.ktmImageUrl ? (
                        <div className="aspect-[16/10] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          <img
                            src={selectedClaim.ktmImageUrl}
                            alt="Foto KTM Pengklaim"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="p-4 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 text-center">
                          Pengklaim tidak melampirkan foto KTM (verifikasi mengandalkan NIM akun &amp; kecocokan ciri rahasia).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 bg-white -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Catatan Verifikasi / Lokasi Pengambilan Barang (Opsional)
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Contoh: Ciri cocok 100%, silakan ambil di Loket Kemahasiswaan dengan membawa KTM fisik..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleVerifyClaim(selectedClaim.id, 'rejected')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Tolak Klaim</span>
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => void handleVerifyClaim(selectedClaim.id, 'approved')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui Klaim &amp; Serahkan</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Antrean {activeTab === 'claims' ? 'Klaim' : 'Laporan'} Kosong
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Pilih tab lain di panel kiri atau tunggu mahasiswa mengunggah laporan temuan maupun klaim kepemilikan baru.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
