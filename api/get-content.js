// api/get-content.js
// Returns all portfolio content from Supabase.
// Publicly readable — no auth required (it's just the site's display data).

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('portfolio_content')
      .select('key, value')
      .eq('site_id', 'main');

    if (error) throw error;

    // Convert rows [{key, value}] into a single flat object {key: value}
    const content = {};
    (data || []).forEach(row => {
      try { content[row.key] = JSON.parse(row.value); }
      catch { content[row.key] = row.value; }
    });

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json(content);
  } catch (err) {
    console.error('get-content error:', err.message);
    // Return empty object so site still loads with defaults
    return res.status(200).json({});
  }
};
