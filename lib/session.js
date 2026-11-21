export function setSessionCookie(res, token) {
  res.cookies.set('wr_token', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
