// ======= Raids, Encounters & Talent Data =======

// Group encounters by raid (fill in HoF/ToES IDs when ready)
const RAIDS = {
  msv: {
    short: 'MSV',
    name: "Mogu'shan Vaults",
    encounters: {
      "The Stone Guard": 1395,
      "Feng the Accursed": 1390,
      "Gara'jal the Spiritbinder": 1434,
      "The Spirit Kings": 1436,
      "Elegon": 1500,
      "Will of the Emperor": 1407
    }
  },
  hof: {
    short: 'HoF',
    name: 'Heart of Fear',
    encounters: {
      // TODO: add IDs when you’re ready, for example:
      // "Imperial Vizier Zor'lok":  /* id */,
      // "Blade Lord Ta'yak":        /* id */,
      // "Garalon":                   /* id */,
      // "Wind Lord Mel'jarak":       /* id */,
      // "Amber-Shaper Un'sok":       /* id */,
      // "Grand Empress Shek'zeer":   /* id */
    }
  },
  toes: {
    short: 'ToES',
    name: 'Terrace of Endless Spring',
    encounters: {
      // TODO: add IDs when you’re ready, for example:
      // "Protectors of the Endless": /* id */,
      // "Tsulong":                    /* id */,
      // "Lei Shi":                    /* id */,
      // "Sha of Fear":                /* id */
    }
  }
};

// Current raid selection (default to MSV)
let currentRaidKey = 'msv';

// DOM refs
const raidMenu = document.getElementById('raid-menu');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');

// Ensure there is a centered "Last updated" element under the main H1.
// (Your original script already added/fell back if missing.)  [SOURCE] citeturn1search1
let lastUpdatedEl = document.getElementById('last-updated');
(function ensureLastUpdatedSlot() {
  if (!lastUpdatedEl) {
    const h1 = document.querySelector('h1');
    if (h1) {
      lastUpdatedEl = document.createElement('div');
      lastUpdatedEl.id = 'last-updated';
      lastUpdatedEl.className = 'last-updated';
      lastUpdatedEl.style.textAlign = 'center';
      lastUpdatedEl.style.color = '#bbb';
      lastUpdatedEl.style.margin = '8px 0 16px';
      h1.insertAdjacentElement('afterend', lastUpdatedEl);
    }
  }
})();

// Cache config (client-side)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;

// API endpoint (Netlify function)
const API_URL = (encounterId) =>
  `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// Warcraft talents data
const talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"],
};

const talentIcons = {
  "Void Tendrils": "spell_priest_voidtendrils",
  Psyfiend: "spell_priest_psyfiend",
  "Dominate Mind": "spell_shadow_shadowworddominate",
  "Body and Soul": "spell_holy_symbolofhope",
  "Angelic Feather": "ability_priest_angelicfeather",
  Phantasm: "ability_priest_phantasm",
  "From Darkness, Comes Light": "spell_holy_surgeoflight",
  Mindbender: "spell_shadow_soulleech_3",
  "Solace and Insanity": "ability_priest_flashoflight",
  "Desperate Prayer": "spell_holy_testoffaith",
  "Spectral Guise": "spell_priest_spectralguise",
  "Angelic Bulwark": "ability_priest_angelicbulwark",
  "Twist of Fate": "spell_shadow_mindtwisting",
  "Power Infusion": "spell_holy_powerinfusion",
  "Divine Insight": "spell_priest_burningwill",
  Cascade: "ability_priest_cascade",
  "Divine Star": "spell_priest_divinestar",
  Halo: "ability_priest_halo",
};

const talentSpellIds = {
  "Void Tendrils": 108920,
  Psyfiend: 108921,
  "Dominate Mind": 605,
  "Body and Soul": 64129,
  "Angelic Feather": 121536,
  Phantasm: 108942,
  "From Darkness, Comes Light": 109186,
  Mindbender: 123040,
  "Solace and Insanity": 129250,
  "Desperate Prayer": 19236,
  "Spectral Guise": 119898,
  "Angelic Bulwark": 108945,
  "Twist of Fate": 109142,
  "Power Infusion": 10060,
  "Divine Insight": 109175,
  Cascade: 121135,
  "Divine Star": 110744,
  Halo: 120517,
};

// API → UI name normalization
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind",
};

// ======= Precomputed helpers for speed & safety =======
const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a, b) => a - b);
const VALID_TALENT_SET = new Set(Object.values(talentTiers).flat());
const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const [tier, talents] of Object.entries(talentTiers)) {
    for (const t of talents) m.set(t, Number(tier));
  }
  return m;
})();

const getSpellId = (name) => talentSpellIds[name] ?? 0;
const getTalentDisplayName = (apiName) => talentNameMap[apiName] ?? apiName;

// NOTE: Your original function already used a question-mark fallback.  [SOURCE] citeturn1search1
const talentIconUrl = (name) => {
  const iconKey = talentIcons[name] ?? "inv_misc_questionmark";
  return `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
};

