import { NextResponse } from 'next/server';
import { rpc, errorResponse } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { passwordAllowed } from '@/lib/google';

export async function POST(req) {
  if (!passwordAllowed()) return Response.json({ error: 'Sign in with your Mesa Google account instead.' }, { status: 403 });
  try {
    const { email, password, name } = await req.json();
    const r = await rpc('wr_register', { p_email: email, p_password: password, p_name: name });
    return setSessionCookie(NextResponse.json({ ok: true, name: r.name }), r.token);
  } catch (e) { return errorResponse(e); }
}
