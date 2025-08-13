// Returns the Wowhead reforge mapping JSON
export async function handler() {
  try {
    const url = 'https://raw.githubusercontent.com/wowsims/mop/refs/heads/feature/shadow/assets/db_inputs/wowhead_reforge_stats.json';
    const r = await fetch(url, { headers: { 'user-agent': 'spriest-breakpoint-checker' }});
    if (!r.ok) throw new Error(`Upstream ${r.status} ${r.statusText}`);
    const body = await r.text();

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': 'public, max-age=300, must-revalidate',
        'access-control-allow-origin': '*',
        'x-db-file': 'reforges',
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
}
