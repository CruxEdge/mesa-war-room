'use client';
import { useEffect, useState } from 'react';

const EXAM = new Date('2026-11-23T09:00:00+05:30').getTime();

export default function Countdown() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  if (now === null) return <div className="clock" aria-hidden="true">&nbsp;</div>;
  const ms = EXAM - now;
  if (ms <= 0) return <div className="clock">Exam day</div>;
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  const unit = (v, l) => (<span className="u"><span className="n" key={`${l}${v}`}>{String(v).padStart(l === 'd' ? 1 : 2, '0')}</span><span className="l">{l}</span></span>);
  return (
    <div className="clock" role="timer" aria-label={`${d} days ${h} hours ${m} minutes until exams`}>
      {unit(d, 'd')}{unit(h, 'h')}{unit(m, 'm')}
    </div>
  );
}
