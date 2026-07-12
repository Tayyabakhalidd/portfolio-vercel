// api/_auth.js
// Shared token validation helper for save-content.js
// Vercel skips files prefixed with _ in the api/ folder (not deployed as endpoints).

const crypto = require('crypto');

function isValidToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return false;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { payload, sig } = decoded;
    if (!payload || !sig) return false;

    // Verify signature
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

    // Check expiry
    const [, expiresStr] = payload.split(':');
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return false;

    return true;
  } catch {
    return false;
  }
}

module.exports = { isValidToken };
