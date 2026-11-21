import { rpc, getToken, errorResponse } from '@/lib/db';
import { googleExport } from '@/lib/sync';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { slug, title, session, content, url } = await req.json();
    let text = content || '';
    if (text.trim().length < 40 && url) text = (await googleExport(url)) || text;
    const r = await rpc('wr_add_material', {
      p_token: getToken(), p_slug: slug, p_title: title, p_session: session ? Number(session) : null,
      p_content: text, p_url: url || null,
    });
    return Response.json(r);
  } catch (e) { return errorResponse(e); }
}