// ======= URL hash helpers (unchanged behavior) =======
function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}
function hashFor(name, encounterId) {
  return `#${slugify(name)}-${encounterId}`;
}
function updateHash(name, encounterId) {
  history.replaceState(null, '', hashFor(name, encounterId));
}
function parseHash() {
  const h = location.hash ?? '';
  const m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
  if (m) return { slug: m[1].toLowerCase(), id: parseInt(m[2], 10) };
  const legacy = h.match(/^#e-(\d+)$/i);
  if (legacy) return { slug: 'e', id: parseInt(legacy[1], 10), legacy: true };
  return null;
}

// ======= Raid Menu & Boss Buttons =======
function createRaidMenu() {
  raidMenu.innerHTML = '';
  for (const [key, raid] of Object.entries(RAIDS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.raidKey = key;
    btn.textContent = raid.short;
    btn.addEventListener('click', () => {
      if (currentRaidKey === key) return;
      currentRaidKey = key;
      selectActiveRaid(key);
      buildBossButtonsForRaid(key);

      // Choose first boss in this raid (or keep current if shared id)
      const entries = Object.entries(RAIDS[key].encounters);
      if (entries.length > 0) {
        const [bossName, encounterId] = entries[0];
        selectActiveButton(encounterId);
        updateHash(bossName, encounterId);
        fetchAndDisplayRankings(bossName, encounterId);
      } else {
        rankingsDiv.innerHTML = `
          <div style="text-align:center;color:#bbb;margin-top:16px;">
            No bosses added for ${raid.name} yet.
          </div>`;
        updateLastUpdated(null);
      }
    });
    raidMenu.appendChild(btn);
  }
  selectActiveRaid(currentRaidKey);
}

function selectActiveRaid(raidKey) {
  raidMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  const active = raidMenu.querySelector(`button[data-raid-key="${raidKey}"]`);
  if (active) active.classList.add('active');
}

function buildBossButtonsForRaid(raidKey) {
  bossButtonsDiv.innerHTML = '';
  const encounters = RAIDS[raidKey].encounters;
  for (const [name, id] of Object.entries(encounters)) {
    const button = document.createElement('button');
    button.dataset.encounterId = String(id);
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
      updateHash(name, id);
      fetchAndDisplayRankings(name, id);
    });

    bossButtonsDiv.appendChild(button);
  }
}

function selectActiveButton(encounterId) {
  const buttons = bossButtonsDiv.querySelectorAll('button');
  buttons.forEach(b => b.classList.remove('active'));
  const active = bossButtonsDiv.querySelector(
    `button[data-encounter-id="${encounterId}"]`
  );
  if (active) active.classList.add('active');
}

function findRaidKeyByEncounterId(encounterId) {
  for (const [key, raid] of Object.entries(RAIDS)) {
    for (const id of Object.values(raid.encounters)) {
      if (id === encounterId) return key;
    }
  }
  return null;
}

