'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Ask from './Ask';
import Drill from './Drill';
import AddNotes from './AddNotes';

const TABS = [['ask', 'Ask the notes'], ['drill', 'Practice drill'], ['notes', 'Add notes'], ['history', 'My attempts']];
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function Workbench({ subject, attempts, initialTab, thin }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initialTab) ? initialTab : 'ask');
  const refs = useRef({}); const [ind, setInd] = useState({ left: 4, width: 0 });
  useIso(() => {
    const place = () => { const el = refs.current[tab]; if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth }); };
    place(); window.addEventListener('resize', place); return () => window.removeEventListener('resize', place);
  }, [tab]);

  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Study tools">
        <span className="ind" style={{ left: ind.left, width: ind.width }} />
        {TABS.map(([k, label]) => (
          <button key={k} ref={(el) => (refs.current[k] = el)} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {thin && tab !== 'notes' && <div className="note">This subject has little course text yet, so the AI will lean on general knowledge. Add session notes to make answers match your classes.</div>}
      <div key={tab} className="swap">
        {tab === 'ask' && <Ask subject={subject} />}
        {tab === 'drill' && <Drill subject={subject} />}
        {tab === 'notes' && <AddNotes subject={subject} />}
        {tab === 'history' && (
          <div className="glass pad">
            {attempts.length === 0 ? <p className="dim" style={{ margin: 0 }}>No attempts yet. Your drill scores show here and on the board.</p> : (
              <div style={{ overflowX: 'auto' }}><table className="table">
                <thead><tr><th>When</th><th>Drill</th><th>Score</th></tr></thead>
                <tbody>{attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                    <td>{a.mode}</td>
                    <td><b>{Number(a.score)}/{Number(a.max_score)}</b> <span className="dim">({Math.round((a.score / a.max_score) * 100)}%)</span></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
