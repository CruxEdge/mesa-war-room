// Minimal MCP (streamable HTTP) client for the Nexus MCP server.
const NEXUS_URL = process.env.NEXUS_MCP_URL || 'https://students.mesaschool.co.in/mcp';

function parseBody(text, contentType) {
  if ((contentType || '').includes('text/event-stream')) {
    const msgs = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => {
      try { return JSON.parse(l.slice(5).trim()); } catch { return null; }
    }).filter(Boolean);
    return msgs.find((m) => m.result || m.error) || msgs[msgs.length - 1];
  }
  return text ? JSON.parse(text) : null;
}

export async function nexusClient(token) {
  let sessionId = null;
  let id = 0;
  async function send(method, params, isNotification = false) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    const body = isNotification ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: ++id, method, params };
    const r = await fetch(NEXUS_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    const sid = r.headers.get('mcp-session-id');
    if (sid) sessionId = sid;
    if (isNotification) return null;
    const text = await r.text();
    if (!r.ok) throw new Error(`Nexus ${method} failed (${r.status}): ${text.slice(0, 200)}`);
    const msg = parseBody(text, r.headers.get('content-type'));
    if (msg?.error) throw new Error(`Nexus ${method}: ${msg.error.message}`);
    return msg?.result;
  }
  await send('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'mesa-war-room', version: '1.0.0' },
  });
  await send('notifications/initialized', {}, true);
  return {
    async call(name, args) {
      const res = await send('tools/call', { name, arguments: args || {} });
      const text = (res?.content || []).map((c) => c.text || '').join('\n');
      const s = text.indexOf('{');
      const e = text.lastIndexOf('}');
      if (s < 0) throw new Error(`Nexus ${name} returned no data`);
      return JSON.parse(text.slice(s, e + 1));
    },
  };
}
