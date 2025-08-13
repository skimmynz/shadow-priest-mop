// Data sources (static copies served by your site)
const DB_URL = '/data/db.json';
const REFORGE_URL = '/data/wowhead_reforge_stats.json';

// Level 90 MoP: 425 haste rating = 1% (0.01)
const RATING_PER_1PCT_HASTE = 425; // Warcraft Tavern MoP stat guide confirms 425/1% @90 [2](https://www.warcrafttavern.com/mop/guides/pve-shadow-priest-stat-priority-reforging/)

// Always-on breakpoints to check
const BP_SWP_8TICK = 0.2497; // 24.97% (8-tick SW:P) [2](https://www.warcrafttavern.com/mop/guides/pve-shadow-priest-stat-priority-reforging/)
const BP_VT_7TICK  = 0.3001; // 30.01% (7-tick VT)  [2](https://www.warcrafttavern.com/mop/guides/pve-shadow-priest-stat-priority-reforging/)

// Blizzard stat IDs in the WoWSims DB
const STAT_ID = { SPIRIT:6, DODGE:13, PARRY:14, HIT:31, CRIT:32, HASTE:36, EXPERTISE:37, MASTERY:49 };
const toNum = (x) => (typeof x === 'number' ? x : parseFloat(x) || 0);

async function loadDB() {
  const [db, reforges] = await Promise.all([fetch(DB_URL).then(r=>r.json()), fetch(REFORGE_URL).then(r=>r.json())]);
  const mapById = (arr) => Object.fromEntries((arr||[]).map(o => [o.id, o]));
  return { items: mapById(db.items), gems: mapById(db.gems), enchants: mapById(db.enchants), reforges };
}

function itemSecondaries(item) {
  const stats = item?.scalingOptions?.['0']?.stats || item?.stats || {};
  const out = {};
  for (const [k,v] of Object.entries(stats)) out[Number(k)] = toNum(v);
  return out;
}

function hasteFromSlot(slot, db) {
  let haste = 0;

  const it = db.items[slot.id];
  if (it) haste += toNum(itemSecondaries(it)[STAT_ID.HASTE] || 0);

  for (const gid of (slot.gems || [])) {
    const g = db.gems[gid]; if (!g) continue;
    const bag = g.stats || g?.scalingOptions?.['0']?.stats || {};
    haste += toNum(bag[STAT_ID.HASTE] || 0);
  }

  if (slot.enchant) {
    const e = db.enchants[slot.enchant];
    if (e) haste += toNum((e.stats || {})[STAT_ID.HASTE] || 0);
  }
  return haste;
}

function applyReforge(slot, db, hasteSoFar) {
  const ref = db.reforges?.[String(slot.reforging)];
  if (!ref) return hasteSoFar;

  const fromId = Number(ref.i1);
  const toId   = Number(ref.i2);
  const ratio  = toNum(ref.v || 0.4); // 40% reforged  [3](https://wowpedia.fandom.com/wiki/Reforging)

  const it = db.items[slot.id]; if (!it) return hasteSoFar;
  const base = itemSecondaries(it);
  const fromVal = toNum(base[fromId] || 0);
  if (fromVal <= 0) return hasteSoFar;

  const moved = Math.floor(fromVal * ratio);
  let haste = hasteSoFar;
  if (toId   === STAT_ID.HASTE) haste += moved;
  if (fromId === STAT_ID.HASTE) haste -= moved;
  return haste;
}

function raidSpellHaste(raidBuffs) {
  // Mind Quickening (Priest raid aura) = +5% spell haste if present [4](https://warcraftdb.com/mop/spell/49868)
  return raidBuffs?.mindQuickening ? 0.05 : 0.0;
}

function multiplyHaste(...fractions) { return fractions.reduce((m,f)=>m*(1+f),1)-1; }
const pct = (x) => (x*100).toFixed(2) + '%';

document.getElementById('checkBtn').addEventListener('click', async () => {
  let exp;
  try { exp = JSON.parse(document.getElementById('input').value.trim()); }
  catch { alert('Invalid JSON'); return; }

  const db = await loadDB();
  const items = exp?.player?.equipment?.items || [];
  const raid  = exp?.raidBuffs || {};

  // 1) Tally haste rating across all equipped items
  let hasteRating = 0;
  for (const slot of items) {
    if (!slot?.id) continue;
    let h = hasteFromSlot(slot, db);
    h = applyReforge(slot, db, h);
    hasteRating += h;
  }

  // 2) Convert rating -> fraction
  const ratingPercent = hasteRating / RATING_PER_1PCT_HASTE;  // e.g., 4250 -> 10 (%)
  const ratingFrac    = ratingPercent / 100;                   // -> 0.10

  // 3) Always-on raid aura
  const raidFrac = raidSpellHaste(raid); // 0.05 if Mind Quickening

  // (Optionally add racial 1% for Goblin here if you decide to count it always-on.)
  const finalFrac = multiplyHaste(ratingFrac, raidFrac);

  // 4) Breakpoint checks
  const meets24 = finalFrac >= BP_SWP_8TICK;
  const meets30 = finalFrac >= BP_VT_7TICK;

  // 5) Render
  document.getElementById('result').innerHTML = `
    <div><strong>Total haste</strong> = ${pct(finalFrac)}</div>
    <div>From rating: ${pct(ratingFrac)} &nbsp;|&nbsp; Raid aura: ${pct(raidFrac)}</div>
    <div>Haste rating tallied: <code>${Math.round(hasteRating)}</code></div>
    <hr/>
    <div class="${meets24 ? 'ok':'bad'}">${meets24 ? '✔':'✘'} 24.97% (8‑tick SW:P)</div>
    <div class="${meets30 ? 'ok':'warn'}">${meets30 ? '✔':'✘'} 30.01% (7‑tick VT)</div>
  `;
});
