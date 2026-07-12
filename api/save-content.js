// api/save-content.js
// Saves a single portfolio content key/value to Supabase.
// Requires a valid admin session token in the x-admin-token header.

const { createClient } = require('@supabase/supabase-js');
const { isValidToken } = require('./_auth');

const MAX_VALUE_BYTES = 4 * 1024 * 1024; // 4MB per key (covers base64 profile pictures)

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify admin token
  const token = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  // Parse body
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; }
  catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

  const { key, value } = body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "key" field' });
  }

  // Serialize value
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_VALUE_BYTES) {
    return res.status(413).json({ error: 'Value too large. If uploading a profile picture, use a smaller image (under 2MB).' });
  }

  try {
    const supabase = getSupabase();

    // Upsert: insert if not exists, update if exists
    const { error } = await supabase
      .from('portfolio_content')
      .upsert(
        { site_id: 'main', key, value: serialized, updated_at: new Date().toISOString() },
        { onConflict: 'site_id,key' }
      );

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save-content error:', err.message);
    return res.status(500).json({ error: 'Failed to save content: ' + err.message });
  }
};
