export const MESA_DOMAIN = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)*mesaschool\.co$/i;
export const MESA_HD = /^([a-z0-9-]+\.)*mesaschool\.co$/i;

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
// Mesa Google accounts only. Password sign-in is permanently off.
export function passwordAllowed() {
  return false;
}
export function redirectUri(req) {
  const base = process.env.SITE_URL || new URL(req.url).origin;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}
export function decodeJwtPayload(jwt) {
  const part = String(jwt || '').split('.')[1];
  if (!part) throw new Error('bad_google');
  return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}
