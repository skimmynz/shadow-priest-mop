// ======= Raids, Encounters & UI State =======
const raids = [
  {
    name: "Mogu'shan Vaults",
    slug: "msv",
    encounters: {
      "The Stone Guard": 1395,
      "Feng the Accursed": 1390,
      "Gara'jal the Spiritbinder": 1434,
      "The Spirit Kings": 1436,
      "Elegon": 1500,
      "Will of the Emperor": 1407
    }
  },
  {
    name: "Heart of Fear",
    slug: "hof",
    // Coming soon: add encounter IDs when live
    // Imperial Vizier Zor'lok: ?, Blade Lord Ta'yak: ?, Garalon: ?,
    // Wind Lord Mel'jarak: ?, Amber-Shaper Un'sok: ?, Grand Empress Shek'zeer: ?
    encounters: {
      // "Imperial Vizier Zor'lok": 0,
      // "Blade Lord Ta'yak": 0,
      // "Garalon": 0,
      // "Wind Lord Mel'jarak": 0,
      // "Amber-Shaper Un'sok": 0,
      // "Grand Empress Shek'zeer": 0
    }
  },
  {
    name: "Terrace of Endless Spring",
    slug: "toes",
    // Coming soon: add encounter IDs when live
    // Protectors of the Endless: ?, Tsulong: ?, Lei Shi: ?, Sha of Fear: ?
    encounters: {
      // "Protectors of the Endless": 0,
      // "Tsulong": 0,
      // "Lei Shi": 0,
      // "Sha of Fear": 0
    }
  }
];

const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');
let lastUpdatedEl = document.getElementById('last-updated');

// Controls
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const refreshBtn = document.getElementById('refresh-btn');

// Current selection
let currentRaidSlug = null;
let currentEncounterId = null;
let currentEncounterName = null;

// Keep raw data for re-renders with filters/sorts without re-fetch
const dataCacheInMemory = new Map(); // encounterId -> { data, when }

// ======= Ensure "Last updated" exists =======
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

// ======= Client Cache (localStorage) =======
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;

// Netlify function endpoint
const API_URL = (encounterId) => `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// ======= Talents =======
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
// API → UI normalization
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind"
};

const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a, b) => a - b);
const VALID_TALENT_SET = new Set(Object.values(talentTiers).flat());
const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const [tier, talents] of Object.entries(talentTiers)) {
    for (const t of talents) m.set(t, Number(tier));
  }
  return m;
})();

const getSpellId = (name) => talentSpellIds[name] || 0;
const getTalentDisplayName = (apiName) => talentNameMap[apiName] || apiName;
const talentIconUrl = (name) => {
  const iconKey = talentIcons[name] || "inv_misc_questionmark";
  return `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
};

// ======= Utilities =======
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  if (!isoOrEpoch) {
    lastUpdatedEl.textContent = '';
    return;
  }
  const when = new Date(isoOrEpoch).toLocaleString();
  const ago = formatAgo(isoOrEpoch);
  lastUpdatedEl.textContent = `Last updated: ${when} (${ago})`;
}

// LocalStorage cache helpers
function readCache(encounterId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(encounterId));
    if (!raw) return null;
    return JSON.parse(raw); // { data, cachedAt }
  } catch { return null; }
}
function writeCache(encounterId, data, cachedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data, cachedAt }));
  } catch { /* ignore */ }
}
function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return (Date.now() - ts) < CACHE_TTL_MS;
  } catch { return false; }
}

