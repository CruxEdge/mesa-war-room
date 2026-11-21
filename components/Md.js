import Link from 'next/link';
// Tiny markdown renderer: headings, bullets, numbered lists, **bold**, `code`, and [n] citation chips.
function inline(text, sources, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+(?:\s*,\s*\d+)*\])/g);
  return parts.map((p, i) => {
    const k = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={k}>{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={k}>{p.slice(1, -1)}</code>;
    const m = p.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
    if (m && sources?.length) {
      return m[1].split(',').map((n) => n.trim()).map((n) => {
        const s = sources.find((x) => String(x.n) === n);
        return s ? <Link key={`${k}-${n}`} href={`/m/${s.id}`} className="cite" title={s.title}>{n}</Link> : <span key={`${k}-${n}`}>[{n}]</span>;
      });
    }
    return p;
  });
}
export default function Md({ text, sources }) {
  const lines = String(text || '').split('\n');
  const out = []; let list = null; let ordered = false;
  const flush = () => { if (list) { out.push(ordered ? <ol key={out.length}>{list}</ol> : <ul key={out.length}>{list}</ul>); list = null; } };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const b = line.match(/^\s*[-*•]\s+(.*)/); const n = line.match(/^\s*\d+[.)]\s+(.*)/); const h = line.match(/^#{1,4}\s+(.*)/);
    if (b || n) { const isOl = !!n; if (list && ordered !== isOl) flush(); if (!list) { list = []; ordered = isOl; } list.push(<li key={i}>{inline((b || n)[1], sources, i)}</li>); return; }
    flush();
    if (h) out.push(<h4 key={i}>{inline(h[1], sources, i)}</h4>);
    else if (line.trim()) out.push(<p key={i}>{inline(line, sources, i)}</p>);
  });
  flush();
  return <>{out}</>;
}
