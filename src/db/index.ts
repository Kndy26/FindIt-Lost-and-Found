import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from './auth-crypto.ts';
import * as schema from './schema.ts';

declare global {
  var _supabaseClient: postgres.Sql | undefined;
  var _supabaseDrizzle: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var _supabaseInitPromise: Promise<void> | undefined;
}

function getSqlClient(): postgres.Sql {
  if (!global._supabaseClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set in environment variables! Please set it in .env.local or your hosting environment.'
      );
    }
    // prepare: false is required for Supabase transaction pooler (port 6543)
    global._supabaseClient = postgres(connectionString, {
      prepare: false,
      max: process.env.VERCEL ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return global._supabaseClient;
}

function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!global._supabaseDrizzle) {
    const client = getSqlClient();
    global._supabaseDrizzle = drizzle(client, { schema });
  }
  return global._supabaseDrizzle;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const activeDb = getDatabase();
    return (activeDb as any)[prop];
  },
});

export async function ensureDatabaseReady(): Promise<void> {
  if (!global._supabaseInitPromise) {
    global._supabaseInitPromise = seedInitialDataIfEmpty().catch((err) => {
      global._supabaseInitPromise = undefined;
      throw err;
    });
  }
  return global._supabaseInitPromise;
}

export function scheduleSnapshotSave(): void {
  // No-op: Supabase PostgreSQL automatically persists all data in the cloud.
}

async function seedInitialDataIfEmpty(): Promise<void> {
  const activeDb = getDatabase();
  const [{ total }] = await activeDb.select({ total: count() }).from(schema.users);
  if (Number(total) > 0) {
    return;
  }

  console.log('Database empty, seeding default admin, student accounts, and sample items...');

  const [adminUser] = await activeDb
    .insert(schema.users)
    .values({
      nim: 'ADM-001',
      email: 'admin@kampus.ac.id',
      fullName: 'Raka Mahendra (Admin Kemahasiswaan)',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
    })
    .returning();

  const [studentNadia] = await activeDb
    .insert(schema.users)
    .values({
      nim: '2301849201',
      email: 'nadia.putri@kampus.ac.id',
      fullName: 'Nadia Putri Maharani',
      passwordHash: hashPassword('mahasiswa123'),
      role: 'student',
    })
    .returning();

  const [studentBima] = await activeDb
    .insert(schema.users)
    .values({
      nim: '2201753118',
      email: 'bima.pratama@kampus.ac.id',
      fullName: 'Bima Pratama Wijaya',
      passwordHash: hashPassword('mahasiswa123'),
      role: 'student',
    })
    .returning();

  const [chargerItem] = await activeDb
    .insert(schema.items)
    .values([
      {
        reporterId: studentNadia.id,
        reportType: 'found',
        title: 'USB-C Laptop Charger 65W + Kabel Braided',
        category: 'Elektronik',
        location: 'Perpustakaan Pusat Lt. 2 — Meja Baca Timur',
        eventTime: '2026-11-12T15:20',
        description:
          'Ditemukan adaptor charger laptop USB-C warna putih lengkap dengan kabel braided tergulung rapi dengan pengikat velcro di meja baca dekat jendela.',
        imageUrl: '/src/assets/images/item_laptop_charger_1794574812226.jpg',
        secretNote:
          'Ada goresan kecil di sudut kiri bawah adaptor dan inisial huruf "B.P." ditulis tipis dengan spidol permanen dekat port USB-C.',
        status: 'verified',
        adminNote: 'Sudah diverifikasi fisik di loket keamanan Perpustakaan.',
        verifiedBy: adminUser.id,
      },
      {
        reporterId: studentNadia.id,
        reportType: 'found',
        title: 'Tumbler Stainless Matte Navy 500ml',
        category: 'Botol & Pribadi',
        location: 'Taman Plaza Rektorat — Bangku Batu Utara',
        eventTime: '2026-11-12T17:45',
        description:
          'Botol minum stainless warna biru dongker matte dengan tutup ulir silver. Ditemukan tertinggal di bangku taman setelah jam kuliah sore.',
        imageUrl: '/src/assets/images/item_tumbler_bottle_1794574813018.jpg',
        secretNote:
          'Bagian dasar botol terdapat stiker bulat logo himpunan teknik informatika berwarna putih dan sedikit penyok kecil di bibir bawah.',
        status: 'verified',
        adminNote: 'Foto jelas, barang dititipkan di Pos Satpam Gerbang Utama.',
        verifiedBy: adminUser.id,
      },
      {
        reporterId: studentBima.id,
        reportType: 'found',
        title: 'Dompet Cardholder Kulit Coklat + Lanyard Abu',
        category: 'Dompet & Kartu',
        location: 'Gedung Kuliah Bersama (GKB) Ruang 304',
        eventTime: '2026-11-13T09:15',
        description:
          'Ditemukan dompet kartu kulit warna coklat tua beserta tali lanyard abu-abu di baris kursi tengah Ruang 304 seusai kelas pagi.',
        imageUrl: '/src/assets/images/item_cardholder_wallet_1794574813442.jpg',
        secretNote:
          'Di dalam slot belakang terdapat kartu akses lab komputer dan struk parkir tertanggal 11 November, serta 2 lembar uang pecahan Rp20.000.',
        status: 'pending_review',
      },
      {
        reporterId: studentNadia.id,
        reportType: 'found',
        title: 'Wireless Headphones Matte Black + Hard Case',
        category: 'Elektronik',
        location: 'Auditorium Fakultas Teknik — Kursi Baris 4',
        eventTime: '2026-11-13T11:10',
        description:
          'Headphone wireless over-ear warna hitam matte beserta hard case kain abu gelap dan kabel USB pendek di dalam jaring case.',
        imageUrl: '/src/assets/images/item_wireless_headphones_1794574814498.jpg',
        secretNote:
          'Bantalan telinga kanan sedikit terkelupas di bagian dalam dan di dalam kantong jaring ada dongle adapter pesawat 3.5mm warna hitam.',
        status: 'pending_review',
      },
      {
        reporterId: studentBima.id,
        reportType: 'lost',
        title: 'Kalkulator Ilmiah Casio fx-991EX Hitam',
        category: 'Dokumen & Buku',
        location: 'Lab Komputasi Dasar Lt. 1 / Kantin Teknik',
        eventTime: '2026-11-12T13:00',
        description:
          'Kehilangan kalkulator ilmiah hitam dengan tutup geser setelah praktikum siang. Sangat dibutuhkan untuk ujian minggu depan.',
        imageUrl: '',
        secretNote:
          'Bagian belakang casing baterai ditempeli label nama bertuliskan "Bima P - 2201753118" dan tombol SHIFT agak pudar.',
        status: 'verified',
        adminNote: 'Laporan kehilangan tervalidasi.',
        verifiedBy: adminUser.id,
      },
    ])
    .returning();

  await activeDb.insert(schema.claims).values({
    itemId: chargerItem.id,
    claimantId: studentBima.id,
    claimantNim: studentBima.nim,
    secretAnswer:
      'Adaptor punya goresan kecil di sudut kiri bawah dan ada tulisan tipis inisial "B.P." pakai spidol permanen persis di sebelah port USB-C.',
    ktmImageUrl: '',
    contactInfo: 'WA 0812-8834-1920 / bima.pratama@kampus.ac.id',
    status: 'pending',
  });

  console.log('Initial Supabase database seeding complete!');
}
