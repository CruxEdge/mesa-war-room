import Link from 'next/link';
import { redirect } from 'next/navigation';
import { rpc, getToken } from '@/lib/db';
import Top from '@/components/Top';
import SourceBadge, { origin } from '@/components/SourceBadge';

export const dynamic = 'force-dynamic';
const SUBJECT = { 'b2b-sales': 'B2B Sales', 'sql-101': 'SQL 101', ai: 'AI and its Applications', 'data-102': 'Data 102', 'first-principles': 'First Principles Lab', communication: 'Communication' };

export default async function Material({ params }) {
  const token = getToken();
  if (!token) redirect('/login');
  let m;
  try { m = await rpc('wr_material', { p_token: token, p_id: params.id }); } catch (e) { if (e.status === 401) redirect('/login'); throw e; }
  if (!m) return <><Top /><main className="wrap page"><div className="glass pad">That source doesn't exist. <Link href="/sources">Browse all sources</Link></div></main></>;
  const o = origin(m);
  const cite = `${SUBJECT[m.subject_slug] || m.subject_slug}${m.session_no ? `, Session ${m.session_no}` : ''}: ${m.title}`;
  return (
    <>
      <Top active="sources" />
      <main className="wrap page reader">
        <div className="row" style={{ marginBottom: 12 }}>
          <Link href={`/s/${m.subject_slug}`} className="chip">Back to {SUBJECT[m.subject_slug] || 'subject'}</Link>
          <Link href={`/sources?subject=${m.subject_slug}`} className="chip">All sources</Link>
        </div>
        <section className="glass pad citecard reveal" style={{ '--i': 0 }}>
          <div>
            <div className="row"><SourceBadge m={m} />{m.kind && <span className="badge">{m.kind}</span>}{m.session_no && <span className="badge">Session {m.session_no}</span>}</div>
            <h1>{m.title}</h1>
            <p className="dim" style={{ margin: 0 }}>Cite as: {cite}</p>
          </div>
          {o.open && m.url && <a href={m.url} target="_blank" rel="noreferrer" className="btn">{o.open}</a>}
        </section>
        <article className="glass pad reveal" style={{ '--i': 1, marginTop: 16 }}>
          {m.content ? <div className="body">{m.content}</div> : (
            <p className="note" style={{ margin: 0 }}>The text of this file isn't stored here yet. Nexus only shares uploaded files inside the course page. {m.url ? 'Use the button above to open the original.' : ''} Add notes from it on the subject page so drills and answers can use it.</p>
          )}
        </article>
      </main>
    </>
  );
}
