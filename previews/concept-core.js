// Shared calc core for Haste Calculator concept previews.
// Breakpoint data + formula mirror production js/haste.js (public WoW MoP Classic game data).

const BREAKPOINTS = {
  "Shadow Word: Pain": {
    id: 589, base: 6,
    points: [8.32, 24.97, 41.68, 58.35, 74.98, 91.63, 108.41, 124.97, 141.64, 158.29, 175.10, 191.69],
    ratings: [1345, 8085, 14846, 21596, 28325, 35066, 41855, 48561, 55308, 62045, 68852, 75564],
    goblinPoints: [7.25, 23.74, 40.27, 56.79, 73.25, 89.73, 106.34, 122.74, 139.25, 155.73, 172.38, 188.80],
    goblinRatings: [911, 7584, 14278, 20961, 27624, 34298, 41020, 47659, 54340, 61010, 67749, 74395],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
  },
  "Vampiric Touch": {
    id: 34914, base: 5,
    points: [9.99, 30.01, 49.96, 70.02, 90.05, 110.01, 129.97, 150.10, 169.91, 190.00, 210.08],
    ratings: [2021, 10124, 18200, 26318, 34427, 42505, 50585, 58733, 66748, 74880, 83008],
    goblinPoints: [8.90, 28.72, 48.48, 68.34, 88.17, 107.93, 127.70, 147.63, 167.23, 187.12, 207.01],
    goblinRatings: [1580, 9603, 17599, 25637, 33665, 41663, 49663, 57731, 65666, 73717, 81765],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
  },
  "Devouring Plague": {
    id: 2944, base: 6,
    points: [8.29, 24.92, 41.74, 58.35, 74.98, 91.75, 108.55, 124.97, 141.84, 158.06, 175.10, 191.97, 208.17, 225.20, 241.88, 257.78],
    ratings: [1330, 8064, 14873, 21596, 28325, 35115, 41914, 48561, 55387, 61955, 68852, 75679, 82235, 89130, 95881, 102317],
    goblinPoints: [7.21, 23.69, 40.34, 56.79, 73.25, 89.86, 106.49, 122.74, 139.44, 155.51, 172.38, 189.08, 205.12, 221.98, 238.50, 254.24],
    goblinRatings: [896, 7564, 14305, 20961, 27624, 34347, 41078, 47659, 54418, 60921, 67749, 74509, 81000, 87827, 94511, 100883],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_devouringplague.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=2944/devouring-plague"
  }
};

function clampRating(v) {
  return Math.min(parseFloat(String(v).replace(/\D/g, '')) || 0, 20000);
}

// state: {goblin, troll, pi, bloodlust, spd, berserking}
function compute(rating, state) {
  const baseMul = 1.05 * (state.goblin ? 1.01 : 1)
    * (state.pi ? 1.20 : 1)
    * (state.berserking ? 1.20 : 1)
    * (state.bloodlust ? 1.30 : 1)
    * (state.spd ? 1.30 : 1);
  const eff = ((1 + rating / 42500) * baseMul - 1) * 100;
  const gcdCap = state.goblin ? 17614 : 18215;
  return { eff, gcdCap, rating };
}

function thresholdPct(data, i, isGoblin) {
  if (isGoblin) {
    const g = data.goblinRatings ? data.goblinRatings[i] : null;
    if (g != null) return ((1 + g / 42500) * 1.05 * 1.01 - 1) * 100;
    return bpDisplayPct(data, i, true);
  }
  const base = data.ratings ? data.ratings[i] : null;
  if (base == null) return data.points[i];
  return ((1 + base / 42500) * 1.05 - 1) * 100;
}
function bpRating(data, i, isGoblin) {
  if (isGoblin) {
    const gr = data.goblinRatings ? data.goblinRatings[i] : null;
    return gr != null ? gr : calcRatingFromPct(data.goblinPoints[i], true);
  }
  const base = data.ratings ? data.ratings[i] : null;
  return base != null ? base : calcRatingFromPct(data.points[i], false);
}
function bpDisplayPct(data, i, isGoblin) {
  if (isGoblin) { const gp = data.goblinPoints ? data.goblinPoints[i] : null; return gp != null ? gp : data.points[i]; }
  return data.points[i];
}
function calcRatingFromPct(targetPct, isGoblin) {
  const baseMul = 1.05 * (isGoblin ? 1.01 : 1);
  return Math.max(0, Math.round(42500 * ((1 + targetPct / 100) / baseMul - 1)));
}

// Per-spell analysis at a given effective haste %.
// currentRating: the player's current haste rating, used for the rating-delta to next tick.
// Returns ticksNow (extra), next breakpoint %, rating, ratingDelta (rating still needed),
// progress (0-100 toward next), isMaxed, baseTicks, icon, url.
function analyze(spell, eff, isGoblin, currentRating) {
  const data = BREAKPOINTS[spell];
  let ticksNow = 0, nextPct = null, nextIdx = null;
  for (let i = 0; i < data.points.length; i++) {
    if (eff >= thresholdPct(data, i, isGoblin)) ticksNow++;
    else { nextPct = data.points[i]; nextIdx = i; break; }
  }
  const isMaxed = nextIdx === null;
  let progress = 100, nextRating = null, ratingDelta = 0, nextDisplayPct = null;
  if (!isMaxed) {
    const prevPct = data.points[ticksNow - 1] || 0;
    progress = Math.min(100, Math.max(0, ((eff - prevPct) / (nextPct - prevPct)) * 100));
    nextRating = bpRating(data, nextIdx, isGoblin);
    nextDisplayPct = bpDisplayPct(data, nextIdx, isGoblin);
    ratingDelta = Math.max(0, nextRating - (currentRating || 0));
  }
  return { spell, ticksNow, baseTicks: data.base, isMaxed, progress, nextPct, nextDisplayPct, nextRating, ratingDelta, icon: data.icon, url: data.url };
}
