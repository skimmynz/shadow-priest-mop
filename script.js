// ======= Raids & Encounters =======
// MSV encounters (existing)
const MSV_ENCOUNTERS = {
  "The Stone Guard": 1395,
  "Feng the Accursed": 1390,
  "Gara'jal the Spiritbinder": 1434,
  "The Spirit Kings": 1436,
  "Elegon": 1500,
  "Will of the Emperor": 1407
};

// Registry of raids (only MSV has data for now)
const RAIDS = {
  msv: { key: 'msv', name: "Mogu'shan Vaults", encounters: MSV_ENCOUNTERS },
  hof: { key: 'hof', name: "Heart of Fear", encounters: null },
  toes:{ key: 'toes',name: "Terrace of Endless Spring", encounters: null }
};

// ======= DOM Handles =======
const raidTabsDiv    = document.getElementById('raid-tabs');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv    = document.getElementById('rankings');

// Ensure there is a centered "Last updated" line under the H1.
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

// ======= Cache config =======
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;
const API_URL = (encounterId) => `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// ======= Talents (unchanged data) =======
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
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind"
};

const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a,b)=>a-b);
const VALID_TALENT_SET = new Set(Object.values(talentTiers).flat());
const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const [tier, talents] of Object.entries(talentTiers)) {
    for (const t of talents) m.set(t, tier);
  }
  return m;
})();

const getSpellId = (name) => talentSpellIds[name] || 0;
const getTalentDisplayName = (apiName) => talentNameMap[apiName] || apiName;
const talentIconUrl = (name) => {
  const iconKey = talentIcons[name] || "inv_misc_questionmark";
  return `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
};

// ======= Slug/hash helpers (for MSV deep-links) =======
function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'').replace(/--+/g,'-');
}
function hashFor(name, encounterId) { return `#${slugify(name)}-${encounterId}`; }
function updateHash(name, encounterId) { history.replaceState(null, '', hashFor(name, encounterId)); }
function parseHash() {
  const h = location.hash || '';
  const m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
  if (m) return { slug: m[1].toLowerCase(), id: parseInt(m[2],10), legacy: false };
  const legacy = h.match(/^#e-(\d+)$/i);
  if (legacy) return { slug: 'e', id: parseInt(legacy[1],10), legacy: true };
  return null;
}

// ======= State =======
let currentController = null;
let encounters = MSV_ENCOUNTERS;    // points at the currently active raid’s encounters
let currentRaidKey = 'msv';

// ======= UI: Raid Tabs (NEW) =======
function createRaidTabs() {
  raidTabsDiv.innerHTML = ''; // clear
  Object.values(RAIDS).forEach(raid => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'raid-tab';
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected', raid.key === currentRaidKey ? 'true' : 'false');
    btn.textContent = raid.name;
    btn.addEventListener('click', () => setCurrentRaid(raid.key));
    if (raid.key === currentRaidKey) btn.classList.add('active');
    raidTabsDiv.appendChild(btn);
  });
}
function markActiveRaidTab() {
  raidTabsDiv.querySelectorAll('.raid-tab').forEach(btn => {
    const selected = btn.textContent === RAIDS[currentRaidKey].name;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

// ======= Boss buttons =======
function createBossButtons(encountersMap) {
  bossButtonsDiv.innerHTML = ''; // clear to avoid duplicates
  for (const [name, id] of Object.entries(encountersMap)) {
    const button = document.createElement('button');
    button.dataset.encounterId = String(id);
    button.dataset.bossName = name;

    const img = document.createElement('img');
    img.src = `https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2`;
    img.alt = name;
    img.className = 'boss-icon';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 40; img.height = 40;

    const span = document.createElement('span');
    span.textContent = name;

    button.appendChild(img);
    button.appendChild(span);
    button.addEventListener('click', () => {
      selectActiveButton(id);
      updateHash(name, id);            // enable deep-link for MSV only
      fetchAndDisplayRankings(name, id);
    });

    bossButtonsDiv.appendChild(button);
  }
}
function selectActiveButton(encounterId) {
  bossButtonsDiv.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  const active = bossButtonsDiv.querySelector(`button[data-encounter-id="${encounterId}"]`);
  if (active) active.classList.add('active');
}

// ======= Cache helpers =======
function readCache(encounterId) {
  try { const raw = localStorage.getItem(CACHE_KEY(encounterId)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function writeCache(encounterId, data, cachedAt = new Date().toISOString()) {
  try { localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data, cachedAt })); } catch {}
}
function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return (Date.now() - ts) < CACHE_TTL_MS;
  } catch { return false; }
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

// ======= Fetch + Render (unchanged behavior) =======
function render(name, data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];

  // Aggregate talents
  const tierCounts = {}, totalPerTier = {};
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
        tierCounts[tier][displayName]++; totalPerTier[tier]++; seenTiers.add(tier);
      }
    }
  }

  // Talent summary
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
          <img src="${iconUrl}" class="talent-icon-img" alt="${talent}" title="${talent}"
               loading="lazy" decoding="async" width="56" height="56">
          <div class="talent-percent" style="color:${color};">${percent}%</div>
        </a>
      `;
    }
    talentSummary += `</div>`;
  }
  talentSummary += `</div>`;

  const getColor = (rank) => rank === 1 ? '#e5cc80' : (rank <= 25 ? '#e268a8' : '#ff8000');

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
            <img src="${iconUrl}" class="talent-icon-img" alt="${t.name}" title="${t.name}"
                 loading="lazy" decoding="async" width="28" height="28">
          </a>
        `;
      }).join('');

    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const playerName = r?.name ?? 'Unknown';

    return `
      <div class="rank-entry" style="color:${color};">
        <div class="name-wrapper">
          <a target="_blank" href="${reportUrl}" class="player-link" rel="noopener">
            ${i + 1}. ${playerName} – ${dps} DPS
          </a>
        </div>
        <div class="talent-row">${talentIconsHTML}</div>
      </div>
    `;
  }).join('');

  rankingsDiv.innerHTML = `${talentSummary}${entries}`;
}