// ======= Cache helpers (same behavior as before) =======
function readCache(encounterId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(encounterId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeCache(encounterId, data, cachedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(
      CACHE_KEY(encounterId),
      JSON.stringify({ data, cachedAt })
    );
  } catch {}
}
function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return Date.now() - ts < CACHE_TTL_MS;
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
function updateLastUpdated(isoOrEpoch) {
  if (!lastUpdatedEl) return;
  if (!isoOrEpoch) { lastUpdatedEl.textContent = ''; return; }
  const when = new Date(isoOrEpoch).toLocaleString();
  const ago = formatAgo(isoOrEpoch);
  lastUpdatedEl.textContent = `Last updated: ${when} (${ago})`;
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

// NEW: Build a 6-icon row for a player's talents, with '?' for missing tiers.
function buildPlayerTalentIcons(playerTalentsRaw) {
  const chosenByTier = new Map(); // tier -> talentName
  const talents = Array.isArray(playerTalentsRaw) ? playerTalentsRaw : [];

  for (const t of talents) {
    const displayName = getTalentDisplayName(t.name);
    if (!VALID_TALENT_SET.has(displayName)) continue;
    const tier = TIER_BY_TALENT.get(displayName);
    // Keep the first seen per tier (or you could decide on a priority)
    if (tier && !chosenByTier.has(tier)) chosenByTier.set(tier, displayName);
  }

  const cells = TIER_ORDER.map((tier) => {
    const name = chosenByTier.get(tier) || null; // null -> '?'
    const iconUrl = talentIconUrl(name);
    const spellId = name ? getSpellId(name) : 0;
    const href = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : null;
    const title = name || 'Unknown (no data)';

    const img = `<img class="talent-icon-img" loading="lazy" src="${iconUrl}" alt="${title}" />`;
    if (href) {
      return `<a class="talent-link" href="${href}" target="_blank" rel="noopener">${img}<div class="talent-percent" aria-hidden="true"></div></a>`;
    }
    return `<span class="talent-link" title="${title}">${img}<div class="talent-percent" aria-hidden="true"></div></span>`;
  });

  return `<div class="talent-row">${cells.join('')}</div>`;
}

function render(name, data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];

  // ===== Aggregate talent usage (summary) =====
  const tierCounts = {};
  const totalPerTier = {};
  for (const tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (const talent of talentTiers[tier]) tierCounts[tier][talent] = 0;
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
  let talentSummary = `<div class="talent-summary">`;
  for (const tier of TIER_ORDER) {
    talentSummary += `<div class="talent-row">`;
    for (const talent of talentTiers[tier]) {
      const count = tierCounts[tier][talent] ?? 0;
      const total = totalPerTier[tier] ?? 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);
      const color =
        percentNum >= 75 ? 'limegreen' : percentNum <= 10 ? 'red' : 'orange';
      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId
        ? `https://www.wowhead.com/mop-classic/spell=${spellId}`
        : `https://www.wowhead.com/`;
      talentSummary += `
        <a class="talent-link" href="${wowheadUrl}" target="_blank" rel="noopener" title="${talent}">
          <img class="talent-icon-img" loading="lazy" src="${iconUrl}" alt="${talent}" />
          <div class="talent-percent" style="color:${color}">${percent}%</div>
        </a>`;
    }
    talentSummary += `</div>`;
  }
  talentSummary += `</div>`;

  // ===== Rankings list =====
  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';
    if (rank >= 2 && rank <= 25) return '#e268a8';
    return '#ff8000';
  };

  const entries = rankings.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const playerName = r?.name ?? 'Unknown';

    // Build a fixed 6-slot talent row for each player
    const perPlayerTalents = buildPlayerTalentIcons(r?.talents);

    return `
      <div class="rank-entry">
        <div class="name-wrapper">
          <a class="player-link" href="${reportUrl}" target="_blank" rel="noopener" style="color:${color}">
            ${i + 1}. ${playerName} – ${dps} DPS
          </a>
        </div>
        ${perPlayerTalents}
      </div>`;
  }).join('');

  rankingsDiv.innerHTML = `
    ${talentSummary}
    ${entries}
  `;
}

