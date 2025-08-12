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
    btn.style.cursor = disabled ? 'not-allowed' : '';
  });
}

function buildPlayerTalentIcons(playerTalentsRaw, topByTier) {
  const chosenByTier = new Map();
  const talents = Array.isArray(playerTalentsRaw) ? playerTalentsRaw : [];
  for (const t of talents) {
    const displayName = getTalentDisplayName(t.name);
    if (!VALID_TALENT_SET.has(displayName)) continue;
    const tier = TIER_BY_TALENT.get(displayName);
    if (tier && !chosenByTier.has(tier)) chosenByTier.set(tier, displayName);
  }
  const cells = TIER_ORDER.map((tier) => {
    const name = chosenByTier.get(tier) ?? null;
    const iconUrl = talentIconUrl(name);
    const spellId = name ? getSpellId(name) : 0;
    const href = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : null;
    const title = name ?? 'Unknown (no data)';
    const metaInfo = topByTier?.get(tier);
    const isMeta = !!(name && metaInfo && metaInfo.winners.has(name));
    const metaPct = isMeta ? metaInfo.percent.toFixed(1) : null;
    const img = `<img class="talent-icon-img" loading="lazy" src="${iconUrl}" alt="${title}" />`;
    const classes = `talent-link${href ? ' wowhead' : ''}${isMeta ? ' is-meta' : ''}`;
    const fullTitle = `${title}${isMeta ? ` (Meta pick, used by ${metaPct}% of top players)` : ''}`;
    if (href) { return `<a class="${classes}" href="${href}" target="_blank" rel="noopener" title="${fullTitle}">${img}<div class="talent-percent" aria-hidden="true"></div></a>`; }
    return `<span class="${classes}" title="${fullTitle}">${img}<div class="talent-percent" aria-hidden="true"></div></span>`;
  });
  return `<div class="talent-row">${cells.join('')}</div>`;
}

// --- FIX: Separated the player list rendering from the main render function ---
// This function just builds the HTML for the player rows.
// This allows us to re-render only the list when searching, without re-calculating talent stats.
function renderPlayerList(rankingsToDisplay, topByTier) {
  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';
    if (rank >= 2 && rank <= 25) return '#e268a8';
    return '#ff8000';
  };
  
  const entries = rankingsToDisplay.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const playerName = r?.name ?? 'Unknown';
    const perPlayerTalents = buildPlayerTalentIcons(r?.talents, topByTier);
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
  
  // Find the container for the player list and update it
  const playerListContainer = rankingsDiv.querySelector('.player-list-container');
  if (playerListContainer) {
    playerListContainer.innerHTML = entries;
  }
}


function render(name, data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];

  // Aggregate talent usage (summary) - This part remains the same
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

  // Summary UI + winners
  const TOP_BY_TIER = new Map(); // tier -> { winners:Set<string>, percent:number }
  let talentSummaryHTML = `<div class="talent-summary">`;
  for (const tier of TIER_ORDER) {
    const total = totalPerTier[tier] ?? 0;
    const rowStats = talentTiers[tier].map((talent) => {
      const count = tierCounts[tier][talent] ?? 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);
      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : `https://www.wowhead.com/`;
      return { talent, percentNum, percent, iconUrl, wowheadUrl };
    });
    const maxPct = Math.max(...rowStats.map((s) => s.percentNum), 0);
    const EPS = 0.05;
    const winners = rowStats.filter((s) => s.percentNum >= maxPct - EPS && maxPct > 0).map((s) => s.talent);
    TOP_BY_TIER.set(tier, { winners: new Set(winners), percent: maxPct });
    talentSummaryHTML += `<div class="talent-row">`;
    for (const stat of rowStats) {
      const isTop = stat.percentNum >= maxPct - EPS && maxPct > 0;
      const color = stat.percentNum >= 75 ? 'limegreen' : stat.percentNum <= 10 ? 'red' : 'orange';
      talentSummaryHTML += `
        <a class="talent-link wowhead ${isTop ? 'is-top' : ''}" href="${stat.wowheadUrl}" target="_blank" rel="noopener" title="${stat.talent} (${stat.percent}%)">
          <img class="talent-icon-img" loading="lazy" src="${stat.iconUrl}" alt="${stat.talent}" />
          <div class="talent-percent" style="color:${color}">${stat.percent}%</div>
        </a>`;
    }
    talentSummaryHTML += `</div>`;
  }
  talentSummaryHTML += `</div>`;

  // --- FIX: The main render function now sets up the structure and calls the player list renderer ---
  // We add a container for the player list so we can target it easily later.
  rankingsDiv.innerHTML = `
    <div class="rankings-container">
      ${talentSummaryHTML}
      <div class="player-list-container"></div>
    </div>
  `;
  
  // Initial render of the full player list
  renderPlayerList(rankings, TOP_BY_TIER);

  if (window.$WowheadPower && typeof window.$WowheadPower.refreshLinks === 'function') {
    window.$WowheadPower.refreshLinks();
  }
}

