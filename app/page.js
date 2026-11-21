import Link from 'next/link';
import { redirect } from 'next/navigation';
import { rpc, getToken } from '@/lib/db';
import Countdown from '@/components/Countdown';
import Top from '@/components/Top';
import Ago from '@/components/Ago';

export const dynamic = 'force-dynamic';

const ringColor = (v) => (v == null ? 'var(--hairline)' : v < 50 ? 'var(--bad)' : v < 75 ? 'var(--mid)' : 'var(--good)');

export default async function Home() {
  const token = getToken();
  if (!token) redirect('/login');
  let me, d;
  try { [me, d] = await Promise.all([rpc('wr_me', { p_token: token }), rpc('wr_dashboard', { p_token: token })]); }
  catch (e) { if (e.status === 401) redirect('/login'); throw e; }
  const subjects = d.subjects || [];
  const nameOf = (slug) => subjects.find((s) => s.slug === slug)?.name || slug;
  const todo = [...subjects]
    .map((s) => ({ ...s, gap: (s.my_readiness == null ? 100 : 100 - s.my_readiness) * (s.marks || 10) }))
    .sort((a, b) => b.gap - a.gap).slice(0, 3);

  return (
    <>
      <Top name={me?.name} active="board" />
      <main className="wrap page">
        <section className="glass hero reveal" style={{ '--i': 0 }}>
          <div>
            <Countdown />
            <p>until Monday 23 November: B2B Sales, AI and First Principles. Data 102 moves to Monday 30 November, SQL to Wednesday 2 December, the AI build is due 29 November, and TMAY runs 23 to 27 November on Nexus.</p>
          </div>
          <div className="pulse">
            <div><b>{d.cohort.online_now}</b><span className="dim live">preparing now</span></div>
            <div><b>{d.cohort.active_today}<span className="dim" style={{ fontSize: 16 }}>/{d.cohort.members}</span></b><span className="dim">active today</span></div>
          </div>
        </section>

        <div className="dash">
          <section aria-labelledby="board-h">
            <h2 id="board-h" className="h2" style={{ margin: '4px 4px 12px' }}>Your subjects</h2>
            <div className="subjects">
              {subjects.map((s, i) => (
                <Link key={s.slug} href={`/s/${s.slug}`} className="glass sheen subj reveal" style={{ '--i': i + 1 }}>
                  <div>
                    <h3>{s.name}</h3>
                    <div className="when">{s.exam_when || 'Mon 23 Nov'}{s.slug === 'ai' && <em>Build 29 Nov</em>}{(s.slug === 'sql-101' || s.slug === 'data-102') && <em>Moved</em>}</div>
                  </div>
                  <div className="ring" style={{ '--target': s.my_readiness || 0, '--c': ringColor(s.my_readiness) }} aria-label={s.my_readiness == null ? 'No drills yet' : `Readiness ${s.my_readiness}%`}>
                    <span>{s.my_readiness == null ? '—' : `${s.my_readiness}%`}</span>
                  </div>
                  <div className="fmt">{s.format}</div>
                  <div className="stats">
                    <span><b>{s.material_count}</b> sources</span>
                    <span><b>{s.my_attempts}</b> drills</span>
                    <span>Cohort <b>{s.cohort_avg == null ? '—' : `${s.cohort_avg}%`}</b></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="side">
            <section className="glass pad reveal" style={{ '--i': 2 }}>
              <h2>Do this next</h2>
              <ul className="todo">
                {todo.map((s) => (
                  <li key={s.slug}><Link href={`/s/${s.slug}?tab=drill`}>
                    <b>{s.name}</b><span className="dim">{s.marks} marks</span>
                  </Link></li>
                ))}
              </ul>
            </section>
            <section className="glass pad reveal" style={{ '--i': 3 }}>
              <h2>Live in the room</h2>
              <ul className="feed">
                {d.feed.length === 0 && <li className="dim">Nobody yet. Start a drill to be first.</li>}
                {d.feed.slice(0, 8).map((f, i) => (
                  <li key={i} style={{ '--i': i }}><b>{f.who}</b> {f.type}{f.subject_slug ? ` in ${nameOf(f.subject_slug)}` : ''}<Ago at={f.created_at} /></li>
                ))}
              </ul>
            </section>
            <section className="glass pad reveal" style={{ '--i': 4 }}>
              <h2>Recently added</h2>
              <ul className="feed">
                {d.new_materials.slice(0, 6).map((m, i) => (
                  <li key={m.id} style={{ '--i': i }}><Link href={`/m/${m.id}`}>{m.title}</Link><time>{nameOf(m.subject_slug)}</time></li>
                ))}
              </ul>
              <Link href="/sources" className="chip" style={{ marginTop: 10 }}>Browse all sources</Link>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
