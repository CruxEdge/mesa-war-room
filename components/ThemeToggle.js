'use client';
import { useEffect, useState } from 'react';

const MODES = [
  ['light', 'Light', <svg key="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>],
  ['system', 'Match device', <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>],
  ['dark', 'Dark', <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>],
];

export default function ThemeToggle() {
  const [mode, setMode] = useState('system');
  useEffect(() => {
    try { const t = localStorage.getItem('wr-theme'); if (t === 'light' || t === 'dark') setMode(t); } catch {}
  }, []);
  function pick(m) {
    setMode(m);
    try { localStorage.setItem('wr-theme', m); } catch {}
    if (m === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', m);
  }
  const idx = MODES.findIndex(([k]) => k === mode);
  return (
    <div className="theme" role="group" aria-label="Colour theme">
      <span className="knob" style={{ transform: `translateX(${idx * 34}px)` }} />
      {MODES.map(([k, label, icon]) => (
        <button key={k} type="button" aria-pressed={mode === k} aria-label={label} title={label} onClick={() => pick(k)}>{icon}</button>
      ))}
    </div>
  );
}
