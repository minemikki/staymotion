// Vipps ePayment API helpers (shared by create.js and status.js).
// Test base:  https://apitest.vipps.no
// Prod base:  https://api.vipps.no
// Set VIPPS_BASE accordingly.

const BASE = () => process.env.VIPPS_BASE || 'https://apitest.vipps.no';

export async function vippsAccessToken() {
  const r = await fetch(`${BASE()}/accesstoken/get`, {
    method: 'POST',
    headers: {
      client_id: process.env.VIPPS_CLIENT_ID,
      client_secret: process.env.VIPPS_CLIENT_SECRET,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
    },
  });
  if (!r.ok) throw new Error('Vipps token failed: ' + (await r.text()));
  const j = await r.json();
  return j.access_token;
}

export function vippsHeaders(token, idempotencyKey) {
  const h = {
    Authorization: `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
    'Merchant-Serial-Number': process.env.VIPPS_MSN,
    'Content-Type': 'application/json',
    'Vipps-System-Name': 'staymotion',
    'Vipps-System-Version': '1.0',
  };
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
  return h;
}

export const vippsBase = BASE;
