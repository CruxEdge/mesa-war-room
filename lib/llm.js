const PLAIN = 'Formatting rule: write plain text with simple markdown only. Never use LaTeX, math mode or $ delimiters. Write money as ₹1.44 lakh or ₹2,950, percentages as 12.5%, and use × and ÷ for arithmetic.';

// Strip LaTeX that a model may still emit, e.g. $\text{Rs } 1.44\text{ lakh}$ -> Rs 1.44 lakh.
// Only touches $...$ spans that contain LaTeX syntax, so plain dollar amounts like $40M are left alone.
export function delatex(s) {
  const clean = (t) => t
    .replace(/\\(?:left|right)(?![a-z])/g, '')
    .replace(/\\(?:text|mathrm|textbf|mathbf|operatorname|textit)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${/[\s+\-]/.test(a) ? `(${a})` : a}/${/[\s+\-]/.test(b) ? `(${b})` : b}`)
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷')
    .replace(/\\approx/g, '≈').replace(/\\leq?(?![a-z])/g, '≤').replace(/\\geq?(?![a-z])/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\\rightarrow|\\to(?![a-z])/g, '→').replace(/\\%/g, '%').replace(/\\\$/g, '$')
    .replace(/\\[,;:!]|~/g, ' ').replace(/\\q?quad/g, ' ')
    .replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  return String(s || '')
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => clean(t))
    .replace(/\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g, (_, a, b) => clean(a || b))
    .replace(/\$([^$\n]*?(?:\\|\{|\^|_)[^$\n]*?)\$/g, (_, t) => clean(t))
    .replace(/\$(\S[^$\n]*?=[^$\n]*?\S)\$/g, '$1');
}

export async function llm(messages, { max = 1800, temperature = 0.4 } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('AI is not configured yet (missing OpenRouter key)');
  const primary = process.env.OPENROUTER_MODEL || 'google/gemini-3.8-flash';
  const fallback = process.env.OPENROUTER_FALLBACK || 'google/gemini-3.7-flash';
  const msgs = messages[0]?.role === 'system'
    ? [{ ...messages[0], content: `${messages[0].content}\n\n${PLAIN}` }, ...messages.slice(1)]
    : [{ role: 'system', content: PLAIN }, ...messages];
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mesa-war-room-mesa-pers.vercel.app', 'X-Title': 'Mesa War Room' },
    // Low thinking effort keeps Gemini's reasoning from eating the answer's token budget.
    body: JSON.stringify({ model: primary, models: [primary, fallback], messages: msgs, max_tokens: max + 1500, temperature, reasoning: { effort: 'low', exclude: true } }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `AI request failed (${r.status})`;
    if (/guardrail/i.test(msg)) throw new Error('The AI model is blocked by the OpenRouter account guardrails. Ask the site owner to allow Google Gemini models.');
    throw new Error(msg);
  }
  const raw = data?.choices?.[0]?.message?.content || '';
  // JSON replies (drills, grading) are cleaned field by field in parseJSON; plain answers are cleaned here.
  const looksJson = /^\s*(?:```(?:json)?\s*)?[\[{]/.test(raw);
  const text = looksJson ? raw : delatex(raw);
  if (!text.trim()) throw new Error('The AI returned an empty answer. Please try again.');
  return text;
}

export function parseJSON(text) {
  const t = String(text || '').replace(/```(?:json)?/g, '')
    .replace(/(?<!\\)\\(?=(?:text|textbf|textit|mathrm|mathbf|operatorname|frac|times|cdot|div|approx|leq?|geq?|neq|left|right|rightarrow|to|q?quad)(?![a-z]))/g, '\\\\')
    .replace(/(?<!\\)\\(?=[%,;:!$ ])/g, '\\\\');
  const starts = [t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0);
  if (!starts.length) throw new Error('AI returned no JSON');
  const s = Math.min(...starts);
  const e = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  return deepClean(JSON.parse(t.slice(s, e + 1)));
}

function deepClean(v) {
  if (typeof v === 'string') return delatex(v);
  if (Array.isArray(v)) return v.map(deepClean);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClean(x)]));
  return v;
}

export function notesBlock(materials) {
  return materials.map((m, i) => `[${i + 1}] ${m.title}${m.session_no ? ` (Session ${m.session_no})` : ''}\n${m.content}`).join('\n\n---\n\n');
}
