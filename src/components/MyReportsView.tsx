import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, RefreshCw } from 'lucide-react';
import { deleteItemReport, fetchMyWorkspace, formatEventTime } from '../lib/api.ts';
import type { ClaimStatus, ItemStatus, MyClaim, MyItem, User } from '../types.ts';
import { ItemThumbnail } from './ItemThumbnail.tsx';

interface MyReportsViewProps {
  currentUser: User | null;
  onRequireAuth: () => void;
  onEditItem: (item: MyItem) => void;
  onCreateNew: () => void;
  onToast: (message: string, variant?: 'success' | 'error') => void;
}

function itemStatusLabel(status: ItemStatus): { text: string; colorClass: string } {
  switch (status) {
    case 'verified':
      return { text: 'Terverifikasi (Publik)', colorClass: 'text-emerald-700' };
    case 'claimed':
      return { text: 'Sudah Diklaim', colorClass: 'text-blue-700' };
    case 'rejected':
      return { text: 'Ditolak Admin', colorClass: 'text-red-700' };
    default:
      return { text: 'Menunggu Verifikasi Admin', colorClass: 'text-amber-700' };
  }
}

function claimStatusLabel(status: ClaimStatus): { text: string; colorClass: string } {
  switch (status) {
    case 'approved':
      return { text: 'Disetujui — Silakan Ambil Barang', colorClass: 'text-emerald-700' };
    case 'rejected':
      return { text: 'Ditolak Admin', colorClass: 'text-red-700' };
    default:
      return { text: 'Menunggu Verifikasi Admin', colorClass: 'text-amber-700' };
  }
}

export function MyReportsView({
  currentUser,
  onRequireAuth,
  onEditItem,
  onCreateNew,
  onToast,
}: MyReportsViewProps) {
  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [myClaims, setMyClaims] = useState<MyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadWorkspace = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyWorkspace();
      setMyItems(data.items);
      setMyClaims(data.claims);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memuat riwayat Anda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto">
        <h1 className="text-lg font-semibold text-slate-900">Login Diperlukan</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Masuk ke akun kampus Anda untuk melihat, mengubah, atau menghapus laporan barang serta memantau status klaim kepemilikan.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Sign In Akun Kampus
        </button>
      </div>
    );
  }

  const handleDelete = async (itemId: number) => {
    setDeletingId(itemId);
    try {
      await deleteItemReport(itemId);
      setMyItems((prev) => prev.filter((item) => item.id !== itemId));
      setConfirmDeleteId(null);
      onToast('Laporan barang berhasil dihapus dari PostgreSQL.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal menghapus laporan.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              My Reports &amp; Claims ({currentUser.fullName})
            </h1>
            <p className="text-sm text-slate-600 font-mono tabular-nums">
              NIM {currentUser.nim} · {currentUser.email}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Laporan</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Laporan Barang Saya ({myItems.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3 animate-pulse">
              <div className="h-14 bg-slate-100 rounded-lg" />
              <div className="h-14 bg-slate-100 rounded-lg" />
            </div>
          ) : myItems.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-900">Belum ada laporan barang yang Anda buat</p>
              <p className="mt-1 text-xs text-slate-500">
                Laporkan barang temuan atau kehilangan untuk membantu mahasiswa lain di kampus.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {myItems.map((item) => {
                const statusInfo = itemStatusLabel(item.status);
                const isConfirming = confirmDeleteId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-20 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <ItemThumbnail
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums">#{item.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-slate-700">
                            {item.reportType === 'found' ? 'Temuan' : 'Kehilangan'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${statusInfo.colorClass}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {item.location} ·{' '}
                          <span className="font-mono tabular-nums">
                            {formatEventTime(item.eventTime)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">Ciri Rahasia:</span>{' '}
                          {item.secretNote}
                        </p>
                        {item.adminNote && (
                          <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 mt-1">
                            <span className="font-semibold">Catatan Admin:</span> {item.adminNote}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isConfirming ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs font-medium text-red-700">Hapus permanen?</span>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => void handleDelete(item.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                          >
                            {deletingId === item.id ? '...' : 'Ya, Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">
            Pengajuan Klaim Kepemilikan Saya ({myClaims.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 animate-pulse">
            <div className="h-14 bg-slate-100 rounded-lg" />
          </div>
        ) : myClaims.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-900">Belum ada pengajuan klaim</p>
            <p className="mt-1 text-xs text-slate-500">
              Jika menemukan barang milik Anda di Catalog, ajukan klaim dengan NIM &amp; ciri khusus barang.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {myClaims.map((claim) => {
              const statusInfo = claimStatusLabel(claim.status);
              return (
                <div key={claim.id} className="p-4 sm:p-5 flex items-start gap-4">
                  <div className="w-16 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <ItemThumbnail
                      src={claim.itemImageUrl}
                      alt={claim.itemTitle}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums">Klaim #{claim.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">NIM {claim.claimantNim}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${statusInfo.colorClass}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{claim.itemTitle}</h3>
                    <p className="text-xs text-slate-600">{claim.itemLocation}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Bukti yang Diajukan:</span>{' '}
                      {claim.secretAnswer}
                    </p>
                    {claim.adminNote && (
                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 mt-1">
                        <span className="font-semibold">Catatan Verifikasi Admin:</span>{' '}
                        {claim.adminNote}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
