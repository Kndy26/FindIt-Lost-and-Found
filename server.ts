import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });
import path from 'node:path';
import express from 'express';
import { and, desc, eq, ne, or } from 'drizzle-orm';
import { db, ensureDatabaseReady, scheduleSnapshotSave } from './src/db/index.ts';
import { claims, items, sessions, users } from './src/db/schema.ts';
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './src/db/auth-crypto.ts';
import {
  type AuthRequest,
  SESSION_COOKIE_NAME,
  requireAdmin,
  requireAuth,
  resolveSessionUser,
} from './src/middleware/auth.ts';

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

app.use(express.json({ limit: '6mb' }));
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/src')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});
app.use('/src/assets', express.static(path.resolve(process.cwd(), 'src/assets')));
app.use('/api', async (_req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(503).json({ error: 'Database sedang disiapkan, silakan coba sesaat lagi.' });
  }
});

function setSessionCookie(req: express.Request, res: express.Response, rawToken: string) {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(req: express.Request, res: express.Response) {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
}

// ============================================================================
// AUTHENTICATION ROUTES (100% PostgreSQL)
// ============================================================================

app.get('/api/auth/me', async (req: AuthRequest, res) => {
  try {
    const user = await resolveSessionUser(req);
    return res.json({ user: user || null });
  } catch (error) {
    console.error('Failed to resolve current user:', error);
    return res.status(500).json({ error: 'Gagal memuat sesi pengguna.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await ensureDatabaseReady();
    const { nim, email, fullName, password } = req.body ?? {};

    if (
      typeof nim !== 'string' ||
      typeof email !== 'string' ||
      typeof fullName !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({ error: 'Semua field pendaftaran wajib diisi.' });
    }

    const cleanNim = nim.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (cleanNim.length < 4 || cleanName.length < 2 || !cleanEmail.includes('@') || password.length < 6) {
      return res.status(400).json({
        error: 'Pastikan NIM, email kampus valid, nama lengkap, dan password minimal 6 karakter.',
      });
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, cleanEmail), eq(users.nim, cleanNim)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email atau NIM sudah terdaftar di sistem.' });
    }

    const [created] = await db
      .insert(users)
      .values({
        nim: cleanNim,
        email: cleanEmail,
        fullName: cleanName,
        passwordHash: hashPassword(password),
        role: 'student',
      })
      .returning({
        id: users.id,
        nim: users.nim,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      });

    const rawToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({
      tokenHash: hashSessionToken(rawToken),
      userId: created.id,
      expiresAt,
    });
    scheduleSnapshotSave();

    setSessionCookie(req, res, rawToken);
    return res.status(201).json({
      user: {
        id: created.id,
        nim: created.nim,
        email: created.email,
        fullName: created.fullName,
        role: created.role === 'admin' ? 'admin' : 'student',
      },
      token: rawToken,
    });
  } catch (error) {
    console.error('Register failed:', error);
    return res.status(500).json({ error: 'Pendaftaran akun gagal diproses.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureDatabaseReady();
    const { identifier, password } = req.body ?? {};

    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return res.status(400).json({ error: 'Masukkan Email/NIM dan password Anda.' });
    }

    const cleanId = identifier.trim();
    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.email, cleanId.toLowerCase()), eq(users.nim, cleanId)))
      .limit(1);

    if (!found.length || !verifyPassword(password, found[0].passwordHash)) {
      return res.status(401).json({ error: 'Email/NIM atau password tidak cocok.' });
    }

    const account = found[0];
    const rawToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      tokenHash: hashSessionToken(rawToken),
      userId: account.id,
      expiresAt,
    });
    scheduleSnapshotSave();

    setSessionCookie(req, res, rawToken);
    return res.json({
      user: {
        id: account.id,
        nim: account.nim,
        email: account.email,
        fullName: account.fullName,
        role: account.role === 'admin' ? 'admin' : 'student',
      },
      token: rawToken,
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Gagal melakukan login.' });
  }
});

app.post('/api/auth/logout', async (req: AuthRequest, res) => {
  try {
    const user = await resolveSessionUser(req);
    if (user && req.sessionTokenHash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, req.sessionTokenHash));
      scheduleSnapshotSave();
    }
    clearSessionCookie(req, res);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Logout failed:', error);
    clearSessionCookie(req, res);
    return res.json({ ok: true });
  }
});

// ============================================================================
// PUBLIC CATALOG & STUDENT CRUD ROUTES
// ============================================================================

