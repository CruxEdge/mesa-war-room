'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Md from './Md';

const STARTERS = {
  'b2b-sales': ['Explain STEP, FRAME, READ and PACT with an example each', 'Walk me through Arjun’s Q3 gap and coverage maths'],
  'sql-101': ['Walk me through MoM growth with LAG()', 'Top 5 per month: RANK vs ROW_NUMBER?'],
  ai: ['What must a Component Map include?', 'Draw the All In Capital system as a Component Map grid'],
  'data-102': ['Why is Affiliate the worst channel in the Groww case?', 'Which role owns which metric?'],
  'first-principles': ['How was the Uber Country X question marked?', 'Explain the CPCC framework'],
  communication: ['How should I structure a 90-second TMAY?', 'What makes a TMAY memorable?'],
};

export default function Ask({ subject }) {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs]);

  async function send(text) {
    const question = (text ?? q).trim(); if (!question || busy) return;
    setErr(''); setBusy(true); setQ('');
    const history = msgs.filter((m) => m.a).flatMap((m) => [{ role: 'user', content: m.q }, { role: 'assistant', content: m.a }]);
    setMsgs((m) => [...m, { q: question, a: null }]);
    const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: subject.slug, question, history }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setErr(d.error); setMsgs((m) => m.slice(0, -1)); return; }
    setMsgs((m) => [...m.slice(0, -1), { q: question, a: d.answer, sources: d.sources }]);
  }

  return (
    <div className="glass pad chat">
      {msgs.length === 0 && (
        <div className="swap">
          <p style={{ marginTop: 0 }}>Ask anything about {subject.name}. Answers come from the course material, and every numbered chip opens the exact source.</p>
          <div className="row">{(STARTERS[subject.slug] || []).map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
        </div>
      )}
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="bubble me">{m.q}</div>
          <div className="bubble ai">{m.a ? <Md text={m.a} sources={m.sources} /> : <span className="typing" aria-label="Reading the notes"><i /><i /><i /></span>}</div>
          {m.sources?.length > 0 && (
            <div className="srcs" aria-label="Sources used">
              {m.sources.map((s) => <Link key={s.id} href={`/m/${s.id}`} className="chip" title={s.title}><span className="cite" style={{ margin: 0 }}>{s.n}</span>{s.title.length > 46 ? s.title.slice(0, 44) + '…' : s.title}</Link>)}
            </div>
          )}
        </div>
      ))}
      <div ref={end} />
      {err && <div className="err" role="alert">{err}</div>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="row" style={{ flexWrap: 'nowrap' }}>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question" aria-label="Your question" disabled={busy} />
        <button className="btn" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </div>
  );
}
