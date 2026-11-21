import Link from 'next/link';
import { redirect } from 'next/navigation';
import { rpc, getToken } from '@/lib/db';
import Top from '@/components/Top';
import Workbench from '@/components/Workbench';
import SourceBadge from '@/components/SourceBadge';

export const dynamic = 'force-dynamic';

export default async function Subject({ params, searchParams }) {
  const token = getToken();
  if (!token) redirect('/login');
  let me, d;
  try { [me, d] = await Promise.all([rpc('wr_me', { p_token: token }), rpc('wr_subject', { p_token: token, p_slug: params.slug })]); }
  catch (e) {
    if (e.status === 401) redirect('/login');
    return <><Top /><main className="wrap page"><div className="glass pad">That subject doesn't exist. <Link href="/">Back to the board</Link></div></main></>;
  }
  const s = d.subject;
  const withText = d.materials.filter((m) => m.chars > 40).length;
  const notes = d.materials.filter((m) => m.kind === 'granola' || (m.source === 'user' && m.added_by));
  const groups = {};
  d.materials.forEach((m) => { const k = m.session_no ? `Session ${m.session_no}` : 'Course-wide'; (groups[k] ||= []).push(m); });
  const keys = Object.keys(groups).sort((a, b) => (a === 'Course-wide' ? 1 : b === 'Course-wide' ? -1 : parseInt(a.slice(8)) - parseInt(b.slice(8))));

  return (
    <>
      <Top name={me?.name} />
      <main className="wrap page">
        <section className="glass subhead reveal" style={{ '--i': 0 }}>
          <Link href="/" className="dim">Back to the board</Link>
          <h1>{s.name}</h1>
          <p>{s.format}</p>
          <p className="dim">{s.prof ? `${s.prof}. ` : ''}{s.deadline_note || ''}</p>
        </section>
        <div className="cols">
          <aside className="glass pad reveal" style={{ '--i': 1 }}>
            <h2 className="h2">Course material</h2>
            <p className="dim" style={{ marginTop: -6 }}>{withText} of {d.materials.length} have full text the AI reads and cites. The rest link to the original.</p>
            {notes.length > 0 && <p className="dim">{notes.length} set{notes.length === 1 ? '' : 's'} of session notes included.</p>}
            <ul className="mats">
              {keys.map((k) => (
                <li key={k}>
                  <div className="grp">{k}</div>
                  <ul className="mats">
                    {groups[k].map((m) => (
                      <li key={m.id} className="it">
                        <span className={`dot ${m.chars > 40 ? 'on' : ''}`} title={m.chars > 40 ? 'Full text available' : 'Link only'} />
                        <span><Link href={`/m/${m.id}`}>{m.title}</Link></span>
                        <span className="k"><SourceBadge m={m} /></span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <Link href={`/sources?subject=${s.slug}`} className="chip" style={{ marginTop: 14 }}>See all sources for this subject</Link>
          </aside>
          <div className="reveal" style={{ '--i': 2 }}>
            <Workbench subject={s} attempts={d.attempts} initialTab={searchParams?.tab || 'ask'} thin={withText < 2} />
          </div>
        </div>
      </main>
    </>
  );
}
