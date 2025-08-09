// ======= Constants & Data =======
const encounters = {
  "The Stone Guard": 1395,
  "Feng the Accursed": 1390,
  "Gara'jal the Spiritbinder": 1434,
  "The Spirit Kings": 1436,
  "Elegon": 1500,
  "Will of the Emperor": 1407
};

const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');

// Cache config (client-side)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;

// API endpoint (Netlify function)
const API_URL = (encounterId) => `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// Warcraft talents data
const talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"]
};

const talentIcons = {
  "Void Tendrils": "spell_priest_voidtendrils",
  "Psyfiend": "spell_priest_psyfiend",
  "Dominate Mind": "spell_shadow_shadowworddominate",
  "Body and Soul": "spell_holy_symbolofhope",
  "Angelic Feather": "ability_priest_angelicfeather",
  "Phantasm": "ability_priest_phantasm",
  "From Darkness, Comes Light": "spell_holy_surgeoflight",
  "Mindbender": "spell_shadow_soulleech_3",
  "Solace and Insanity": "ability_priest_flashoflight",
  "Desperate Prayer": "spell_holy_testoffaith",
  "Spectral Guise": "spell_priest_spectralguise",
  "Angelic Bulwark": "ability_priest_angelicbulwark",
  "Twist of Fate": "spell_shadow_mindtwisting",
  "Power Infusion": "spell_holy_powerinfusion",
  "Divine Insight": "spell_priest_burningwill",
  "Cascade": "ability_priest_cascade",
  "Divine Star": "spell_priest_divinestar",
  "Halo": "ability_priest_halo"
};

const talentSpellIds = {
  "Void Tendrils": 108920,
  "Psyfiend": 108921,
  "Dominate Mind": 605,
  "Body and Soul": 64129,
  "Angelic Feather": 121536,
  "Phantasm": 108942,
  "From Darkness, Comes Light": 109186,
  "Mindbender": 123040,
  "Solace and Insanity": 129250,
  "Desperate Prayer": 19236,
  "Spectral Guise": 119898,
  "Angelic Bulwark": 108945,
  "Twist of Fate": 109142,
  "Power Infusion": 10060,
  "Divine Insight": 109175,
  "Cascade": 121135,
  "Divine Star": 110744,
  "Halo": 120517
};

// API → UI name normalization
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind"
};

// ======= Precomputed helpers for speed & safety =======
const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a, b) => a - b);
const VALID_TALENT_SET = new Set(Object.values(talentTiers).flat());

const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const [tier, talents] of Object.entries(talentTiers)) {
    for (const t of talents) m.set(t, tier); // string tier keys like "15"
  }
  return m;
})();

const getSpellId = (name) => talentSpellIds[name] || 0;
const getTalentDisplayName = (apiName) => talentNameMap[apiName] || apiName;

const talentIconUrl = (name) => {
  const iconKey = talentIcons[name] || "inv_misc_questionmark";
  return `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
};

// ======= Boss buttons =======
function createBossButtons() {
  for (const [name, id] of Object.entries(encounters)) {
    const button = document.createElement('button');
    button.dataset.encounterId = id;
    button.dataset.bossName = name;

    const img = document.createElement('img');
    img.src = `https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2`;
    img.alt = name;
    img.className = 'boss-icon';
    img.loading = 'lazy';

    const span = document.createElement('span');
    span.textContent = name;

    button.appendChild(img);
    button.appendChild(span);
    button.addEventListener('click', () => {
      selectActiveButton(id);
      updateHash(id);
      fetchAndDisplayRankings(name, id);
    });

    bossButtonsDiv.appendChild(button);
  }
}

function selectActiveButton(encounterId) {
  const buttons = bossButtonsDiv.querySelectorAll('button');
  buttons.forEach(b => b.classList.remove('active'));
  const active = bossButtonsDiv.querySelector(`button[data-encounter-id="${encounterId}"]`);
  if (active) active.classList.add('active');
}

// ======= Cache helpers =======
function readCache(encounterId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(encounterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // expected shape: { data, cachedAt } where cachedAt is ISO string or epoch
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(encounterId, data, cachedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data, cachedAt }));
  } catch {
    // storage full or disabled
  }
}

function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return (Date.now() - ts) < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function formatAgo(dateish) {
  const ms = Date.now() - (typeof dateish === 'number' ? dateish : Date.parse(dateish));
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ======= Fetch + Render =======
let currentController = null;

function disableButtons(disabled) {
  bossButtonsDiv.querySelectorAll('button').forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.7' : '';
    btn.style.cursor = disabled ? 'not-allowed' : '';
  });
}

function showLoading(name, cachedAtText) {
  rankingsDiv.innerHTML = `
    <h2>${name}</h2>
    ${cachedAtText ? `<div style="margin-bottom:8px;color:#bbb;">Last updated: ${cachedAtText}</div>` : ''}
    <p>Loading...</p>
  `;
}

