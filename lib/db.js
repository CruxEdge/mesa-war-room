import { cookies } from 'next/headers';

export class DbError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function rpc(fn, args = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new DbError('Database is not configured', 500);
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = (data && data.message) || `Database error (${r.status})`;
    throw new DbError(msg, msg === 'unauthorized' ? 401 : 400);
  }
  return data;
}

export function getToken() {
  return cookies().get('wr_token')?.value || '';
}

export function errorResponse(e) {
  const status = e instanceof DbError ? e.status : 500;
  return Response.json({ error: e.message || 'Something went wrong' }, { status });
}
