import { rpc, getToken, errorResponse } from '@/lib/db';

export async function POST(req) {
  try {
    const { slug, mode, score, max, detail } = await req.json();
    await rpc('wr_record_attempt', { p_token: getToken(), p_slug: slug, p_mode: mode, p_score: score, p_max: max, p_detail: detail || {} });
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
