import { rpc } from './db';
import { nexusClient } from './nexus';

const MAX_CHARS = 60000;

function kindOf(item, topic) {
  const t = `${topic} ${item.title} ${item.category || ''}`.toLowerCase();
  if (item.type === 'recording') return 'recording';
  if (t.includes('pre-read') || t.includes('preread')) return 'preread';
  if (t.includes('quiz')) return 'quiz';
  if (t.includes('practice') || t.includes('mock')) return 'practice';
  if (t.includes('case')) return 'case';
  if ((item.fileType || '') === 'csv' || t.includes('dataset') || t.includes('seed')) return 'data';
  if (t.includes('outline')) return 'outline';
  if (t.includes('deck') || t.includes('ppt') || (item.fileType || '') === 'pdf') return 'deck';
  return item.kind || 'resource';
}

function sessionOf(item) {
  const m = `${item.title} ${item.fileName || ''}`.match(/session[\s_-]*0?(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

// Pull plain text from a Google Doc/Slides/Sheet link, only works when shared "anyone with the link".
export async function googleExport(link) {
  const m = String(link || '').match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
  if (!m) return null;
  const [, type, id] = m;
  const url =
    type === 'document' ? `https://docs.google.com/document/d/${id}/export?format=txt`
    : type === 'presentation' ? `https://docs.google.com/presentation/d/${id}/export/txt`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || ct.includes('text/html')) return null;
    const text = (await r.text()).replace(/\n{3,}/g, '\n\n').trim();
    return text.length > 40 ? text.slice(0, MAX_CHARS) : null;
  } catch {
    return null;
  }
}

async function syncNexus(secret, subjects, log) {
  const token = process.env.NEXUS_TOKEN;
  if (!token) { log.push('Nexus: skipped (NEXUS_TOKEN not set)'); return; }
  const client = await nexusClient(token);
  for (const s of subjects.filter((x) => x.nexus_course_id)) {
    const data = await client.call('get_course_content', { courseId: s.nexus_course_id });
    const course = data.courses?.[0];
    if (!course) continue;
    const items = [];
    for (const topic of course.topics || []) {
      for (const it of topic.items || []) {
        if (it.type === 'session') continue;
        let content = null;
        if (it.kind === 'text') {
          try {
            const mat = await client.call('get_material', { materialId: it.id });
            if (mat.text && mat.text.trim().length > 40) content = mat.text.slice(0, MAX_CHARS);
          } catch { /* keep going */ }
        } else if (it.link) {
          content = await googleExport(it.link);
        }
        items.push({
          subject_slug: s.slug,
          source: 'nexus',
          source_id: `nexus:${it.id}`,
          title: it.type === 'recording' ? `Recording: ${it.title}` : it.title,
          session_no: sessionOf(it),
          kind: kindOf(it, topic.title),
          url: it.link || course.coursePage,
          content,
        });
      }
    }
    if (items.length) {
      const res = await rpc('wr_sync_upsert', { p_secret: secret, p_items: items });
      log.push(`Nexus ${s.slug}: ${res.new} new, ${res.seen} checked`);
    }
  }
}

const SUBJECT_MATCHERS = [
  ['sql-101', /\bsql\b/i],
  ['b2b-sales', /\bb2b\b|signal to signed/i],
  ['data-102', /\bdata\b/i],
  ['first-principles', /first principle/i],
  ['communication', /communication|tmay/i],
  ['ai', /\bai\b|artificial/i],
];

async function syncDrive(secret, log) {
  const key = process.env.GOOGLE_API_KEY;
  const folder = process.env.DRIVE_FOLDER_ID;
  if (!key || !folder) { log.push('Drive: skipped (GOOGLE_API_KEY or DRIVE_FOLDER_ID not set)'); return; }
  const api = 'https://www.googleapis.com/drive/v3/files';
  const items = [];
  async function walk(id, path, depth) {
    if (depth > 4) return;
    const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
    const r = await fetch(`${api}?q=${q}&key=${key}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,webViewLink)`);
    if (!r.ok) throw new Error(`Drive list failed (${r.status}). Is the folder shared "anyone with the link"?`);
    const { files = [] } = await r.json();
    for (const f of files) {
      const p = `${path} / ${f.name}`;
      if (f.mimeType === 'application/vnd.google-apps.folder') { await walk(f.id, p, depth + 1); continue; }
      const match = SUBJECT_MATCHERS.find(([, re]) => re.test(p));
      if (!match) continue;
      let content = null;
      const exportType = f.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'text/csv'
        : f.mimeType?.startsWith('application/vnd.google-apps.') ? 'text/plain' : null;
      if (exportType) {
        const er = await fetch(`${api}/${f.id}/export?mimeType=${encodeURIComponent(exportType)}&key=${key}`);
        if (er.ok) content = (await er.text()).slice(0, MAX_CHARS);
      } else if (f.mimeType?.startsWith('text/')) {
        const er = await fetch(`${api}/${f.id}?alt=media&key=${key}`);
        if (er.ok) content = (await er.text()).slice(0, MAX_CHARS);
      }
      items.push({
        subject_slug: match[0], source: 'drive', source_id: `drive:${f.id}`, title: f.name,
        session_no: sessionOf({ title: f.name }), kind: /notes/i.test(p) ? 'granola' : 'notes', url: f.webViewLink, content,
      });
    }
  }
  await walk(folder, 'root', 0);
  if (items.length) {
    const res = await rpc('wr_sync_upsert', { p_secret: secret, p_items: items });
    log.push(`Drive: ${res.new} new, ${res.seen} checked`);
  } else {
    log.push('Drive: no files found for the assessed subjects');
  }
}

export async function runSync() {
  const secret = process.env.SYNC_SECRET;
  const log = [];
  let status = 'ok';
  try {
    const subjects = await rpc('wr_sync_subjects', { p_secret: secret });
    try { await syncNexus(secret, subjects, log); } catch (e) { status = 'partial'; log.push(`Nexus error: ${e.message}`); }
    try { await syncDrive(secret, log); } catch (e) { status = 'partial'; log.push(`Drive error: ${e.message}`); }
  } catch (e) {
    status = 'failed';
    log.push(e.message);
  }
  try { await rpc('wr_sync_log', { p_secret: secret, p_source: 'daily', p_status: status, p_detail: log.join(' | ') }); } catch {}
  return { status, log };
}
