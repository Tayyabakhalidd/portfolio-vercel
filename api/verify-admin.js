// api/verify-admin.js
// Verifies the admin password against the ADMIN_PASSWORD environment variable.
// Returns a signed session token valid for 24 hours.
// The password is NEVER stored in the frontend code.

const crypto = require('crypto');

function signToken(secret) {
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  const payload = `admin:${expires}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64');
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    console.error('Missing ADMIN_PASSWORD or SESSION_SECRET environment variables');
    return res.status(500).json({ error: 'Server not configured. Set ADMIN_PASSWORD and SESSION_SECRET in Vercel environment variables.' });
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch {}

  const { password } = body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  // Constant-time comparison to prevent timing attacks
  const providedBuf = Buffer.from(String(password));
  const expectedBuf = Buffer.from(String(adminPassword));
  const match =
    providedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!match) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }

  const token = signToken(sessionSecret);
  return res.status(200).json({ ok: true, token });
};