app.get('/api/items', async (req, res) => {
  try {
    await ensureDatabaseReady();
    const reportType = typeof req.query.type === 'string' ? req.query.type : 'all';
    const includeClaimed = req.query.includeClaimed === 'true';

    const rows = await db
      .select({
        id: items.id,
        reporterId: items.reporterId,
        reporterName: users.fullName,
        reportType: items.reportType,
        title: items.title,
        category: items.category,
        location: items.location,
        eventTime: items.eventTime,
        description: items.description,
        imageUrl: items.imageUrl,
        status: items.status,
        createdAt: items.createdAt,
      })
      .from(items)
      .innerJoin(users, eq(items.reporterId, users.id))
      .where(
        includeClaimed
          ? or(eq(items.status, 'verified'), eq(items.status, 'claimed'))
          : eq(items.status, 'verified')
      )
      .orderBy(desc(items.createdAt));

    const filtered =
      reportType === 'found' || reportType === 'lost'
        ? rows.filter((item) => item.reportType === reportType)
        : rows;

    return res.json({ items: filtered });
  } catch (error) {
    console.error('Failed to list public items:', error);
    return res.status(500).json({ error: 'Gagal memuat katalog barang.' });
  }
});

app.get('/api/items/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const myItems = await db
      .select()
      .from(items)
      .where(eq(items.reporterId, userId))
      .orderBy(desc(items.createdAt));

    const myClaims = await db
      .select({
        id: claims.id,
        itemId: claims.itemId,
        claimantNim: claims.claimantNim,
        secretAnswer: claims.secretAnswer,
        ktmImageUrl: claims.ktmImageUrl,
        contactInfo: claims.contactInfo,
        status: claims.status,
        adminNote: claims.adminNote,
        createdAt: claims.createdAt,
        reviewedAt: claims.reviewedAt,
        itemTitle: items.title,
        itemImageUrl: items.imageUrl,
        itemLocation: items.location,
        itemReportType: items.reportType,
      })
      .from(claims)
      .innerJoin(items, eq(claims.itemId, items.id))
      .where(eq(claims.claimantId, userId))
      .orderBy(desc(claims.createdAt));

    return res.json({ items: myItems, claims: myClaims });
  } catch (error) {
    console.error('Failed to load user reports and claims:', error);
    return res.status(500).json({ error: 'Gagal memuat riwayat laporan Anda.' });
  }
});

app.post('/api/items', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      reportType,
      title,
      category,
      location,
      eventTime,
      description,
      imageUrl,
      secretNote,
    } = req.body ?? {};

    if (
      (reportType !== 'found' && reportType !== 'lost') ||
      typeof title !== 'string' ||
      typeof category !== 'string' ||
      typeof location !== 'string' ||
      typeof eventTime !== 'string' ||
      typeof description !== 'string' ||
      typeof secretNote !== 'string'
    ) {
      return res.status(400).json({ error: 'Lengkapi seluruh detail barang dan ciri rahasia.' });
    }

    if (
      !title.trim() ||
      !location.trim() ||
      !eventTime.trim() ||
      !description.trim() ||
      !secretNote.trim()
    ) {
      return res.status(400).json({ error: 'Field laporan tidak boleh kosong.' });
    }

    const [created] = await db
      .insert(items)
      .values({
        reporterId: req.user!.id,
        reportType,
        title: title.trim(),
        category: category.trim() || 'Lainnya',
        location: location.trim(),
        eventTime: eventTime.trim(),
        description: description.trim(),
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
        secretNote: secretNote.trim(),
        status: 'pending_review',
      })
      .returning();

    scheduleSnapshotSave();
    return res.status(201).json({ item: created });
  } catch (error) {
    console.error('Failed to create item:', error);
    return res.status(500).json({ error: 'Gagal menyimpan laporan barang.' });
  }
});

app.patch('/api/items/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'ID barang tidak valid.' });
    }

    const existing = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Laporan barang tidak ditemukan.' });
    }

    const record = existing[0];
    if (record.reporterId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Anda tidak memiliki izin mengubah laporan ini.' });
    }

    const {
      reportType,
      title,
      category,
      location,
      eventTime,
      description,
      imageUrl,
      secretNote,
    } = req.body ?? {};

    const nextStatus =
      req.user!.role === 'admin' ? record.status : 'pending_review';

    const [updated] = await db
      .update(items)
      .set({
        reportType: reportType === 'found' || reportType === 'lost' ? reportType : record.reportType,
        title: typeof title === 'string' && title.trim() ? title.trim() : record.title,
        category: typeof category === 'string' && category.trim() ? category.trim() : record.category,
        location: typeof location === 'string' && location.trim() ? location.trim() : record.location,
        eventTime: typeof eventTime === 'string' && eventTime.trim() ? eventTime.trim() : record.eventTime,
        description:
          typeof description === 'string' && description.trim() ? description.trim() : record.description,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : record.imageUrl,
        secretNote:
          typeof secretNote === 'string' && secretNote.trim() ? secretNote.trim() : record.secretNote,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    scheduleSnapshotSave();
    return res.json({ item: updated });
  } catch (error) {
    console.error('Failed to update item:', error);
    return res.status(500).json({ error: 'Gagal memperbarui laporan barang.' });
  }
});

