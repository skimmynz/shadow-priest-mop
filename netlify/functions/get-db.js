// netlify/functions/get-db.js
// Usage: /.netlify/functions/get-db?file=db  or  ?file=reforges
const SOURCES = {
  db: 'https://raw.githubusercontent.com/wowsims/mop/feature/shadow/assets/database/db.json',
  reforges:
    'https://raw.githubusercontent.com/wowsims/mop/feature/shadow/assets/db_inputs/wowhead_reforge_stats.json',
};

function isBossSource(src) {
  return !!(src && src.drop);
}
function itemIlvl(item) {
  const ilvl = item?.scalingOptions?.['0']?.ilvl ?? item?.ilvl;
  return typeof ilvl === 'number' ? ilvl : undefined;
}
function isMoPAllowedItem(item) {
  const exp = typeof item?.expansion === 'number' ? item.expansion : undefined;
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const hasBossDrop = sources.some(isBossSource);
  const ilvl = itemIlvl(item);

  if (exp === 5) return true;              // Explicitly MoP
  if (!hasBossDrop) return true;           // Crafted/vendor/etc.
  if (typeof ilvl === 'number' && ilvl >= 450) return true; // MoP raid/heroic
  return false;                            // Non‑MoP boss item
}
function filterDbForMoP(db) {
  const out = { ...db };
  if (Array.isArray(db.items)) out.items = db.items.filter(isMoPAllowedItem);
  return out; // gems/enchants kept
}

exports.handler = async (event) => {
  try {
    const file = event.queryStringParameters?.file || '';
    const src = SOURCES[file];
    if (!src) {
      return { statusCode: 400, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid ?file (db|reforges)' }) };
    }

    const r = await fetch(src, { redirect: 'follow' });
    if (!r.ok) {
      return { statusCode: 502, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: `Upstream error ${r.status}` }) };
    }

    const text = await r.text();

    if (file !== 'db') {
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        body: text,
      };
    }

    const db = JSON.parse(text);
    const filtered = filterDbForMoP(db);
    const count = Array.isArray(filtered.items) ? filtered.items.length : 0;

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-db-items': String(count), // debug
      },
      body: JSON.stringify(filtered),
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Server error', detail: String(err) }) };
  }
};
