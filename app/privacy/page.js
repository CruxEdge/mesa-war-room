import Link from 'next/link';

export const metadata = { title: 'Privacy policy · Mesa War Room' };

export default function Privacy() {
  return (
    <main className="wrap page reader">
      <section className="glass pad reveal" style={{ '--i': 0 }}>
        <Link href="/login" className="chip">Back to sign in</Link>
        <h1>Privacy policy</h1>
        <p className="dim" style={{ margin: 0 }}>Mesa War Room · Last updated 18 November 2026</p>
      </section>
      <article className="glass pad reveal" style={{ '--i': 1, marginTop: 16, lineHeight: 1.7 }}>
        <p>Mesa War Room is a study tool built by students of Mesa School of Business (Cohort 4) to prepare for Term 2 mid-term exams. It is not an official Mesa School of Business service. Only people with a Mesa Google Workspace account (an @…mesaschool.co address) can sign in.</p>
        <h2 className="h2" style={{ marginTop: 22 }}>What we collect</h2>
        <ul>
          <li><b>From Google sign-in:</b> your name, your Mesa email address and your Google account ID. We use these only to sign you in and show your name. We do not receive your password or access to your Gmail, Drive or any other Google data.</li>
          <li><b>Your study activity:</b> practice drill attempts and scores, questions you ask, and notes you choose to add.</li>
          <li><b>Activity shown to the cohort:</b> your first name and the kind of action (for example “finished a drill in SQL 101”) appear in the live feed. Scores are never shown to others; the cohort average is anonymous.</li>
          <li><b>Notes you add</b> are visible to everyone signed in, with your first name as the source.</li>
        </ul>
        <h2 className="h2" style={{ marginTop: 22 }}>How it is processed</h2>
        <ul>
          <li>Data is stored in a Supabase database hosted in Mumbai, India, and the site runs on Vercel.</li>
          <li>To answer questions and write or grade drills, your question or answer and the relevant course material are sent to an AI model through OpenRouter. They are used to produce the response and are not used by us for anything else.</li>
          <li>We use one sign-in cookie to keep you logged in for up to 30 days, and your browser stores your light or dark theme choice. There is no advertising or third-party tracking.</li>
        </ul>
        <h2 className="h2" style={{ marginTop: 22 }}>Sharing and retention</h2>
        <p>We do not sell or share your data with anyone else. Data is kept for the duration of the Term 2 preparation period. To have your account and all your data deleted, email <a href="mailto:akshat_gurnani@pg27.mesaschool.co">akshat_gurnani@pg27.mesaschool.co</a> from your Mesa address and it will be removed.</p>
        <h2 className="h2" style={{ marginTop: 22 }}>Contact</h2>
        <p>Questions about this policy: <a href="mailto:akshat_gurnani@pg27.mesaschool.co">akshat_gurnani@pg27.mesaschool.co</a>.</p>
      </article>
    </main>
  );
}