// ======= Slug + Hash helpers (new: #raid/boss-encounterId) with legacy support =======
function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}
// Find raid by slug
function getRaidBySlug(slug) {
  return raids.find(r => r.slug === slug) || null;
}
function findRaidByEncounterId(encounterId) {
  for (const r of raids) {
    for (const id of Object.values(r.encounters)) {
      if (id === encounterId) return r;
    }
  }
  return null;
}
function hashFor(raidSlug, bossName, encounterId) {
  return `#${raidSlug}/${slugify(bossName)}-${encounterId}`;
}
function updateHash(raidSlug, bossName, encounterId) {
  history.replaceState(null, '', hashFor(raidSlug, bossName, encounterId));
}
// Parse hash: supports
// 1) #raidSlug/bossSlug-1234   (new)
// 2) #bossSlug-1234            (legacy v2 - infer raid by id)
// 3) #e-1234                   (legacy v1)
function parseHash() {
  const h = location.hash || '';
  let m = h.match(/^#([a-z0-9-]+)\/([a-z0-9-]+)-(\d+)$/i);
  if (m) return { raidSlug: m[1].toLowerCase(), bossSlug: m[2].toLowerCase(), id: parseInt(m[3], 10), legacy: false, shape: 'raid-boss' };
  m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
  if (m) return { raidSlug: null, bossSlug: m[1].toLowerCase(), id: parseInt(m[2], 10), legacy: true, shape: 'boss-only' };
  m = h.match(/^#e-(\d+)$/i);
  if (m) return { raidSlug: null, bossSlug: 'e', id: parseInt(m[1], 10), legacy: true, shape: 'e-id' };
  return null;
}

// ======= UI Builders (tabs + bosses) =======
const raidTabsDiv = document.getElementById('raid-tabs');

function buildRaidTabs() {
  raidTabsDiv.innerHTML = '';
  for (const r of raids) {
    const b = document.createElement('button');
    b.className = 'raid-tab';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.raidSlug = r.slug;
    b.textContent = r.name;
    b.addEventListener('click', () => {
      if (currentRaidSlug === r.slug) return;
      selectRaid(r.slug, { setHash: true });
    });
    raidTabsDiv.appendChild(b);
  }
}
function setActiveRaidTab(slug) {
  raidTabsDiv.querySelectorAll('.raid-tab').forEach(t => t.classList.toggle('active', t.dataset.raidSlug === slug));
}

function populateBossButtons(raidSlug) {
  bossButtonsDiv.innerHTML = '';
  const raid = getRaidBySlug(raidSlug);
  if (!raid) return;

  const entries = Object.entries(raid.encounters);
  if (entries.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.style.color = '#bbb';
    placeholder.style.margin = '10px 0 18px';
    placeholder.textContent = 'Coming soon — bosses for this raid will appear here.';
    bossButtonsDiv.appendChild(placeholder);
    rankingsDiv.innerHTML = `
      <div style="text-align:center; padding:16px; color:#bbb;">
        Choose another raid (MSV) for live data.
      </div>`;
    updateLastUpdated('');
    return;
  }

  for (const [bossName, id] of entries) {
    const button = document.createElement('button');
    button.dataset.encounterId = String(id);
    button.dataset.bossName = bossName;
    button.dataset.raidSlug = raidSlug;

    const img = document.createElement('img');
    img.src = `https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2`;
    img.alt = bossName;
    img.className = 'boss-icon';
    img.loading = 'lazy';

    const span = document.createElement('span');
    span.textContent = bossName;

    button.appendChild(img);
    button.appendChild(span);

    button.addEventListener('click', () => {
      selectActiveBoss(id);
      currentEncounterId = id;
      currentEncounterName = bossName;
      currentRaidSlug = raidSlug;
      updateHash(raidSlug, bossName, id);
      fetchAndDisplayRankings(bossName, id);
    });

    bossButtonsDiv.appendChild(button);
  }
}
function selectActiveBoss(encounterId) {
  bossButtonsDiv.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  const active = bossButtonsDiv.querySelector(`button[data-encounter-id="${encounterId}"]`);
  if (active) active.classList.add('active');
}

// ======= Sorting & Searching =======
function getCurrentSort() { return sortSelect?.value || 'dps-desc'; }
function sortRankings(rows, mode) {
  const clone = rows.slice();
  switch (mode) {
    case 'dps-asc':
      clone.sort((a, b) => (a.total ?? -Infinity) - (b.total ?? -Infinity));
      break;
    case 'name-az':
      clone.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      break;
    case 'name-za':
      clone.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
      break;
    case 'dps-desc':
    default:
      clone.sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity));
  }
  return clone;
}
function filterRankings(rows, term) {
  if (!term) return rows;
  const t = term.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter(r => (r?.name ?? '').toLowerCase().includes(t));
}