app.delete('/api/items/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'ID barang tidak valid.' });
    }

    const existing = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Laporan barang tidak ditemukan.' });
    }

    if (existing[0].reporterId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Anda tidak memiliki izin menghapus laporan ini.' });
    }

    await db.delete(items).where(eq(items.id, itemId));
    scheduleSnapshotSave();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete item:', error);
    return res.status(500).json({ error: 'Gagal menghapus laporan barang.' });
  }
});

// ============================================================================
// OWNERSHIP CLAIMS (Secret Trait + NIM + KTM Proof)
// ============================================================================

app.post('/api/items/:id/claims', requireAuth, async (req: AuthRequest, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'ID barang tidak valid.' });
    }

    const target = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!target.length) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }
    if (target[0].status !== 'verified') {
      return res.status(400).json({ error: 'Barang ini belum terverifikasi atau sudah diklaim.' });
    }

    const { claimantNim, secretAnswer, contactInfo, ktmImageUrl } = req.body ?? {};
    if (
      typeof claimantNim !== 'string' ||
      typeof secretAnswer !== 'string' ||
      typeof contactInfo !== 'string' ||
      !claimantNim.trim() ||
      !secretAnswer.trim() ||
      !contactInfo.trim()
    ) {
      return res.status(400).json({
        error: 'NIM, jawaban ciri rahasia barang, dan kontak wajib diisi.',
      });
    }

    const duplicatePending = await db
      .select({ id: claims.id })
      .from(claims)
      .where(
        and(
          eq(claims.itemId, itemId),
          eq(claims.claimantId, req.user!.id),
          eq(claims.status, 'pending')
        )
      )
      .limit(1);

    if (duplicatePending.length > 0) {
      return res.status(409).json({
        error: 'Anda sudah memiliki pengajuan klaim yang sedang menunggu verifikasi admin untuk barang ini.',
      });
    }

    const [created] = await db
      .insert(claims)
      .values({
        itemId,
        claimantId: req.user!.id,
        claimantNim: claimantNim.trim(),
        secretAnswer: secretAnswer.trim(),
        ktmImageUrl: typeof ktmImageUrl === 'string' ? ktmImageUrl.trim() : '',
        contactInfo: contactInfo.trim(),
        status: 'pending',
      })
      .returning();

    scheduleSnapshotSave();
    return res.status(201).json({ claim: created });
  } catch (error) {
    console.error('Failed to submit claim:', error);
    return res.status(500).json({ error: 'Gagal mengirim pengajuan klaim.' });
  }
});

// ============================================================================
// ADMIN MIDDLEMAN SPLIT-VIEW TRIAGE ROUTES
// ============================================================================

