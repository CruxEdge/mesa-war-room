import { rpc, getToken, errorResponse } from '@/lib/db';
import { llm, parseJSON } from '@/lib/llm';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const token = getToken();
    const { slug, drill, answers } = await req.json();
    const { subject } = await rpc('wr_subject', { p_token: token, p_slug: slug });
    let prompt, mode;
    if (subject.drill_type === 'sql') {
      mode = 'SQL test';
      const qa = drill.questions.map((q, i) => `Q${i + 1} (${q.marks} marks): ${q.q}\nModel answer: ${q.model_answer}\nStudent answer:\n${answers[i] || '(blank)'}`).join('\n\n');
      prompt = `You are a strict but fair SQL examiner. Schema:\n${drill.schema}\n\n${qa}\n\nRubric per question: ${subject.rubric}
Accept any correct alternative approach, not only the model answer. Return ONLY JSON: {"items":[{"score":n,"max":10,"feedback":"what was right, what was wrong, the fix"}],"summary":"two lines on what to revise"}`;
    } else {
      mode = slug === 'ai' ? 'Component Map' : slug === 'communication' ? 'TMAY' : 'case';
      prompt = `Grade this exam answer.\nQUESTION:\n${drill.prompt}\n\nSTUDENT ANSWER:\n${answers[0] || '(blank)'}\n\nRUBRIC (total ${subject.marks}): ${subject.rubric}
Score each rubric criterion, be specific and quote the student's own words when pointing out gaps. Return ONLY JSON: {"items":[{"criterion":"...","score":n,"max":n,"feedback":"..."}],"summary":"the 2-3 changes that would add the most marks"}`;
    }
    const result = parseJSON(await llm([{ role: 'user', content: prompt }], { max: 2500, temperature: 0.2 }));
    const score = result.items.reduce((a, b) => a + Number(b.score || 0), 0);
    const max = result.items.reduce((a, b) => a + Number(b.max || 0), 0);
    await rpc('wr_record_attempt', { p_token: token, p_slug: slug, p_mode: mode, p_score: score, p_max: max, p_detail: { drill, answers, result } });
    return Response.json({ score, max, ...result });
  } catch (e) { return errorResponse(e); }
}