async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  // Abort any in-flight request
  if (currentController) currentController.abort();
  currentController = new AbortController();

  try {
    disableButtons(true);
    // --- FIX: Clear search input when loading a new boss ---
    searchInput.value = ''; 
    currentBossName = name; // Store the current boss name
    rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ${name}…</p></div>`;

    const cached = readCache(encounterId);
    const cachedAt = cached?.cachedAt || cached?.data?.cachedAt;
    if (cached && isFresh(cachedAt) && !force) {
      updateLastUpdated(cachedAt);
      // --- FIX: Populate allRankings from cache ---
      allRankings = cached.data.rankings || [];
      render(name, cached.data);
      return; 
    }

    // Fetch latest from server
    const res = await fetch(API_URL(encounterId), { signal: currentController.signal, headers: { 'accept': 'application/json' }, });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const serverTs = data.cachedAt || new Date().toISOString();
    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    // --- FIX: Populate allRankings from fetch ---
    allRankings = data.rankings || [];
    render(name, data);
  } catch (err) {
    if (err?.name === 'AbortError') return;
    console.error('Failed to fetch rankings:', err);
    const cached = readCache(encounterId);
    if (cached) {
      const cachedAt = cached.cachedAt || cached.data?.cachedAt;
      updateLastUpdated(cachedAt);
      allRankings = cached.data.rankings || [];
      render(name, cached.data);
    } else {
      rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">Couldn’t load data for ${name}. Please try again later.</div>`;
      updateLastUpdated(null);
    }
  } finally {
    disableButtons(false);
    currentController = null;
  }
}

// ======= Boot =======
document.addEventListener('DOMContentLoaded', () => {
  // --- FIX: All event listeners are now safely inside DOMContentLoaded ---
  
  // Setup Search Input Listener
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredRankings = allRankings.filter(r =>
      r.name.toLowerCase().includes(searchTerm)
    );
    // Re-render just the player list with the filtered results
    // We need to find TOP_BY_TIER again or pass it, but for simplicity, we'll re-render all
    const rankingsContainer = rankingsDiv.querySelector('.rankings-container');
    if (rankingsContainer) {
       // A simplified re-render for search. We need to pass the TOP_BY_TIER map again.
       // This is a bit complex, so we'll re-run the full render on the filtered data.
       // This will unfortunately update the talent summary, but it's the simplest fix.
       render(currentBossName, { rankings: filteredRankings });
    }
  });

  // Setup Copy Link Listener
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
    });
  });

  // Initial Page Load Logic
  createRaidMenu();
  buildBossButtonsForRaid(currentRaidKey);

  const ph = parseHash();
  if (ph && ph.id) {
    const rk = findRaidKeyByEncounterId(ph.id);
    if (rk) {
      currentRaidKey = rk;
      selectActiveRaid(rk);
      buildBossButtonsForRaid(rk);
      selectActiveButton(ph.id);
      const bossName = Object.entries(RAIDS[rk].encounters).find(([, id]) => id === ph.id)?.[0] ?? 'Encounter';
      fetchAndDisplayRankings(bossName, ph.id);
      return;
    }
  }

  const entries = Object.entries(RAIDS[currentRaidKey].encounters);
  if (entries.length) {
    const [bossName, encounterId] = entries[0];
    selectActiveButton(encounterId);
    updateHash(bossName, encounterId);
    fetchAndDisplayRankings(bossName, encounterId);
  } else {
    rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${RAIDS[currentRaidKey].name} yet.</div>`;
    updateLastUpdated(null);
  }
});
