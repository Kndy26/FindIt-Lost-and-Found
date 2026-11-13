# CampusFind — Campus Lost & Found

Aplikasi web pencatatan dan verifikasi barang hilang & temuan kampus (*Lost & Found*) berbasis **PostgreSQL (Supabase)**, dibangun dengan React 19, Vite, TailwindCSS, Express.js, dan Drizzle ORM.

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- Node.js (v18+)
- Proyek Database Supabase

### Langkah Menjalankan:
1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Pastikan file `.env.local` sudah berisi connection string Supabase Anda:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@[POOLER-HOST]:6543/postgres"
   ```
3. Jalankan server lokal:
   ```bash
   npm run dev
   ```
4. Buka browser di `http://localhost:3000`.

### Akun Demo:
- **Admin**: `admin@kampus.ac.id` / `admin123` (atau NIM: `ADM-001`)
- **Mahasiswa 1**: `nadia.putri@kampus.ac.id` / `mahasiswa123` (NIM: `2301849201`)
- **Mahasiswa 2**: `bima.pratama@kampus.ac.id` / `mahasiswa123` (NIM: `2201753118`)

---

## 🌐 Panduan Hosting ke Vercel

Proyek ini telah dikonfigurasi penuh untuk di-hosting di **Vercel** (`vercel.json` dan `api/index.ts`).

### Langkah Deploy:
1. **Push ke GitHub**:
   Inisialisasi git dan push repository ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: setup CampusFind with Supabase & Vercel"
   git branch -M main
   git remote add origin <URL_REPOSITORY_GITHUB_ANDA>
   git push -u origin main
   ```
2. **Import ke Vercel**:
   - Masuk ke [vercel.com](https://vercel.com) dan klik **Add New** → **Project**.
   - Pilih repository GitHub proyek ini.
   - Di bagian **Environment Variables**, tambahkan:
     - `DATABASE_URL`: Isi dengan connection string Supabase Anda (mode Transaction Pooler port 6543).
     - `GEMINI_API_KEY`: (Opsional) Jika menggunakan fitur AI.
   - Klik **Deploy**.
