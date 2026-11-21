import { NextResponse } from 'next/server';
import { rpc, getToken } from '@/lib/db';

export async function POST() {
  try { await rpc('wr_logout', { p_token: getToken() }); } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set('wr_token', '', { path: '/', maxAge: 0 });
  return res;
}
