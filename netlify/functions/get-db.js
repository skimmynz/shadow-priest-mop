// netlify/functions/get-db.js
export async function handler(event) {
  try {
    const file = (event.queryStringParameters?.file || '').toLowerCase();

    const URLS = {
      db:       'https://raw.githubusercontent.com/wowsims/mop/refs/heads/feature/shadow/assets/database/db.json',
      reforges: 'https://raw.githubusercontent.com/wowsims/mop/refs/heads/feature/shadow/assets/db_inputs/wowhead_reforge_stats.json',
    };

    const url = URLS[file];
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'access-control-allow-origin': '*',
          'x-db-file': String(file),
        },
        body: JSON.stringify({ error: 'unknown file', got: file }),
      };
    }

    const upstream = await fetch(url, { headers: { 'user-agent': 'spriest-breakpoint-checker' }});
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status} ${upstream.statusText}`);

    const text = await upstream.text();

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Browser should revalidate on each request while you iterate:
        'cache-control': 'public, max-age=0, must-revalidate',
        // Edge can cache for 5 minutes (varies by full URL incl. query):
        'netlify-cdn-cache-control': 'public, max-age=300, must-revalidate',
        'access-control-allow-origin': '*',
        // DEBUG: lets you confirm which branch was returned
        'x-db-file': file,
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify({ error: String(err) }),
    };
  }
}
