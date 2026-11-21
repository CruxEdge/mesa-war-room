import { runSync } from '@/lib/sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return Response.json(await runSync());
}
