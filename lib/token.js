// Stateless signed "upload token" so we don't need a database for the MVP.
// After a verified payment we mint a short-lived HMAC token; the upload
// endpoint only accepts uploads that carry a valid, unexpired token.

import crypto from 'node:crypto';

const SECRET = process.env.ORDER_SECRET || '';

export function signOrder(payload) {
  if (!SECRET) throw new Error('ORDER_SECRET is not set');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}

export function verifyOrder(token) {
  if (!token || !SECRET) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}
