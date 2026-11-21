// Describes where a material came from and where its original lives.
export function origin(m) {
  const url = m.url || '';
  if (/youtu\.?be/.test(url)) return { cls: 'video', label: 'Class recording', open: 'Watch recording' };
  if (/docs\.google\.com|drive\.google\.com/.test(url)) return { cls: 'google', label: 'Google file', open: 'Open in Google' };
  if (/mesaschool\.co\.in/.test(url)) return { cls: 'nexus', label: 'Nexus', open: 'Open in Nexus' };
  if (/axionarc|script\.google/.test(url)) return { cls: 'nexus', label: 'Quiz', open: 'Open quiz' };
  return { cls: '', label: 'Link', open: url ? 'Open original' : null };
}
export function sourceLabel(m) {
  if (m.kind === 'granola') return { cls: 'notes', text: 'Granola notes' };
  if (m.source === 'user' && m.added_by) return { cls: 'notes', text: `Notes by ${m.added_by}` };
  if (m.source === 'drive') return { cls: 'google', text: 'Shared Drive' };
  if (m.source === 'user') return { cls: 'notes', text: 'Course file copy' };
  return { cls: 'nexus', text: 'From Nexus' };
}
export default function SourceBadge({ m }) {
  const s = sourceLabel(m);
  return <span className={`badge ${s.cls}`}>{s.text}</span>;
}
