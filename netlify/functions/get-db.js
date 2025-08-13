// netlify/functions/get-db.js
// Usage:
//   /.netlify/functions/get-db?file=db
//   /.netlify/functions/get-db?file=reforges

const SOURCES = {
  db: 'https://raw.githubusercontent.com/wowsims/mop/feature/shadow/assets/database/db.json',
  reforges: 'https://raw.githubusercontent.com/wowsims/mop/feature/shadow/assets/db_inputs/wowhead_reforge_stats.json',
};

// Detect if a source entry is a boss drop
function isBossSource(src) {
  return !!(src && src.drop);
}

// Item is allowed if:
//  - expansion === 5 (MoP), OR
//  - it has no boss-drop sources (crafted/vendor/etc.)
function isMoPAllowedItem(item) {
  const exp = typeof item?.expansion === 'number' ? item.expansion : undefined;
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const hasBossDrop = sources.some(isBossSource);

  if (exp === 5) return true;          // MoP item
  if (!hasBossDrop) return true;       // not a boss drop -> keep
  return false;                        // boss drop but not MoP -> remove
}

function filterDbForMoP(db) {
  const out = { ...db };
  if (Array.isArray(db.items)) {
    out.items = db.items.filter(isMoPAllowedItem);
  }
  // Gems / enchants aren’t boss-dropped; keep as-is
  return out;
}

exports.handler = async (event) => {
  try {
    const file = event.queryStringParameters?.file || '';
    const src = SOURCES[file];
    if (!src) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid ?file (use: db | reforges)' }),
      };
    }

    const r = await fetch(src, { redirect: 'follow' });
    if (!r.ok) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: `Upstream error ${r.status}` }),
      };
    }

    const text = await r.text();
    let body = text;

    // Filter only when serving the DB
    if (file === 'db') {
      const db = JSON.parse(text);
      const filtered = filterDbForMoP(db);
      body = JSON.stringify(filtered);
    }

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Server error', detail: String(err) }),
    };
  }
};