function render(name, data, cachedAtText) {
  // Safety: ensure expected arrays exist
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];

  // ===== Aggregate talent usage (one per tier per player) =====
  const tierCounts = {};
  const totalPerTier = {};
  for (const tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (const talent of talentTiers[tier]) {
      tierCounts[tier][talent] = 0;
    }
  }

  for (const entry of rankings) {
    const seenTiers = new Set();
    const talents = Array.isArray(entry?.talents) ? entry.talents : [];
    for (const t of talents) {
      const displayName = getTalentDisplayName(t.name);
      if (!VALID_TALENT_SET.has(displayName)) continue;
      const tier = TIER_BY_TALENT.get(displayName);
      if (tier && !seenTiers.has(tier)) {
        tierCounts[tier][displayName]++;
        totalPerTier[tier]++;
        seenTiers.add(tier);
      }
    }
  }

  // ===== Talent summary UI =====
  let talentSummary = `<div class='talent-summary'>`;
  for (const tier of TIER_ORDER) {
    talentSummary += `<div class="talent-row">`;
    for (const talent of talentTiers[tier]) {
      const count = tierCounts[tier][talent] || 0;
      const total = totalPerTier[tier] || 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);
      const color = percentNum >= 75 ? 'limegreen' : percentNum <= 10 ? 'red' : 'orange';
      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : `https://www.wowhead.com/`;

      talentSummary += `
        <a target="_blank" href="${wowheadUrl}" class="talent-link" rel="noopener">
          <img src="${iconUrl}" class="talent-icon-img" alt="${talent}" title="${talent}">
          <div class="talent-percent" style="color:${color};">${percent}%</div>
        </a>
      `;
    }
    talentSummary += `</div>`;
  }
  talentSummary += `</div><br>`;

  // ===== Rankings list =====
  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';
    if (rank >= 2 && rank <= 25) return '#e268a8';
    return '#ff8000';
  };

  const entries = rankings.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    const talents = Array.isArray(r?.talents) ? r.talents : [];
    const talentIconsHTML = talents
      .map(t => ({ ...t, name: getTalentDisplayName(t.name) }))
      .filter(t => VALID_TALENT_SET.has(t.name))
      .map(t => {
        const iconUrl = talentIconUrl(t.name);
        const spellId = getSpellId(t.name);
        const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : `https://www.wowhead.com/`;
        return `
          <a target="_blank" href="${wowheadUrl}" class="talent-link" rel="noopener">
            <img src="${iconUrl}" class="talent-icon-img" alt="${t.name}" title="${t.name}">
          </a>
        `;
      }).join('');

    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const name = r?.name ?? 'Unknown';

    return `
      <div class="rank-entry" style="color:${color};">
        <div class="name-wrapper">
          <a target="_blank" href="${reportUrl}" class="player-link" rel="noopener">
            ${i + 1}. ${name} – ${dps} DPS
          </a>
        </div>
        <div class="talent-row">${talentIconsHTML}</div>
      </div>
    `;
  }).join('');

  rankingsDiv.innerHTML = `
    <h2>${name}</h2>
    ${cachedAtText ? `<div style="margin-bottom:8px;color:#bbb;">Last updated: ${cachedAtText}</div>` : ''}
    ${talentSummary}
    ${entries}
  `;
}

async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  // Abort any in-flight request
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Check cache
  const cached = readCache(encounterId);
  const cachedAtServer = cached?.data?.cachedAt; // If your Netlify function includes this
  const cachedAtLocal = cached?.cachedAt;
  const cachedAtToShow = cachedAtServer || cachedAtLocal;
  const freshEnough = cached && isFresh(cachedAtServer || cachedAtLocal);

  // Optimistic render from cache if fresh
  if (freshEnough && !force) {
    render(name, cached.data, `${new Date(cachedAtToShow).toLocaleString()} (${formatAgo(cachedAtToShow)})`);
    // Still try a background refresh if you want (optional)
    return;
  }

  showLoading(name, cachedAtToShow ? `${new Date(cachedAtToShow).toLocaleString()} (${formatAgo(cachedAtToShow)})` : '');

  disableButtons(true);
  try {
    const res = await fetch(API_URL(encounterId), { signal: currentController.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Prefer server time if provided, otherwise use now
    const serverCachedAt = data?.cachedAt || res.headers.get('x-last-updated') || new Date().toISOString();
    writeCache(encounterId, data, serverCachedAt);

    render(name, data, `${new Date(serverCachedAt).toLocaleString()} (${formatAgo(serverCachedAt)})`);
  } catch (err) {
    if (err.name === 'AbortError') return; // user navigated away quickly
    console.error('Error fetching logs:', err);
    rankingsDiv.innerHTML = `<p style="color:red;">Failed to load logs. ${err.message || ''}</p>`;
  } finally {
    disableButtons(false);
  }
}

// ======= URL hash sync (deep-linking) =======
function updateHash(encounterId) {
  history.replaceState(null, '', `#e-${encounterId}`);
}

function parseHash() {
  const m = location.hash.match(/#e-(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function openFromHashOrDefault() {
  const fromHash = parseHash();
  const entries = Object.entries(encounters);

  if (fromHash && entries.some(([, id]) => id === fromHash)) {
    const [bossName] = entries.find(([, id]) => id === fromHash);
    selectActiveButton(fromHash);
    fetchAndDisplayRankings(bossName, fromHash);
  } else {
    // default: first boss
    const [bossName, encounterId] = entries[0];
    selectActiveButton(encounterId);
    updateHash(encounterId);
    fetchAndDisplayRankings(bossName, encounterId);
  }
}

window.addEventListener('hashchange', () => {
  const id = parseHash();
  if (!id) return;
  const entry = Object.entries(encounters).find(([, eid]) => eid === id);
  if (!entry) return;
  const [name] = entry;
  selectActiveButton(id);
  fetchAndDisplayRankings(name, id);
});

// ======= Manual Refresh hook (optional UI) =======
// If you add a refresh button somewhere: <button id="refresh">Refresh</button>
// document.getElementById('refresh').addEventListener('click', () => {
//   const id = parseHash();
//   if (!id) return;
//   const [name] = Object.entries(encounters).find(([, eid]) => eid === id);
//   fetchAndDisplayRankings(name, id, { force: true });
// });

// ======= Init =======
createBossButtons();
openFromHashOrDefault();
