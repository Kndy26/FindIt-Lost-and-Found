import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { db, ensureDatabaseReady } from '../db/index.ts';
import { sessions, users } from '../db/schema.ts';
import { hashSessionToken, parseCookies } from '../db/auth-crypto.ts';

export const SESSION_COOKIE_NAME = 'campusfind_session';

export interface AuthUser {
  id: number;
  nim: string;
  email: string;
  fullName: string;
  role: 'student' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  sessionTokenHash?: string;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export async function resolveSessionUser(req: AuthRequest): Promise<AuthUser | null> {
  await ensureDatabaseReady();
  const rawToken = extractSessionToken(req);
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  const rows = await db
    .select({
      userId: users.id,
      nim: users.nim,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!rows.length) return null;

  const row = rows[0];
  req.sessionTokenHash = tokenHash;
  req.user = {
    id: row.userId,
    nim: row.nim,
    email: row.email,
    fullName: row.fullName,
    role: row.role === 'admin' ? 'admin' : 'student',
  };
  return req.user;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    }
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Gagal memverifikasi sesi pengguna.' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Silakan login sebagai Admin terlebih dahulu.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak: Khusus Admin Middleman.' });
    }
    return next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Gagal memverifikasi hak akses admin.' });
  }
}