async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Check cache
  const cached = readCache(encounterId);
  const cachedAtServer = cached?.data?.cachedAt;   // if your function adds this
  const cachedAtLocal  = cached?.cachedAt;
  const cachedAtToShow = cachedAtServer ?? cachedAtLocal;
  const freshEnough = cached && isFresh(cachedAtToShow);

  if (freshEnough && !force) {
    updateLastUpdated(cachedAtToShow);
    render(name, cached.data);
    return;
  }

  updateLastUpdated(cachedAtToShow);
  rankingsDiv.innerHTML = `
    <div style="text-align:center;margin-top:16px;">Loading...</div>
  `;
  disableButtons(true);

  try {
    const res = await fetch(API_URL(encounterId), { signal: currentController.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Prefer server time if provided; else header; else now
    const serverCachedAt =
      data?.cachedAt ?? res.headers.get('x-last-updated') ?? new Date().toISOString();

    writeCache(encounterId, data, serverCachedAt);
    updateLastUpdated(serverCachedAt);
    render(name, data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Error fetching logs:', err);
    rankingsDiv.innerHTML = `
      <div style="text-align:center;color:#ff9c9c;margin-top:16px;">
        Failed to load logs. ${err.message ?? ''}
      </div>
    `;
  } finally {
    disableButtons(false);
  }
}

// ======= Init & deep-link handling =======
function openFromHashOrDefault() {
  const parsed = parseHash();
  // Build raid menu first (so tab highlighting works)
  createRaidMenu();

  if (parsed) {
    const raidKey = findRaidKeyByEncounterId(parsed.id) ?? 'msv';
    currentRaidKey = raidKey;
    selectActiveRaid(raidKey);
    buildBossButtonsForRaid(raidKey);

    const raid = RAIDS[raidKey];
    const entry = Object.entries(raid.encounters).find(([, id]) => id === parsed.id);
    if (entry) {
      const [bossName, encounterId] = entry;
      const desiredSlug = slugify(bossName);
      if (parsed.legacy ?? parsed.slug !== desiredSlug) updateHash(bossName, encounterId);
      selectActiveButton(encounterId);
      fetchAndDisplayRankings(bossName, encounterId);
      return;
    }
  }

  // Default = first raid with at least one boss
  for (const [key, raid] of Object.entries(RAIDS)) {
    const entries = Object.entries(raid.encounters);
    if (entries.length) {
      currentRaidKey = key;
      selectActiveRaid(key);
      buildBossButtonsForRaid(key);

      const [bossName, encounterId] = entries[0];
      selectActiveButton(encounterId);
      updateHash(bossName, encounterId);
      fetchAndDisplayRankings(bossName, encounterId);
      return;
    }
  }

  // If no raids have bosses yet
  buildBossButtonsForRaid(currentRaidKey);
  rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">
    No bosses configured yet.
  </div>`;
  updateLastUpdated(null);
}

window.addEventListener('hashchange', () => {
  const parsed = parseHash();
  if (!parsed) return;

  // If hash changed to a boss in another raid, switch tabs
  const raidKey = findRaidKeyByEncounterId(parsed.id);
  if (raidKey && raidKey !== currentRaidKey) {
    currentRaidKey = raidKey;
    selectActiveRaid(raidKey);
    buildBossButtonsForRaid(raidKey);
  }

  const raid = RAIDS[currentRaidKey];
  const entry = Object.entries(raid.encounters).find(([, eid]) => eid === parsed.id);
  if (!entry) return;

  const [bossName] = entry;
  const desiredSlug = slugify(bossName);
  if (parsed.slug !== desiredSlug) updateHash(bossName, parsed.id);

  selectActiveButton(parsed.id);
  fetchAndDisplayRankings(bossName, parsed.id);
});

// Boot up
openFromHashOrDefault();
