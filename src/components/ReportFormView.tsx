import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Upload, ShieldAlert, Save, ArrowLeft } from 'lucide-react';
import { compressImageFile, createItemReport, updateItemReport } from '../lib/api.ts';
import type { MyItem, User } from '../types.ts';
import { ItemThumbnail } from './ItemThumbnail.tsx';

interface ReportFormViewProps {
  currentUser: User | null;
  editingItem: MyItem | null;
  onCancelEdit: () => void;
  onRequireAuth: () => void;
  onSaved: (message: string) => void;
  onToast: (message: string, variant?: 'success' | 'error') => void;
}

const CATEGORIES = [
  'Elektronik',
  'Dompet & Kartu',
  'Botol & Pribadi',
  'Kunci & Aksesori',
  'Dokumen & Buku',
  'Lainnya',
];

export function ReportFormView({
  currentUser,
  editingItem,
  onCancelEdit,
  onRequireAuth,
  onSaved,
  onToast,
}: ReportFormViewProps) {
  const [reportType, setReportType] = useState<'found' | 'lost'>('found');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Elektronik');
  const [location, setLocation] = useState('');
  const [eventTime, setEventTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  const [secretNote, setSecretNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setReportType(editingItem.reportType);
      setTitle(editingItem.title);
      setCategory(editingItem.category);
      setLocation(editingItem.location);
      setEventTime(editingItem.eventTime.slice(0, 16));
      setDescription(editingItem.description);
      setSecretNote(editingItem.secretNote);
      setImageUrl(editingItem.imageUrl || '');
    } else {
      setReportType('found');
      setTitle('');
      setCategory('Elektronik');
      setLocation('');
      setEventTime(new Date().toISOString().slice(0, 16));
      setDescription('');
      setSecretNote('');
      setImageUrl('');
    }
  }, [editingItem]);

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto">
        <h1 className="text-lg font-semibold text-slate-900">Login Diperlukan</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Untuk mengunggah laporan barang temuan atau kehilangan di kampus, silakan login menggunakan akun mahasiswa atau staf Anda terlebih dahulu.
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

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageFile(file, 1000);
      setImageUrl(compressed);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses foto.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await updateItemReport(editingItem.id, {
          reportType,
          title,
          category,
          location,
          eventTime,
          description,
          imageUrl,
          secretNote,
        });
        onSaved('Laporan diperbarui dan dikirim ulang untuk verifikasi Admin Middleman.');
      } else {
        await createItemReport({
          reportType,
          title,
          category,
          location,
          eventTime,
          description,
          imageUrl,
          secretNote,
        });
        onSaved('Laporan berhasil dibuat! Menunggu verifikasi Admin Middleman sebelum tampil di katalog.');
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal menyimpan laporan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {editingItem ? `Edit Laporan #${editingItem.id}` : 'Report Item — Unggah Temuan / Kehilangan'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Laporan akan masuk ke antrean Admin Middleman untuk verifikasi cepat sebelum dipublikasikan.
          </p>
        </div>
        {editingItem && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg self-start cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Batal Edit</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Jenis Laporan
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setReportType('found')}
                className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  reportType === 'found'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menemukan Barang (Found)
              </button>
              <button
                type="button"
                onClick={() => setReportType('lost')}
                className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  reportType === 'lost'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kehilangan Barang (Lost)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nama Barang
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Powerbank Anker 10000mAh Hitam"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Lokasi Kampus (Gedung / Lantai / Ruang)
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Gedung Teknik Sipil Lt. 3 Ruang 302"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Waktu Temuan / Perkiraan Hilang
              </label>
              <input
                type="datetime-local"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Deskripsi Publik (Ditampilkan di Catalog)
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kondisi umum barang tanpa membocorkan ciri rahasia yang terlalu spesifik..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ciri Rahasia Barang (Khusus Verifikasi Admin Middleman)</span>
            </div>
            <p className="text-xs text-slate-600">
              Catatan ini <strong>tidak ditampilkan</strong> di katalog publik. Admin menggunakannya untuk mencocokkan pengakuan pemilik asli.
            </p>
            <textarea
              required
              rows={2}
              value={secretNote}
              onChange={(e) => setSecretNote(e.target.value)}
              placeholder="Contoh: Ada stiker kecil di sisi bawah, inisial nama di dalam saku, atau nomor seri/isi khusus..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Foto Barang (Disarankan untuk Verifikasi Cepat)
            </label>
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <ItemThumbnail src={imageUrl} alt="Preview barang" className="w-full h-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Memproses Foto...' : 'Pilih / Ganti Foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                >
                  Hapus Foto
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            {editingItem && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Menyimpan...'
                  : editingItem
                    ? 'Simpan Perubahan'
                    : 'Kirim Laporan ke Admin'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
