// --- Remote DBs (proxied through Netlify to avoid CORS and to pin versions) ---
const DB_URL       = '/.netlify/functions/get-db?file=db';
const REFORGE_URL  = '/.netlify/functions/get-db?file=reforges';

// MoP L90 conversion: 425 haste rating = 1% haste (0.01 fraction). Guides for MoP Classic confirm. 
// Haste sources (rating, raid/spec auras, racials) multiply, not add. 
// Reforging moves 40% of a secondary stat between eligible stats. 
// Sources: Warcraft Tavern (Spriest MoP), Wowpedia (Haste), Warcraft Tavern (Reforging) 
// [citations rendered when this page is shown to the user]
const RATING_PER_1PCT_HASTE = 425; 

// Breakpoints to check (always-on):
const BP_SWP_8TICK = 0.2497; // 24.97% — Shadow Word: Pain +2 ticks
const BP_VT_7TICK  = 0.3001; // 30.01% — Vampiric Touch +1 tick
// Blizzard stat IDs in the WoWSims DB (MoP)
const STAT_ID = { SPIRIT:6, DODGE:13, PARRY:14, HIT:31, CRIT:32, HASTE:36, EXPERTISE:37, MASTERY:49 };

const toNum = (x) => (typeof x === 'number' ? x : parseFloat(x) || 0);
const pct  = (x) => (x*100).toFixed(2) + '%';
const multiplyHaste = (...fractions) => fractions.reduce((m,f)=>m*(1+f),1) - 1;

// Simple race check (WoWSims MoP exports usually place a readable race string at exp.player.race)
function isGoblin(exp) {
  const r = (exp?.player?.race || '').toString().toLowerCase();
  return r.includes('goblin');
}

// MoP Shadow priests always grant the +5% spell haste aura to themselves via Mind Quickening/Shadowform.
function shadowPriestAlwaysOn() { return 0.05; }

// Optionally include a “raid spell haste” toggle if your export includes a shared aura bit.
// For this tool, we treat the priest’s own 5% as always-on and ignore other duplicate providers.
function raidSpellHaste(/* raidBuffs */) { return 0.0; }

async function loadDB() {
  const [db, reforges] = await Promise.all([
    fetch(DB_URL).then(r => r.json()),
    fetch(REFORGE_URL).then(r => r.json())
  ]);
  const mapById = (arr) => Object.fromEntries((arr||[]).map(o => [o.id, o]));
  return { items: mapById(db.items), gems: mapById(db.gems), enchants: mapById(db.enchants), reforges };
}

// Pulls secondary stats (including scaled variants) from an item row.
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
  const ref = db.reforges?.[String(slot?.reforging)];
  if (!ref) return hasteSoFar;

  // wowhead_reforge_stats.json uses i1 (from), i2 (to), v (ratio); MoP reforging moves 40%.
  const fromId = Number(ref.i1);
  const toId   = Number(ref.i2);
  const ratio  = toNum(ref.v || 0.40);

  const it = db.items[slot.id]; if (!it) return hasteSoFar;
  const base = itemSecondaries(it);
  const fromVal = toNum(base[fromId] || 0);
  if (fromVal <= 0) return hasteSoFar;

  const moved = Math.floor(fromVal * ratio); // in-game rounds down
  let haste = hasteSoFar;
  if (toId   === STAT_ID.HASTE) haste += moved;
  if (fromId === STAT_ID.HASTE) haste -= moved;
  return haste;
}

function computeHaste(exp, db) {
  const items = exp?.player?.equipment?.items || [];
  let hasteRating = 0;

  for (const slot of items) {
    if (!slot?.id) continue;
    let h = hasteFromSlot(slot, db);
    h = applyReforge(slot, db, h);
    hasteRating += h;
  }

  const ratingPercent = hasteRating / RATING_PER_1PCT_HASTE; // e.g., 4250 -> 10 (%)
  const ratingFrac    = ratingPercent / 100;                  // -> 0.10

  // Always-on sources for a Shadow Priest
  const specFrac     = shadowPriestAlwaysOn();        // +5%
  const racialFrac   = isGoblin(exp) ? 0.01 : 0.0;    // Goblin: Time is Money +1%
  const raidFrac     = raidSpellHaste(exp?.raidBuffs); // treat duplicates as 0 in this tool

  const finalFrac = multiplyHaste(ratingFrac, specFrac, racialFrac, raidFrac);

  return { hasteRating, ratingFrac, specFrac, racialFrac, raidFrac, finalFrac };
}

function deltaToBreakpoint(currentFrac, targetFrac) {
  return Math.max(0, targetFrac - currentFrac);
}

document.getElementById('checkBtn').addEventListener('click', async () => {
  let exp;
  try { exp = JSON.parse(document.getElementById('input').value.trim()); }
  catch { alert('Invalid JSON'); return; }

  const db = await loadDB();
  const { hasteRating, ratingFrac, specFrac, racialFrac, raidFrac, finalFrac } = computeHaste(exp, db);

  // Breakpoint checks
  const meets24 = finalFrac >= BP_SWP_8TICK;
  const meets30 = finalFrac >= BP_VT_7TICK;

  // “How much rating to the next BP?” (based on multiplicative stacking)
  const nextBP = !meets24 ? BP_SWP_8TICK : (!meets30 ? BP_VT_7TICK : null);
  let toNextText = 'You’ve met both tracked breakpoints.';
  if (nextBP !== null) {
    const neededFrac   = deltaToBreakpoint(finalFrac, nextBP);
    // Solve for extra rating fraction 'x' such that (1+ratingFrac+x)*(1+spec)*(1+racial)*(1+raid) - 1 = nextBP
    const multOthers   = (1+specFrac)*(1+racialFrac)*(1+raidFrac);
    const requiredR    = (1 + nextBP) / multOthers - 1;
    const extraR       = Math.max(0, requiredR - ratingFrac);
    const extraRating  = Math.ceil(extraR * 100 * RATING_PER_1PCT_HASTE); // back to rating
    toNextText = `Need ~${extraRating} more haste rating to reach ${pct(nextBP)}.`;
  }

  document.getElementById('result').innerHTML = `
    <div><strong>Total haste</strong> = ${pct(finalFrac)}</div>
    <div>From rating: ${pct(ratingFrac)} &nbsp;|&nbsp; Spec aura: ${pct(specFrac)} &nbsp;|&nbsp; Racial: ${pct(racialFrac)}${raidFrac>0 ? ` &nbsp;|&nbsp; Raid: ${pct(raidFrac)}`:''}</div>
    <div>Haste rating tallied: <code>${Math.round(hasteRating)}</code></div>
    <hr/>
    <div class="${meets24 ? 'ok':'bad'}">${meets24 ? '✔':'✘'} 24.97% (8‑tick SW:P)</div>
    <div class="${meets30 ? 'ok':'warn'}">${meets30 ? '✔':'✘'} 30.01% (7‑tick VT)</div>
    <div style="margin-top:.5rem">${toNextText}</div>
  `;
});
