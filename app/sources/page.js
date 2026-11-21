import { redirect } from 'next/navigation';
import { rpc, getToken } from '@/lib/db';
import Top from '@/components/Top';
import Library from '@/components/Library';

export const dynamic = 'force-dynamic';

export default async function Sources({ searchParams }) {
  const token = getToken();
  if (!token) redirect('/login');
  let me, lib;
  try { [me, lib] = await Promise.all([rpc('wr_me', { p_token: token }), rpc('wr_library', { p_token: token })]); }
  catch (e) { if (e.status === 401) redirect('/login'); throw e; }
  return (
    <>
      <Top name={me?.name} active="sources" />
      <main className="wrap page">
        <section className="glass subhead reveal" style={{ '--i': 0 }}>
          <h1>Sources</h1>
          <p>Every deck, pre-read, paper, dataset, recording and set of notes the war room uses. Each AI answer and drill links back here, and every item links to its original on Nexus or Google.</p>
        </section>
        <Library items={lib.items} subjects={lib.subjects} initialSubject={searchParams?.subject || 'all'} />
      </main>
    </>
  );
}
