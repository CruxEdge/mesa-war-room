import { rpc, getToken, errorResponse } from '@/lib/db';
import { llm, notesBlock } from '@/lib/llm';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const token = getToken();
    const { slug, question, history = [] } = await req.json();
    if (!question || question.trim().length < 3) return Response.json({ error: 'Type a question first' }, { status: 400 });
    const { subject } = await rpc('wr_subject', { p_token: token, p_slug: slug });
    const mats = await rpc('wr_search', { p_token: token, p_slug: slug, p_q: question, p_limit: 6 });
    const sys = `You are an exam-prep tutor for Mesa School of Business students preparing for the ${subject.name} mid-term.
Exam format: ${subject.format} Portions: ${subject.portions}.
Answer from the course notes below. Cite notes inline as [1], [2] after each claim they support. If the notes do not cover something, say so plainly and then give your best general answer, clearly labelled as not from the course notes. Be concise and exam-focused: definitions, frameworks, worked examples, common traps.

COURSE NOTES:
${mats.length ? notesBlock(mats) : '(No text notes are available for this subject yet.)'}`;
    const msgs = [{ role: 'system', content: sys }, ...history.slice(-6), { role: 'user', content: question }];
    const answer = await llm(msgs, { max: 1400 });
    await rpc('wr_log_event', { p_token: token, p_slug: slug, p_type: 'asked the notes' }).catch(() => {});
    return Response.json({ answer, sources: mats.map((m, i) => ({ n: i + 1, id: m.id, title: m.title })) });
  } catch (e) { return errorResponse(e); }
}