app.get('/api/admin/queue', requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const pendingItems = await db
      .select({
        id: items.id,
        reporterId: items.reporterId,
        reporterName: users.fullName,
        reporterNim: users.nim,
        reporterEmail: users.email,
        reportType: items.reportType,
        title: items.title,
        category: items.category,
        location: items.location,
        eventTime: items.eventTime,
        description: items.description,
        imageUrl: items.imageUrl,
        secretNote: items.secretNote,
        status: items.status,
        adminNote: items.adminNote,
        createdAt: items.createdAt,
      })
      .from(items)
      .innerJoin(users, eq(items.reporterId, users.id))
      .where(eq(items.status, 'pending_review'))
      .orderBy(desc(items.createdAt));

    const pendingClaims = await db
      .select({
        id: claims.id,
        itemId: claims.itemId,
        claimantId: claims.claimantId,
        claimantName: users.fullName,
        claimantEmail: users.email,
        claimantAccountNim: users.nim,
        claimantNim: claims.claimantNim,
        secretAnswer: claims.secretAnswer,
        ktmImageUrl: claims.ktmImageUrl,
        contactInfo: claims.contactInfo,
        status: claims.status,
        adminNote: claims.adminNote,
        createdAt: claims.createdAt,
        itemTitle: items.title,
        itemType: items.reportType,
        itemCategory: items.category,
        itemLocation: items.location,
        itemEventTime: items.eventTime,
        itemDescription: items.description,
        itemImageUrl: items.imageUrl,
        itemSecretNote: items.secretNote,
      })
      .from(claims)
      .innerJoin(items, eq(claims.itemId, items.id))
      .innerJoin(users, eq(claims.claimantId, users.id))
      .where(eq(claims.status, 'pending'))
      .orderBy(desc(claims.createdAt));

    const reviewedItems = await db
      .select({
        id: items.id,
        title: items.title,
        reportType: items.reportType,
        location: items.location,
        status: items.status,
        adminNote: items.adminNote,
        updatedAt: items.updatedAt,
        reporterName: users.fullName,
      })
      .from(items)
      .innerJoin(users, eq(items.reporterId, users.id))
      .where(ne(items.status, 'pending_review'))
      .orderBy(desc(items.updatedAt))
      .limit(20);

    const reviewedClaims = await db
      .select({
        id: claims.id,
        itemTitle: items.title,
        claimantName: users.fullName,
        claimantNim: claims.claimantNim,
        status: claims.status,
        adminNote: claims.adminNote,
        reviewedAt: claims.reviewedAt,
      })
      .from(claims)
      .innerJoin(items, eq(claims.itemId, items.id))
      .innerJoin(users, eq(claims.claimantId, users.id))
      .where(ne(claims.status, 'pending'))
      .orderBy(desc(claims.reviewedAt))
      .limit(20);

    return res.json({
      pendingItems,
      pendingClaims,
      reviewedItems,
      reviewedClaims,
    });
  } catch (error) {
    console.error('Failed to fetch admin queue:', error);
    return res.status(500).json({ error: 'Gagal memuat antrean verifikasi admin.' });
  }
});

app.patch('/api/admin/items/:id/verify', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'ID barang tidak valid.' });
    }

    const { decision, adminNote } = req.body ?? {};
    if (decision !== 'verified' && decision !== 'rejected') {
      return res.status(400).json({ error: 'Keputusan harus verified atau rejected.' });
    }

    const [updated] = await db
      .update(items)
      .set({
        status: decision,
        adminNote: typeof adminNote === 'string' ? adminNote.trim() : '',
        verifiedBy: req.user!.id,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Laporan barang tidak ditemukan.' });
    }

    scheduleSnapshotSave();
    return res.json({ item: updated });
  } catch (error) {
    console.error('Admin verify item failed:', error);
    return res.status(500).json({ error: 'Gagal memverifikasi laporan barang.' });
  }
});

app.patch('/api/admin/claims/:id/verify', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const claimId = Number(req.params.id);
    if (!Number.isInteger(claimId) || claimId <= 0) {
      return res.status(400).json({ error: 'ID klaim tidak valid.' });
    }

    const { decision, adminNote } = req.body ?? {};
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'Keputusan klaim harus approved atau rejected.' });
    }

    const cleanNote = typeof adminNote === 'string' ? adminNote.trim() : '';

    const result = await db.transaction(async (tx) => {
      const [updatedClaim] = await tx
        .update(claims)
        .set({
          status: decision,
          adminNote: cleanNote,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        })
        .where(eq(claims.id, claimId))
        .returning();

      if (!updatedClaim) return null;

      if (decision === 'approved') {
        await tx
          .update(items)
          .set({
            status: 'claimed',
            adminNote: cleanNote || 'Barang telah diserahkan kepada pemilik terverifikasi.',
            updatedAt: new Date(),
          })
          .where(eq(items.id, updatedClaim.itemId));

        await tx
          .update(claims)
          .set({
            status: 'rejected',
            adminNote: 'Barang sudah diserahkan ke pengklaim lain yang terverifikasi.',
            reviewedBy: req.user!.id,
            reviewedAt: new Date(),
          })
          .where(
            and(
              eq(claims.itemId, updatedClaim.itemId),
              ne(claims.id, claimId),
              eq(claims.status, 'pending')
            )
          );
      }

      return updatedClaim;
    });

    if (!result) {
      return res.status(404).json({ error: 'Pengajuan klaim tidak ditemukan.' });
    }

    scheduleSnapshotSave();
    return res.json({ claim: result });
  } catch (error) {
    console.error('Admin verify claim failed:', error);
    return res.status(500).json({ error: 'Gagal memverifikasi pengajuan klaim.' });
  }
});

// ============================================================================
// VITE DEV MIDDLEWARE & PRODUCTION STATIC SERVER
// ============================================================================

export default app;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFind server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
