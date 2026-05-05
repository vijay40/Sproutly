import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

const PORT = Number(process.env.PORT) || 8787;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function signKidJwt(kidDeviceId: string, childId: string, familyId: string): string {
  return jwt.sign(
    {
      role: 'authenticated',
      kid_device_id: kidDeviceId,
      child_id: childId,
      family_id: familyId,
    },
    JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '365d' },
  );
}

async function redeemPairingCode(pairing_code: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE || !JWT_SECRET) {
    return { status: 500 as const, body: 'Server misconfigured' };
  }

  const code = pairing_code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { status: 400 as const, body: 'Invalid code format' };
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: rows, error } = await sb
    .from('kid_devices')
    .select(
      'id, family_id, child_id, pairing_code, pairing_code_expires_at, pairing_attempts, device_token_hash',
    )
    .eq('pairing_code', code)
    .limit(1);

  if (error) {
    console.error('[pairing-server] kid_devices select error', error.message);
    return { status: 500 as const, body: 'DB error' };
  }

  const row = rows?.[0];
  if (!row) {
    return { status: 404 as const, body: 'Not found' };
  }

  if (row.device_token_hash) {
    return { status: 409 as const, body: 'Already paired' };
  }

  const expiresOk =
    row.pairing_code_expires_at && new Date(row.pairing_code_expires_at) > new Date();
  if (!expiresOk) {
    await sb.from('kid_devices').update({ pairing_code: null, pairing_code_expires_at: null }).eq('id', row.id);
    return { status: 410 as const, body: 'Expired' };
  }

  if ((row.pairing_attempts ?? 0) >= 5) {
    await sb.from('kid_devices').update({ pairing_code: null, pairing_code_expires_at: null }).eq('id', row.id);
    return { status: 429 as const, body: 'Too many attempts' };
  }

  const token = signKidJwt(row.id, row.child_id, row.family_id);
  const hash = sha256Hex(token);

  const { error: uErr } = await sb
    .from('kid_devices')
    .update({
      device_token_hash: hash,
      pairing_code: null,
      pairing_code_expires_at: null,
      paired_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (uErr) {
    console.error('[pairing-server] kid_devices update error', uErr.message);
    return { status: 500 as const, body: 'DB error' };
  }

  return { status: 200 as const, body: JSON.stringify({ token, child_id: row.child_id }) };
}

function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).send('ok');
  });

  app.post('/redeem-pairing-code', async (req, res) => {
    const pairing_code = (req.body as { pairing_code?: string })?.pairing_code ?? '';
    const result = await redeemPairingCode(String(pairing_code));
    const type = result.status === 200 ? 'application/json' : 'text/plain';
    res.status(result.status).type(type).send(result.body);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[pairing-server] listening on http://0.0.0.0:${PORT}`);
  });
}

main();