// ======= Render =======
function render(name, data) {
  // Save raw for re-renders with filters/sorts
  if (currentEncounterId != null) {
    dataCacheInMemory.set(currentEncounterId, { data, when: Date.now() });
  }

  const rankingsRaw = Array.isArray(data?.rankings) ? data.rankings : [];

  // Apply search + sort
  const term = searchInput?.value || '';
  const sortMode = getCurrentSort();
  const filtered = filterRankings(rankingsRaw, term);
  const rankings = sortRankings(filtered, sortMode);

  // ---- Talent aggregation over 'rankings' (post-filter) ----
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

  // ---- Talent summary UI ----
  let talentSummary = `<div class="talent-summary" role="group" aria-label="Talent usage summary for ${escapeHtml(name)}">`;
  for (const tier of TIER_ORDER) {
    talentSummary += `<div class="talent-row" data-tier="${tier}" role="group" aria-label="Tier ${tier}">`;
    for (const talent of talentTiers[tier]) {
      const count = tierCounts[tier][talent] || 0;
      const total = totalPerTier[tier] || 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);

      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : `https://www.wowhead.com/`;

      talentSummary += `
        <a class="talent-link" href="${wowheadUrl}" target="_blank" rel="noopener" aria-label="${escapeHtml(talent)}: ${percent}%">
          <img class="talent-icon-img" src="${iconUrl}" alt="${escapeHtml(talent)} icon" loading="lazy">
          <div class="talent-percent">${percent}%</div>
        </a>`;
    }
    talentSummary += `</div>`;
  }
  talentSummary += `</div>`;

  // ---- Rankings list (top 100 of filtered set) ----
  const entries = rankings.slice(0, 100).map((r, i) => {
    const talents = Array.isArray(r?.talents) ? r.talents : [];
    const talentIconsHTML = talents
      .map(t => ({ ...t, name: getTalentDisplayName(t.name) }))
      .filter(t => VALID_TALENT_SET.has(t.name))
      .map(t => {
        const iconUrl = talentIconUrl(t.name);
        const spellId = getSpellId(t.name);
        const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : `https://www.wowhead.com/`;
        return `
          <a class="talent-link" href="${wowheadUrl}" target="_blank" rel="noopener" aria-label="${escapeHtml(t.name)}">
            <img class="talent-icon-img" src="${iconUrl}" alt="${escapeHtml(t.name)} icon" loading="lazy">
          </a>`;
      })
      .join('');

    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const playerName = escapeHtml(r?.name ?? 'Unknown');

    return `
      <div class="rank-entry">
        <div class="name-wrapper">
          <a class="player-link" href="${reportUrl}" target="_blank" rel="noopener">
            ${i + 1}. ${playerName} – ${dps} DPS
          </a>
        </div>
        <div class="talent-row" aria-label="Talents for ${playerName}">
          ${talentIconsHTML}
        </div>
      </div>`;
  }).join('');

  rankingsDiv.innerHTML = `${talentSummary}${entries}`;
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
async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  // If we already have raw data in memory and not forcing, re-render with filters immediately
  const mem = dataCacheInMemory.get(encounterId);
  if (mem && !force) {
    render(name, mem.data);
  }

  // Abort in-flight
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // LocalStorage cache
  const cached = readCache(encounterId);
  const cachedAtServer = cached?.data?.cachedAt;
  const cachedAtLocal  = cached?.cachedAt;
  const cachedAtToShow = cachedAtServer || cachedAtLocal;
  const freshEnough = cached && isFresh(cachedAtToShow);

  if (freshEnough && !force) {
    updateLastUpdated(cachedAtToShow);
    render(name, cached.data);
    return;
  }

  // Loading indicator
  updateLastUpdated(cachedAtToShow);
  rankingsDiv.innerHTML = `<div style="text-align:center; padding:16px; color:#bbb;">Loading...</div>`;
  disableButtons(true);

  try {
    const res = await fetch(API_URL(encounterId), { signal: currentController.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const serverCachedAt = data?.cachedAt
      || res.headers.get('x-last-updated')
      || new Date().toISOString();

    writeCache(encounterId, data, serverCachedAt);
    updateLastUpdated(serverCachedAt);
    render(name, data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Error fetching logs:', err);
    rankingsDiv.innerHTML = `
      <div style="text-align:center; padding:16px; color:#ff8080;">
        Failed to load logs. ${escapeHtml(err.message || '')}
      </div>`;
  } finally {
    disableButtons(false);
  }
}

// ======= Selection helpers =======
function selectRaid(raidSlug, { setHash = false } = {}) {
  const raid = getRaidBySlug(raidSlug) || raids[0];
  currentRaidSlug = raid.slug;
  setActiveRaidTab(raid.slug);
  populateBossButtons(raid.slug);

  // Choose boss (prefer existing ID if it belongs to this raid)
  let targetName, targetId;
  const entries = Object.entries(raid.encounters);
  if (currentEncounterId && entries.some(([, id]) => id === currentEncounterId)) {
    // Keep current
    targetId = currentEncounterId;
    targetName = entries.find(([, id]) => id === currentEncounterId)[0];
  } else if (entries.length > 0) {
    // First boss of this raid
    [targetName, targetId] = entries[0];
  } else {
    // No bosses yet
    currentEncounterId = null;
    currentEncounterName = null;
    if (setHash) history.replaceState(null, '', `#${raid.slug}`);
    return;
  }

  selectActiveBoss(targetId);
  currentEncounterId = targetId;
  currentEncounterName = targetName;
  if (setHash) updateHash(raid.slug, targetName, targetId);
  fetchAndDisplayRankings(targetName, targetId);
}

// ======= Hash routing (open from URL) =======
function openFromHashOrDefault() {
  const parsed = parseHash();

  if (parsed) {
    // Find raid
    let raid = parsed.raidSlug ? getRaidBySlug(parsed.raidSlug) : null;
    if (!raid) raid = findRaidByEncounterId(parsed.id) || raids[0];

    setActiveRaidTab(raid.slug);
    populateBossButtons(raid.slug);

    // Try to find boss by id inside chosen raid
    const entry = Object.entries(raid.encounters).find(([, id]) => id === parsed.id);

    if (entry) {
      const [bossName, eid] = entry;
      currentRaidSlug = raid.slug;

      // Migrate hash to canonical format if needed
      const desired = hashFor(raid.slug, bossName, eid);
      if (location.hash !== desired) updateHash(raid.slug, bossName, eid);

      selectActiveBoss(eid);
      currentEncounterId = eid;
      currentEncounterName = bossName;
      fetchAndDisplayRankings(bossName, eid);
      return;
    }

    // If the raid has no bosses yet, just show placeholder
    if (Object.keys(raid.encounters).length === 0) {
      currentRaidSlug = raid.slug;
      updateLastUpdated('');
      return;
    }
  }

  // Default: first raid's first boss
  const defaultRaid = raids[0];
  currentRaidSlug = defaultRaid.slug;
  setActiveRaidTab(defaultRaid.slug);
  populateBossButtons(defaultRaid.slug);

  const first = Object.entries(defaultRaid.encounters)[0];
  if (!first) {
    rankingsDiv.innerHTML = `<div style="text-align:center; padding:16px; color:#bbb;">No bosses available.</div>`;
    return;
  }
  const [bossName, eid] = first;
  selectActiveBoss(eid);
  currentEncounterId = eid;
  currentEncounterName = bossName;
  updateHash(defaultRaid.slug, bossName, eid);
  fetchAndDisplayRankings(bossName, eid);
}

window.addEventListener('hashchange', () => {
  openFromHashOrDefault();
});

// ======= Controls wiring =======
function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
if (searchInput) {
  searchInput.addEventListener('input', debounce(() => {
    if (currentEncounterId == null) return;
    const mem = dataCacheInMemory.get(currentEncounterId);
    if (mem) render(currentEncounterName || '', mem.data);
  }, 120));
}
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    if (currentEncounterId == null) return;
    const mem = dataCacheInMemory.get(currentEncounterId);
    if (mem) render(currentEncounterName || '', mem.data);
  });
}
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    if (currentEncounterId == null) return;
    fetchAndDisplayRankings(currentEncounterName || '', currentEncounterId, { force: true });
  });
}

// ======= Build & Launch =======
function buildRaidTabs() {
  raidTabsDiv.innerHTML = '';
  for (const r of raids) {
    const b = document.createElement('button');
    b.className = 'raid-tab';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.raidSlug = r.slug;
    b.textContent = r.name;
    b.addEventListener('click', () => {
      if (currentRaidSlug === r.slug) return;
      selectRaid(r.slug, { setHash: true });
    });
    raidTabsDiv.appendChild(b);
  }
}
function setActiveRaidTab(slug) {
  document.querySelectorAll('.raid-tab').forEach(t => t.classList.toggle('active', t.dataset.raidSlug === slug));
}

buildRaidTabs();
openFromHashOrDefault();
