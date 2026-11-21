import { NextResponse } from 'next/server';
import { rpc } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { googleEnabled, redirectUri, decodeJwtPayload, MESA_DOMAIN, MESA_HD } from '@/lib/google';

export const dynamic = 'force-dynamic';

function fail(req, code) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  res.cookies.set('wr_oauth_state', '', { path: '/', maxAge: 0 });
  return res;
}

export async function GET(req) {
  if (!googleEnabled()) return fail(req, 'google_off');
  const url = new URL(req.url);
  if (url.searchParams.get('error')) return fail(req, 'cancelled');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = req.cookies.get('wr_oauth_state')?.value;
  if (!code || !state || !saved || state !== saved) return fail(req, 'expired');

  try {
    // Exchange the code directly with Google over TLS; the id_token comes straight from Google.
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(req), grant_type: 'authorization_code',
      }),
    });
    const tok = await r.json();
    if (!r.ok || !tok.id_token) return fail(req, 'google_error');
    const c = decodeJwtPayload(tok.id_token);
    const now = Math.floor(Date.now() / 1000);
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(c.iss)) return fail(req, 'google_error');
    if (c.aud !== process.env.GOOGLE_CLIENT_ID || !(c.exp > now)) return fail(req, 'google_error');
    if (c.email_verified !== true && c.email_verified !== 'true') return fail(req, 'unverified');
    // Both checks: the account belongs to a mesaschool.co Google Workspace, and the address is a Mesa address.
    if (!c.hd || !MESA_HD.test(c.hd) || !MESA_DOMAIN.test(c.email || '')) return fail(req, 'not_mesa');

    const s = await rpc('wr_google_login', { p_secret: process.env.SYNC_SECRET, p_email: c.email, p_name: c.name || '', p_sub: c.sub });
    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.set('wr_oauth_state', '', { path: '/', maxAge: 0 });
    return setSessionCookie(res, s.token);
  } catch (e) {
    return fail(req, e.message === 'not_mesa' ? 'not_mesa' : 'google_error');
  }
}
