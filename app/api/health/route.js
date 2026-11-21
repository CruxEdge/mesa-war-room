export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ ok: true, version: '1.3', database: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY), ai: Boolean(process.env.OPENROUTER_API_KEY), google_login: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), password_login: false, nexus: Boolean(process.env.NEXUS_TOKEN), drive: Boolean(process.env.GOOGLE_API_KEY && process.env.DRIVE_FOLDER_ID) });
}
