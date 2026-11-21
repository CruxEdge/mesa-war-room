import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { googleEnabled, redirectUri } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!googleEnabled()) return NextResponse.redirect(new URL('/login?error=google_off', req.url));
  const state = randomBytes(24).toString('hex');
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    hd: '*',                     // show Workspace accounts; the callback enforces mesaschool.co
    prompt: 'select_account',
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
  res.cookies.set('wr_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
