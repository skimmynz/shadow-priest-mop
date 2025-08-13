// netlify/functions/get-db.js
export async function handler(event) {
  try {
    const file = (event.queryStringParameters?.file || '').toLowerCase();
    // Pin to the exact references you provided (feature/shadow branch)
    const URLS = {
      db:       'https://raw.githubusercontent.com/wowsims/mop/refs/heads/feature/shadow/assets/database/db.json',
      reforges: 'https://raw.githubusercontent.com/wowsims/mop/refs/heads/feature/shadow/assets/db_inputs/wowhead_reforge_stats.json',
    };
    const url = URLS[file];
    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: 'unknown file' }) };
    }

    const res = await fetch(url, { headers: { 'user-agent': 'spriest-breakpoint-checker' }});
    if (!res.ok) throw new Error(`Upstream ${res.status} ${res.statusText}`);
    const text = await res.text();

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',            // 5 min edge cache
        'access-control-allow-origin': '*',                // allow local dev
      },
      body: text,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
