# Mesa War Room

Exam-prep web app for Mesa School of Business, Cohort 4, Term 2 mid-terms.
Live: https://mesa-war-room-mesa-pers.vercel.app

Students sign in with their Mesa Google account and get, per subject:
- **Ask the notes**: answers from the course material, with numbered citations that open the exact source.
- **Practice drills**: timed MCQs (B2B Sales, Data 102), a 3-question SQL paper, and written cases graded on the course rubric (AI Component Map, First Principles, Communication).
- **Sources**: every deck, pre-read, paper, recording and Granola session note, readable in full, with a link to the original on Nexus or Google.
- A shared board with exam times, readiness per subject and a live activity feed.

## Stack
- **Next.js 14** (App Router) on **Vercel**, region bom1 (Mumbai). Daily cron at 06:00 IST (`vercel.json`).
- **Supabase Postgres** (ap-south-1). All access goes through `SECURITY DEFINER` functions; tables have RLS on with no policies. Schema: `supabase/schema.sql`.
- **OpenRouter** for the model (Gemini 3.8 Flash, falling back to 3.7 Flash). `lib/llm.js` also strips LaTeX from model output.
- **Google OAuth** sign-in, restricted to verified `@…mesaschool.co` Google Workspace accounts (checked in `app/api/auth/google/callback` and again in the database).

## Layout
```
app/                 pages and API routes
  api/auth/google    Google sign-in (start + callback)
  api/ask            Ask the notes
  api/drill          generate, grade, record
  api/notes          classmates add notes
  api/cron/sync      daily Nexus + Drive sync
  s/[slug]           subject page     m/[id]  source reader
  sources            source library   privacy privacy policy
components/          UI (glass theme, drills, chat, library)
lib/                 db (Supabase RPC), llm, google, nexus, sync
supabase/schema.sql  tables and functions (no data, no secrets)
```

## Run locally
```
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```
For Google sign-in locally, add `http://localhost:3000/api/auth/google/callback` as a redirect URI on the OAuth client and set `SITE_URL=http://localhost:3000`.

## Deploying
Pushing to `main` deploys to production on Vercel. Environment variables live in Vercel, never in this repo.
