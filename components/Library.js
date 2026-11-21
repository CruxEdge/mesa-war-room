'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SourceBadge, { origin } from './SourceBadge';

const KINDS = [['all', 'Everything'], ['read', 'Readable here'], ['notes', 'Session notes'], ['recording', 'Recordings'], ['practice', 'Practice papers']];

export default function Library({ items, subjects, initialSubject }) {
  const [subject, setSubject] = useState(subjects.some((s) => s.slug === initialSubject) ? initialSubject : 'all');
  const [kind, setKind] = useState('all'); const [q, setQ] = useState('');
  const list = useMemo(() => items.filter((m) => {
    if (subject !== 'all' && m.subject_slug !== subject) return false;
    if (kind === 'read' && !(m.chars > 40)) return false;
    if (kind === 'notes' && !(m.kind === 'granola' || (m.source === 'user' && m.added_by) || m.kind === 'notes')) return false;
    if (kind === 'recording' && m.kind !== 'recording') return false;
    if (kind === 'practice' && !['practice', 'quiz'].includes(m.kind)) return false;
    if (q && !`${m.title} ${m.subject_name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, subject, kind, q]);

  return (
    <section className="glass pad reveal" style={{ '--i': 1, marginTop: 16 }}>
      <div className="lib-tools">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles" aria-label="Search sources" />
        <div className="row" role="group" aria-label="Subject">
          <button className="chip" aria-pressed={subject === 'all'} onClick={() => setSubject('all')}>All subjects</button>
          {subjects.map((s) => <button key={s.slug} className="chip" aria-pressed={subject === s.slug} onClick={() => setSubject(s.slug)}>{s.name}</button>)}
        </div>
        <div className="row" role="group" aria-label="Type">
          {KINDS.map(([k, l]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
        </div>
        <p className="dim" style={{ margin: 0 }}>{list.length} source{list.length === 1 ? '' : 's'}</p>
      </div>
      <div key={`${subject}-${kind}`}>
        {list.length === 0 && <p className="dim">Nothing matches. Try another filter, or add notes from a subject page.</p>}
        {list.map((m, i) => { const o = origin(m); return (
          <div key={m.id} className="lib-row" style={{ '--i': i }}>
            <div>
              <Link href={`/m/${m.id}`} className="t">{m.title}</Link>
              <div className="meta">
                <span className="badge">{m.subject_name}</span>
                {m.session_no && <span className="badge">Session {m.session_no}</span>}
                <SourceBadge m={m} />
                {m.chars > 40 ? <span className="dim">Full text</span> : <span className="dim">Link only</span>}
              </div>
            </div>
            <div className="acts">
              {m.chars > 40 && <Link href={`/m/${m.id}`} className="chip">Read here</Link>}
              {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="chip">{o.open}</a>}
            </div>
          </div>
        ); })}
      </div>
    </section>
  );
}