async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  const cached = readCache(encounterId);
  const cachedAtServer = cached?.data?.cachedAt;
  const cachedAtLocal = cached?.cachedAt;
  const cachedAtToShow = cachedAtServer || cachedAtLocal;
  const freshEnough = cached && isFresh(cachedAtToShow);

  if (freshEnough && !force) {
    updateLastUpdated(cachedAtToShow);
    render(name, cached.data);
    return;
  }

  updateLastUpdated(cachedAtToShow);
  rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;padding:12px">Loading...</div>`;
  disableButtons(true);

  try {
    const res = await fetch(API_URL(encounterId), { signal: currentController.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const serverCachedAt = data?.cachedAt || res.headers.get('x-last-updated') || new Date().toISOString();
    writeCache(encounterId, data, serverCachedAt);
    updateLastUpdated(serverCachedAt);
    render(name, data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Error fetching logs:', err);
    rankingsDiv.innerHTML = `<div style="text-align:center;color:#f88;padding:12px">Failed to load logs. ${err.message || ''}</div>`;
  } finally {
    disableButtons(false);
  }
}
function disableButtons(disabled) {
  bossButtonsDiv.querySelectorAll('button').forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.7' : '';
    btn.style.cursor = disabled ? 'not-allowed' : '';
  });
}

// ======= Raid switching (NEW) =======
function setCurrentRaid(raidKey) {
  currentRaidKey = raidKey;
  markActiveRaidTab();

  if (RAIDS[raidKey].encounters) {
    // MSV: show bosses and keep hash-based deep-links
    encounters = RAIDS[raidKey].encounters;
    createBossButtons(encounters);

    // Open from hash or default (MSV only)
    openFromHashOrDefault();
  } else {
    // Coming soon raids: clear hash, boss buttons, timestamp and show placeholder
    encounters = {};
    bossButtonsDiv.innerHTML = '';
    updateLastUpdated('');
    rankingsDiv.innerHTML = `<div class="coming-soon">Coming soon…</div>`;
    history.replaceState(null, '', '#'); // clear deep-link
  }
}

// ======= Deep-linking (MSV only) =======
function openFromHashOrDefault() {
  const parsed = parseHash();
  const entries = Object.entries(encounters);
  if (parsed && entries.some(([, id]) => id === parsed.id)) {
    const [bossName] = entries.find(([, id]) => id === parsed.id);
    const desiredSlug = slugify(bossName);
    if (parsed.legacy || parsed.slug !== desiredSlug) {
      updateHash(bossName, parsed.id);
    }
    selectActiveButton(parsed.id);
    fetchAndDisplayRankings(bossName, parsed.id);
  } else {
    const [bossName, encounterId] = entries[0];
    selectActiveButton(encounterId);
    updateHash(bossName, encounterId);
    fetchAndDisplayRankings(bossName, encounterId);
  }
}
window.addEventListener('hashchange', () => {
  // Only respond to hash changes when MSV is selected (others show "Coming soon…")
  if (currentRaidKey !== 'msv') return;
  const parsed = parseHash();
  if (!parsed) return;
  const entry = Object.entries(encounters).find(([, eid]) => eid === parsed.id);
  if (!entry) return;
  const [bossName] = entry;
  const desiredSlug = slugify(bossName);
  if (parsed.slug !== desiredSlug) updateHash(bossName, parsed.id);
  selectActiveButton(parsed.id);
  fetchAndDisplayRankings(bossName, parsed.id);
});

// ======= Init =======
createRaidTabs();
setCurrentRaid('msv');  // default to MSV on load
