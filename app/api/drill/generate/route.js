import { rpc, getToken, errorResponse } from '@/lib/db';
import { llm, parseJSON, notesBlock } from '@/lib/llm';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const token = getToken();
    const { slug, count = 10, focus = '' } = await req.json();
    const { subject } = await rpc('wr_subject', { p_token: token, p_slug: slug });
    const mats = await rpc('wr_search', { p_token: token, p_slug: slug, p_q: focus || subject.portions || subject.name, p_limit: 8 });
    const notes = mats.length ? notesBlock(mats) : '';
    const thin = notes.length < 2500;
    const base = `Subject: ${subject.name}. Exam format: ${subject.format} Portions: ${subject.portions}. ${subject.rubric || ''}
${focus ? `Focus the practice on: ${focus}.` : ''}
COURSE NOTES:
${notes || '(none available yet)'}
${thin ? 'The notes are thin, so also draw on standard knowledge of this topic as taught in a business-school course, staying close to the portions.' : 'Stay within what the notes teach.'}`;

    let prompt;
    if (subject.drill_type === 'mcq') {
      const n = Math.max(5, Math.min(25, Number(count) || 10));
      const extra = slug === 'data-102'
        ? 'Make about 40% of questions quick mental-maths items (percent change, CAC, ROAS, CTR, conversion, ratios with Indian number formats like 1,00,000) solvable in 20 seconds; the rest on dashboarding, acquisition metrics and which job role owns which metric.'
        : 'Mix definitions, framework application and short buyer/seller scenarios.';
      prompt = `${base}

Write ${n} exam-style multiple-choice questions. ${extra}
Each question has exactly 4 options and exactly one correct answer. Distractors must be plausible. Keep questions short enough to read in a few seconds.
Return ONLY JSON: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"why":"one-line explanation","src":1}]} where answer is the 0-based index and src is the number of the course note [n] the question is based on (null if from general knowledge).`;
    } else if (subject.drill_type === 'sql') {
      prompt = `${base}

Write a 3-question pen-and-paper SQL test like the real mid-term (30 minutes, 10 marks each). Invent one realistic Indian business table (or reuse the Airbnb users/properties/bookings tables) and list its columns with short descriptions. Questions should rise in difficulty: (1) filter + aggregate, (2) GROUP BY with CASE or HAVING or a JOIN, (3) a CTE or window function (LAG, RANK, ROW_NUMBER) problem such as month-on-month growth or top-N per group.
Return ONLY JSON: {"schema":"table and column descriptions as plain text","questions":[{"q":"...","marks":10,"model_answer":"SQL"}]}`;
    } else {
      const kinds = {
        ai: 'Describe a realistic small-business workflow that an AI system could automate (who triggers it, what inputs arrive, what context data exists, what the output is, who must approve it). The student must produce a Component Map for it.',
        'first-principles': 'Write one case in the exact style of the Term 1 Business Frameworks papers in the notes: a short business scenario with an exhibit table of numbers, then 3 to 4 sub-questions with marks that mix (a) two factors or hypotheses with why they matter, (b) chained calculations where formulas and assumptions must be shown (sizing, unit economics or LTV), and (c) a strategy or growth-flywheel part. Total 30 marks, set in India, different from the cases in the notes.',
        communication: 'Write a Tell-Me-About-Yourself practice prompt with a specific audience (an interviewer at a named type of company) and a 90-second limit.',
      };
      prompt = `${base}

${kinds[slug] || 'Write one exam-style written question.'}
Return ONLY JSON: {"prompt":"the full question the student sees","minutes":<suggested minutes>,"marks":${subject.marks || 20}}`;
    }
    const raw = await llm([{ role: 'user', content: prompt }], { max: 4000, temperature: 0.7 });
    const drill = parseJSON(raw);
    await rpc('wr_log_event', { p_token: token, p_slug: slug, p_type: 'started a drill' }).catch(() => {});
    return Response.json({ type: subject.drill_type, secPerQ: subject.sec_per_q, thin, drill, sources: mats.map((m, i) => ({ n: i + 1, id: m.id, title: m.title })) });
  } catch (e) { return errorResponse(e); }
}
