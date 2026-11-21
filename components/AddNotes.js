'use client';
import { useState } from 'react';

export default function AddNotes({ subject }) {
  const [f, setF] = useState({ title: '', session: '', content: '', url: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    const r = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: subject.slug, ...f }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) { setErr(d.error); return; }
    setMsg('Notes added. The whole cohort can read them, and the AI will cite them.');
    setF({ title: '', session: '', content: '', url: '' });
  }
  return (
    <form className="glass pad" onSubmit={save}>
      <p style={{ marginTop: 0 }}>Share session notes with the cohort: paste text (Granola notes work well), or a Google Docs or Slides link shared as “anyone with the link”. Your name shows on them as the source.</p>
      <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        <div style={{ flex: 1 }}><label htmlFor="t">Title</label><input id="t" type="text" value={f.title} onChange={set('title')} placeholder="Session 6: competitive positioning" required /></div>
        <div style={{ width: 110 }}><label htmlFor="sn">Session</label><input id="sn" type="number" min="1" max="30" value={f.session} onChange={set('session')} inputMode="numeric" /></div>
      </div>
      <label htmlFor="u">Google Docs or Slides link (optional)</label>
      <input id="u" type="text" value={f.url} onChange={set('url')} placeholder="https://docs.google.com/…" inputMode="url" />
      <label htmlFor="c">Notes</label>
      <textarea id="c" rows={12} value={f.content} onChange={set('content')} placeholder="Key points, definitions, frameworks and examples from the session" />
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <p className="ok swap">{msg}</p>}
      <button className="btn" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Adding…' : 'Add notes'}</button>
    </form>
  );
}
