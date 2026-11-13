import type { AdminQueueResponse, MyClaim, MyItem, PublicItem, User } from '../types.ts';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data: any = {};
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { error: rawText.slice(0, 300) };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Permintaan gagal (${res.status})`);
  }
  return data as T;
}

export async function getCurrentUser(): Promise<User | null> {
  const data = await apiFetch<{ user: User | null }>('/api/auth/me');
  return data.user;
}

export async function registerAccount(payload: {
  fullName: string;
  nim: string;
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const data = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(data.token);
  return data;
}

export async function loginAccount(payload: {
  identifier: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const data = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(data.token);
  return data;
}

export async function logoutAccount(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  setAuthToken(null);
}

export async function fetchPublicItems(
  type: 'all' | 'found' | 'lost' = 'all',
  includeClaimed = false
): Promise<PublicItem[]> {
  const params = new URLSearchParams({
    type,
    includeClaimed: String(includeClaimed),
  });
  const data = await apiFetch<{ items: PublicItem[] }>(`/api/items?${params.toString()}`);
  return data.items;
}

export async function fetchMyWorkspace(): Promise<{ items: MyItem[]; claims: MyClaim[] }> {
  return apiFetch<{ items: MyItem[]; claims: MyClaim[] }>('/api/items/mine');
}

export async function createItemReport(payload: {
  reportType: 'found' | 'lost';
  title: string;
  category: string;
  location: string;
  eventTime: string;
  description: string;
  imageUrl: string;
  secretNote: string;
}): Promise<MyItem> {
  const data = await apiFetch<{ item: MyItem }>('/api/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function updateItemReport(
  itemId: number,
  payload: {
    reportType: 'found' | 'lost';
    title: string;
    category: string;
    location: string;
    eventTime: string;
    description: string;
    imageUrl: string;
    secretNote: string;
  }
): Promise<MyItem> {
  const data = await apiFetch<{ item: MyItem }>(`/api/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function deleteItemReport(itemId: number): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/items/${itemId}`, { method: 'DELETE' });
}

export async function submitItemClaim(
  itemId: number,
  payload: {
    claimantNim: string;
    secretAnswer: string;
    contactInfo: string;
    ktmImageUrl: string;
  }
): Promise<void> {
  await apiFetch(`/api/items/${itemId}/claims`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminQueue(): Promise<AdminQueueResponse> {
  return apiFetch<AdminQueueResponse>('/api/admin/queue');
}

export async function verifyItemByAdmin(
  itemId: number,
  decision: 'verified' | 'rejected',
  adminNote: string
): Promise<void> {
  await apiFetch(`/api/admin/items/${itemId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, adminNote }),
  });
}

export async function verifyClaimByAdmin(
  claimId: number,
  decision: 'approved' | 'rejected',
  adminNote: string
): Promise<void> {
  await apiFetch(`/api/admin/claims/${claimId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, adminNote }),
  });
}

export function compressImageFile(file: File, maxSize = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat dimuat.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatEventTime(raw: string): string {
  if (!raw) return '-';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}
