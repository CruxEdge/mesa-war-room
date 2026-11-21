'use client';
import { useState } from 'react';
import Countdown from './Countdown';
import ThemeToggle from './ThemeToggle';

const G = (<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>);

// Mesa Google accounts only.
export default function LoginForm({ google, error }) {
  const [going, setGoing] = useState(false);
  return (
    <main className="login">
      <section className="glass left reveal" style={{ '--i': 0 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="brand">Mesa War Room</span><ThemeToggle /></div>
        <div>
          <Countdown />
          <p style={{ maxWidth: '44ch', marginTop: 18, color: 'var(--ink-2)' }}>until mid-terms. Every deck, pre-read, practice paper and recording in one place, with timed drills built on the real exam formats and answers that cite their source.</p>
        </div>
        <p className="dim">B2B Sales, SQL 101, AI, Data 102, First Principles and Communication</p>
      </section>
      <section className="glass right reveal" style={{ '--i': 1 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1>Sign in</h1>
          <p className="dim">Use your Mesa Google account. Only @…mesaschool.co accounts can get in.</p>
          {error && <div className="err" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
          {google ? (
            <a href="/api/auth/google" className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setGoing(true)} aria-busy={going}>
              <span style={{ background: '#fff', borderRadius: 6, padding: 3, display: 'inline-flex' }}>{G}</span>
              {going ? 'Opening Google…' : 'Continue with Google'}
            </a>
          ) : (
            <div className="note" role="status" style={{ marginTop: 8 }}>Sign-in opens once Mesa Google sign-in is connected. Check back shortly.</div>
          )}
        </div>
      </section>
    </main>
  );
}
