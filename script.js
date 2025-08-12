// Shadow Priest Rankings – MoP Classic
// ======= Raids, Encounters & Talent Data =======
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
      "Will of the Emperor": 1407,
    },
  },
  hof: { short: 'HoF', name: 'Heart of Fear', encounters: {} },
  toes: { short: 'ToES', name: 'Terrace of Endless Spring', encounters: {} },
};

// Current raid selection (default to MSV)
let currentRaidKey = 'msv';

// --- FIX: State Management for Search ---
// This will store the full list of rankings for the current boss.
let allRankings = [];
// This will store the name of the currently selected boss for rendering.
let currentBossName = '';

// DOM refs
const raidMenu = document.getElementById('raid-menu');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');
const searchInput = document.getElementById('search-input');
const copyBtn = document.getElementById('copy-link-btn');

// Ensure there is a centered "Last updated" element under the main H1.
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

// ======= Cache config (client-side) =======
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;
const API_URL = (encounterId) => `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// ======= Warcraft talents (MoP Classic) =======
const talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"],
};
const talentIcons = {
  "Void Tendrils": "spell_priest_voidtendrils", "Psyfiend": "spell_priest_psyfiend", "Dominate Mind": "spell_shadow_shadowworddominate", "Body and Soul": "spell_holy_symbolofhope", "Angelic Feather": "ability_priest_angelicfeather", "Phantasm": "ability_priest_phantasm", "From Darkness, Comes Light": "spell_holy_surgeoflight", "Mindbender": "spell_shadow_soulleech_3", "Solace and Insanity": "ability_priest_flashoflight", "Desperate Prayer": "spell_holy_testoffaith", "Spectral Guise": "spell_priest_spectralguise", "Angelic Bulwark": "ability_priest_angelicbulwark", "Twist of Fate": "spell_shadow_mindtwisting", "Power Infusion": "spell_holy_powerinfusion", "Divine Insight": "spell_priest_burningwill", "Cascade": "ability_priest_cascade", "Divine Star": "spell_priest_divinestar", "Halo": "ability_priest_halo",
};
const talentSpellIds = {
  "Void Tendrils": 108920, "Psyfiend": 108921, "Dominate Mind": 605, "Body and Soul": 64129, "Angelic Feather": 121536, "Phantasm": 108942, "From Darkness, Comes Light": 109186, "Mindbender": 123040, "Solace and Insanity": 129250, "Desperate Prayer": 19236, "Spectral Guise": 112833, "Angelic Bulwark": 108945, "Twist of Fate": 109142, "Power Infusion": 10060, "Divine Insight": 109175, "Cascade": 121135, "Divine Star": 110744, "Halo": 120517,
};

// API → UI name normalization
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light", "Mind Control": "Dominate Mind",
};

// ======= Precomputed helpers =======
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
const talentIconUrl = (name) => {
  const iconKey = talentIcons[name] ?? "inv_misc_questionmark";
  return `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
};

// ======= Slug & Hash helpers (fixed regexes) =======
function slugify(str) { return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-'); }
function hashFor(name, encounterId) { return `#${slugify(name)}-${encounterId}`; }
function updateHash(name, encounterId) { try { history.replaceState(null, '', hashFor(name, encounterId)); } catch {} }
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
  if (!raidMenu) return;
  raidMenu.innerHTML = '';
  for (const [key, raid] of Object.entries(RAIDS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.raidKey = key;
    const img = document.createElement('img');
    img.src = `public/images/${key}.webp`;
    img.alt = raid.short;
    img.className = 'raid-icon';
    img.loading = 'lazy';
    const span = document.createElement('span');
    span.textContent = raid.short;
    btn.append(img, span);
    btn.addEventListener('click', () => {
      if (currentRaidKey === key) return;
      currentRaidKey = key;
      selectActiveRaid(key);
      buildBossButtonsForRaid(key);
      const entries = Object.entries(RAIDS[key].encounters);
      if (entries.length > 0) {
        const [bossName, encounterId] = entries[0];
        selectActiveButton(encounterId);
        updateHash(bossName, encounterId);
        fetchAndDisplayRankings(bossName, encounterId);
      } else {
        rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${raid.name} yet.</div>`;
        updateLastUpdated(null);
      }
    });
    raidMenu.appendChild(btn);
  }
  selectActiveRaid(currentRaidKey);
}

function selectActiveRaid(raidKey) {
  raidMenu?.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
  const active = raidMenu?.querySelector(`button[data-raid-key="${raidKey}"]`);
  active?.classList.add('active');
}

function buildBossButtonsForRaid(raidKey) {
  if (!bossButtonsDiv) return;
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
    button.append(img, span);
    button.addEventListener('click', () => {
      selectActiveButton(id);
      updateHash(name, id);
      fetchAndDisplayRankings(name, id);
    });
    bossButtonsDiv.appendChild(button);
  }
}

function selectActiveButton(encounterId) {
  bossButtonsDiv?.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
  const active = bossButtonsDiv?.querySelector(`button[data-encounter-id="${encounterId}"]`);
  active?.classList.add('active');
}

function findRaidKeyByEncounterId(encounterId) {
  for (const [key, raid] of Object.entries(RAIDS)) {
    if (Object.values(raid.encounters).includes(encounterId)) return key;
  }
  return null;
}

// ======= Cache helpers =======
function readCache(encounterId) { try { const raw = localStorage.getItem(CACHE_KEY(encounterId)); if (!raw) return null; return JSON.parse(raw); } catch { return null; } }
function writeCache(encounterId, data, cachedAt = new Date().toISOString()) { try { localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data, cachedAt })); } catch {} }
function isFresh(cachedAt) { try { const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt); return Date.now() - ts < CACHE_TTL_MS; } catch { return false; } }
function formatAgo(dateish) {
  const ms = Date.now() - (typeof dateish === 'number' ? dateish : Date.parse(dateish));
  if (isNaN(ms)) return 'unknown';
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
  bossButtonsDiv?.querySelectorAll('button').forEach((btn) => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.7' : '';
    btn.style.cursor = disabled ? 'not
