'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

function useCountdown(seconds, running, onEnd, resetKey) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => { setLeft(seconds); }, [seconds, resetKey]);
  useEffect(() => {
    if (!running || !seconds) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(t); setTimeout(() => endRef.current?.(), 0); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [running, seconds, resetKey]);
  return left;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const srcLink = (sources, n) => { const s = sources?.find((x) => String(x.n) === String(n)); return s ? <Link href={`/m/${s.id}`} className="chip">Source: {s.title}</Link> : null; };

function BuiltFrom({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="built"><span className="dim">Built from</span>
      {sources.map((s) => <Link key={s.id} href={`/m/${s.id}`} className="chip" title={s.title}><span className="cite" style={{ margin: 0 }}>{s.n}</span>{s.title.length > 34 ? s.title.slice(0, 32) + '…' : s.title}</Link>)}
    </div>
  );
}

export default function Drill({ subject }) {
  const [state, setState] = useState('idle'); const [data, setData] = useState(null); const [err, setErr] = useState('');
  const [count, setCount] = useState(subject.slug === 'data-102' ? 20 : 10); const [focus, setFocus] = useState('');
  async function start() {
    setErr(''); setState('loading');
    const r = await fetch('/api/drill/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: subject.slug, count, focus }) });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); setState('idle'); return; }
    setData(d); setState('running');
  }
  if (state !== 'running') {
    const desc = subject.drill_type === 'mcq' ? `Timed multiple choice${subject.sec_per_q ? `, ${subject.sec_per_q} seconds a question` : ''}. Each explanation links to the slide or note it came from.`
      : subject.drill_type === 'sql' ? 'Three SQL questions in 30 minutes, typed without autocomplete like pen and paper. Graded out of 30 with model answers.'
      : subject.slug === 'ai' ? 'You get a system to design. Write its Component Map as a grid; it is graded on the 7 required elements.'
      : subject.slug === 'communication' ? 'Write your TMAY and get it scored on structure, proof points and fit.'
      : 'One case in the exam style, with an exhibit to calculate from, timed and graded on the three rubric criteria.';
    return (
      <div className="glass pad">
        <p style={{ marginTop: 0 }}>{desc}</p>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {subject.drill_type === 'mcq' && <div style={{ width: 130 }}><label htmlFor="n">Questions</label><input id="n" type="number" min="5" max="25" value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" /></div>}
          <div style={{ flex: 1, minWidth: 200 }}><label htmlFor="f">Focus (optional)</label><input id="f" type="text" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={subject.slug === 'sql-101' ? 'window functions' : 'a session or topic'} /></div>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn signal" style={{ marginTop: 16 }} onClick={start} disabled={state === 'loading'}>
          {state === 'loading' ? <><span className="typing"><i /><i /><i /></span> Writing your drill</> : 'Start drill'}
        </button>
      </div>
    );
  }
  const reset = () => { setData(null); setState('idle'); };
  return data.type === 'mcq' ? <Mcq subject={subject} data={data} onDone={reset} /> : <Written subject={subject} data={data} onDone={reset} />;
}

function Mcq({ subject, data, onDone }) {
  const qs = data.drill.questions || []; const per = data.secPerQ || 40;
  const [i, setI] = useState(0); const [picks, setPicks] = useState([]); const [finished, setFinished] = useState(false);
  const saved = useRef(false); const picksRef = useRef([]);
  const next = (pick) => {
    if (picksRef.current.length > i) return;
    const p = [...picksRef.current, pick]; picksRef.current = p; setPicks(p);
    if (i + 1 >= qs.length) setFinished(true); else setI(i + 1);
  };
  const left = useCountdown(per, !finished, () => next(null), i);
  const score = picks.filter((p, k) => p === qs[k]?.answer).length;
  useEffect(() => {
    if (finished && !saved.current) { saved.current = true;
      fetch('/api/drill/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: subject.slug, mode: 'MCQ drill', score, max: qs.length, detail: { questions: qs, picks } }) }); }
  }, [finished]); // eslint-disable-line
  if (finished) return (
    <div className="glass pad">
      <div className="score">{score}/{qs.length}</div>
      <p className="dim">{Math.round((score / qs.length) * 100)}% correct. Saved to your board.</p>
      <BuiltFrom sources={data.sources} />
      {qs.map((q, k) => (
        <div key={k} className="fb" style={{ '--i': k }}>
          <b>{k + 1}. {q.q}</b>
          <div style={{ marginTop: 6 }}>
            {picks[k] === q.answer ? <span className="ok">Correct</span> : <span className="no">{picks[k] == null ? 'Ran out of time' : `You chose: ${q.options[picks[k]]}`}</span>}
            {picks[k] !== q.answer && <div>Answer: {q.options[q.answer]}</div>}
            <div className="dim">{q.why}</div>
            <div style={{ marginTop: 6 }}>{srcLink(data.sources, q.src)}</div>
          </div>
        </div>
      ))}
      <button className="btn" onClick={onDone} style={{ marginTop: 12 }}>New drill</button>
    </div>
  );
  const q = qs[i];
  return (
    <div className="glass pad">
      {data.thin && <div className="note">Few course notes for this subject, so some questions lean on general knowledge.</div>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="dim">Question {i + 1} of {qs.length}</span>
        <span className={`timer ${left <= 5 ? 'hot' : ''}`}>{left}s</span>
      </div>
      <div className="bar"><i style={{ width: `${(left / per) * 100}%` }} /></div>
      <div key={i} className="swap">
        <div className="q">{q.q}</div>
        <div className="opts">{q.options.map((o, k) => <button key={k} className="opt" style={{ '--i': k }} onClick={() => next(k)}><b>{String.fromCharCode(65 + k)}.</b> {o}</button>)}</div>
      </div>
    </div>
  );
}

function Written({ subject, data, onDone }) {
  const isSql = data.type === 'sql'; const d = data.drill;
  const minutes = isSql ? 30 : Math.max(5, Math.min(60, Number(d.minutes) || 20));
  const [answers, setAnswers] = useState(isSql ? d.questions.map(() => '') : ['']);
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [timeUp, setTimeUp] = useState(false);
  const left = useCountdown(minutes * 60, !result, () => setTimeUp(true), 'w');
  async function grade() {
    setErr(''); setBusy(true);
    const r = await fetch('/api/drill/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: subject.slug, drill: d, answers }) });
    const res = await r.json(); setBusy(false);
    if (!r.ok) { setErr(res.error); return; }
    setResult(res);
  }
  if (result) return (
    <div className="glass pad">
      <div className="score">{result.score}/{result.max}</div>
      <p className="dim">Saved to your board.</p>
      <BuiltFrom sources={data.sources} />
      {result.items.map((it, k) => (
        <div key={k} className="fb" style={{ '--i': k }}>
          <b>{it.criterion || `Q${k + 1}`}: {it.score}/{it.max}</b>
          <div>{it.feedback}</div>
          {isSql && d.questions[k]?.model_answer && <details style={{ marginTop: 8 }}><summary className="dim">Model answer</summary><div className="pre">{d.questions[k].model_answer}</div></details>}
        </div>
      ))}
      {result.summary && <p className="note" style={{ marginTop: 12 }}>{result.summary}</p>}
      <button className="btn" onClick={onDone}>New drill</button>
    </div>
  );
  const set = (k) => (e) => { const a = [...answers]; a[k] = e.target.value; setAnswers(a); };
  return (
    <div className="glass pad">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="dim">{isSql ? 'SQL test, 30 marks' : `${d.marks || subject.marks} marks`}</span>
        <span className={`timer ${left < 60 ? 'hot' : ''}`}>{fmt(left)}</span>
      </div>
      <BuiltFrom sources={data.sources} />
      {timeUp && <div className="note">Time's up. In the exam you'd stop here; submit to see your score.</div>}
      {isSql ? (<>
        <div className="pre" style={{ marginTop: 10 }}>{d.schema}</div>
        {d.questions.map((q, k) => (
          <div key={k}><label htmlFor={`a${k}`}>Q{k + 1}. {q.q} ({q.marks} marks)</label>
            <textarea id={`a${k}`} className="code" rows={7} value={answers[k]} onChange={set(k)} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" /></div>
        ))}
      </>) : (<>
        <div className="q" style={{ fontSize: 17, whiteSpace: 'pre-wrap' }}>{d.prompt}</div>
        {subject.slug === 'ai' && <p className="dim">Write the grid as text, one line per box, e.g. “Row: Store manager (approves orders) | Trigger: uploads weekly sales CSV”, then list the arrows, context sources and the review gate.</p>}
        <textarea rows={16} value={answers[0]} onChange={set(0)} aria-label="Your answer" />
      </>)}
      {err && <div className="err" role="alert">{err}</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn signal" onClick={grade} disabled={busy || answers.every((a) => !a.trim())}>{busy ? 'Grading…' : 'Submit for grading'}</button>
        <button className="btn ghost" onClick={onDone} disabled={busy}>Discard</button>
      </div>
    </div>
  );
}
