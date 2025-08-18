// Shadow Priest Rankings — MoP Classic
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

// DOM refs
const raidMenu = document.getElementById('raid-menu');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');
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
const talentNameMap = { "Surge of Light": "From Darkness, Comes Light", "Mind Control": "Dominate Mind" };

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

// ======= Utility functions =======
// Format duration from milliseconds to readable format
function formatDuration(ms) {
  if (!ms || ms === 0) return 'N/A';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Format faction
function formatFaction(faction) {
  return faction === 1 ? 'Alliance' : faction === 0 ? 'Horde' : 'Unknown';
}

// Format server info
function formatServerInfo(serverName, regionName) {
  if (!serverName) return 'Unknown Server';
  return regionName ? `${serverName} (${regionName})` : serverName;
}

function buildGearDisplay(gear) {
  if (!Array.isArray(gear) || gear.length === 0) {
    return '<div class="no-gear">No gear data available</div>';
  }

  const gearSlots = {
    0: 'Head', 1: 'Neck', 2: 'Shoulder', 3: 'Shirt', 4: 'Chest',
    5: 'Belt', 6: 'Legs', 7: 'Feet', 8: 'Wrist', 9: 'Hands',
    10: 'Ring 1', 11: 'Ring 2', 12: 'Trinket 1', 13: 'Trinket 2',
    14: 'Back', 15: 'Main Hand', 16: 'Off Hand', 17: 'Ranged'
  };

  const allItemIds = gear
    .map(item => item ? item.id : 0)
    .filter(Boolean)
    .join(':');

  return gear.map((item, index) => {
    if (!item || item.id === 0) return ''; // Skip empty slots

    const slotName = gearSlots[index] || `Slot ${index}`;
    const qualityClass = item.quality || 'common';
    const iconSrc = `https://assets.rpglogs.com/img/warcraft/abilities/${item.icon || 'inv_misc_questionmark.jpg'}`;
    
    const params = new URLSearchParams();
    
    if (item.itemLevel) {
      params.append('ilvl', item.itemLevel);
    }
    
    if (allItemIds) {
      params.append('pcs', allItemIds);
    }

    const gemIds = (Array.isArray(item.gems) ? item.gems : [])
      .map(gem => gem.id)
      .filter(Boolean);
    if (gemIds.length > 0) {
      params.append('gems', gemIds.join(':'));
    }

    if (item.permanentEnchant) {
      params.append('ench', item.permanentEnchant);
    }
    
    const queryString = params.toString();
    const itemUrl = `https://www.wowhead.com/mop-classic/item=${item.id}${queryString ? `?${queryString}` : ''}`;
    
    const itemLinkHtml = `
      <a href="${itemUrl}"
         class="rankings-gear-name ${qualityClass} wowhead"
         target="_blank" rel="noopener">
        <img src="${iconSrc}" 
             alt="${item.name || 'Unknown Item'}" 
             class="rankings-gear-image" 
             loading="lazy">
        ${item.name || 'Unknown Item'}
      </a>
    `;

    // The .gem-enchant div has been removed from the returned HTML below.
    return `
      <div class="gear-item">
        <div class="gear-header">
          <div class="gear-info">
            ${itemLinkHtml}
            <div class="gear-slot">${slotName}</div>
          </div>
          <div class="gear-ilvl">iLvl ${item.itemLevel || '0'}</div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');
}

// Add toggle function for dropdowns
function toggleDropdown(entryId) {
  const dropdown = document.getElementById(entryId);
  const header = dropdown?.previousElementSibling;
  const expandIcon = header?.querySelector('.expand-icon');
  
  if (dropdown && expandIcon) {
    const isActive = dropdown.classList.contains('active');
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-content.active').forEach(el => {
      if (el.id !== entryId) {
        el.classList.remove('active');
        const otherIcon = el.previousElementSibling?.querySelector('.expand-icon');
        if (otherIcon) otherIcon.classList.remove('rotated');
      }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('active', !isActive);
    expandIcon.classList.toggle('rotated', !isActive);
  }
}

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
    img.src = `images/${key}.webp`;
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
        fetchAndDisplayRankings(bossName, encounterId);
      } else {
        rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${raid.name} yet.</div>`;
        updateLastUpdated(null);
        // Clear talent summary when no bosses
        const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
        if (talentSummaryElement) {
          talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
        }
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
    if (href) { return `<a class="${classes}" href="${href}" target="_blank" rel="noopener">${img}<div class="talent-percent" aria-hidden="true"></div></a>`; }
    return `<span class="${classes}">${img}<div class="talent-percent" aria-hidden="true"></div></span>`;
  });
  return `<div class="talent-row">${cells.join('')}</div>`;
}

function render(data, TOP_BY_TIER) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];

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
    const perPlayerTalents = buildPlayerTalentIcons(r?.talents, TOP_BY_TIER);
    
    // Format additional data (still used in the dropdown)
    const duration = formatDuration(r.duration);
    const itemLevel = r.itemLevel || 'N/A';
    const serverInfo = formatServerInfo(r.serverName, r.regionName);
    const faction = formatFaction(r.faction);
    const guildName = r.guildName || 'No Guild';
    const raidSize = r.size || 'N/A';
    
    const entryId = `entry-${i}-${r.reportID}-${r.fightID}`;
    
    return `
      <div class="rank-entry">
        <div class="ranking-header" onclick="toggleDropdown('${entryId}')">
          <div class="name-wrapper">
            <a class="player-link" href="${reportUrl}" target="_blank" rel="noopener" style="color:${color}">
              ${i + 1}. ${playerName} — ${dps.toLocaleString()} DPS
            </a>
          </div>
          <div class="header-right">
            ${perPlayerTalents}
            <span class="expand-icon">▼</span>
          </div>
        </div>
        
        <div class="dropdown-content" id="${entryId}">
          <div class="info-grid">
            <div class="info-section">
              <h4>Fight Details</h4>
              <div class="info-row">
                <span class="info-label">Duration:</span>
                <span class="info-value">${duration}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Fight ID:</span>
                <span class="info-value">${r.fightID || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Report:</span>
                <span class="info-value">
                  <a href="${reportUrl}" target="_blank" rel="noopener">${r.reportID || 'N/A'}</a>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Raid Size:</span>
                <span class="info-value">${raidSize}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h4>Player Info</h4>
              <div class="info-row">
                <span class="info-label">Server:</span>
                <span class="info-value">${serverInfo}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Guild:</span>
                <span class="info-value">${guildName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Faction:</span>
                <span class="info-value">${faction}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Item Level:</span>
                <span class="info-value">${itemLevel}</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h4>Gear & Equipment</h4>
            <div class="gear-grid">
              ${buildGearDisplay(r.gear)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return entries;
}

function renderTalentSummary(data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
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

  const TOP_BY_TIER = new Map();
  let talentSummaryHTML = `<div class="talent-summary-content">`;
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
      talentSummaryHTML += `<a class="talent-link wowhead ${isTop ? 'is-top' : ''}" href="${stat.wowheadUrl}" target="_blank" rel="noopener"><img class="talent-icon-img" loading="lazy" src="${stat.iconUrl}" alt="${stat.talent}" /><div class="talent-percent" style="color:${color}">${stat.percent}%</div></a>`;
    }
    talentSummaryHTML += `</div>`;
  }
  talentSummaryHTML += `</div>`;

  return { html: talentSummaryHTML, topByTier: TOP_BY_TIER };
}

async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // This function handles rendering and attaching listeners
  const renderContentAndAttachListeners = (data) => {
    const { html: talentSummaryHTML, topByTier } = renderTalentSummary(data);
    const playerListHTML = render(data, topByTier);

    // Update the main content area with just the player rankings
    rankingsDiv.innerHTML = playerListHTML;
    
    // Update the talent summary in the right sidebar
    const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
    if (talentSummaryElement) {
      talentSummaryElement.innerHTML = talentSummaryHTML;
    }

    if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
  };

  try {
    disableButtons(true);
    selectActiveButton(encounterId);
    updateHash(name, encounterId);
    rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ${name}…</p></div>`;

    const cached = readCache(encounterId);
    const cachedAt = cached?.cachedAt || cached?.data?.cachedAt;
    if (cached && isFresh(cachedAt) && !force) {
      updateLastUpdated(cachedAt);
      renderContentAndAttachListeners(cached.data);
      return;
    }

    const res = await fetch(API_URL(encounterId), { signal: currentController.signal, headers: { 'accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const serverTs = data.cachedAt || new Date().toISOString();
    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    renderContentAndAttachListeners(data);

  } catch (err) {
    if (err?.name === 'AbortError') return;
    console.error('Failed to fetch rankings:', err);
    const cached = readCache(encounterId);
    if (cached) {
      updateLastUpdated(cached.cachedAt || cached.data?.cachedAt);
      renderContentAndAttachListeners(cached.data);
    } else {
      rankingsDiv.innerHTML = `<div style="text-align:center;color:red;margin-top:16px;">Couldn't load data for ${name}. Please try again later.</div>`;
      updateLastUpdated(null);
      // Clear talent summary on error
      const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
      if (talentSummaryElement) {
        talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">Failed to load talent data</div>';
      }
    }
  } finally {
    disableButtons(false);
    currentController = null;
  }
}

// ======= Boot =======
document.addEventListener('DOMContentLoaded', () => {
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
    });
  });

  // Add event listener for talent sidebar collapsible header
  const talentToggleBtn = document.querySelector('.talent-sidebar .collapsible-header');
  const talentContentDiv = document.querySelector('.talent-sidebar .collapsible-content');
  talentToggleBtn?.addEventListener('click', () => {
    const isActive = talentContentDiv.classList.toggle('active');
    talentToggleBtn.setAttribute('aria-expanded', isActive);
    talentToggleBtn.querySelector('.expand-icon')?.classList.toggle('rotated');
  });

  createRaidMenu();
  buildBossButtonsForRaid(currentRaidKey);

  const ph = parseHash();
  if (ph && ph.id) {
    const rk = findRaidKeyByEncounterId(ph.id);
    if (rk) {
      currentRaidKey = rk;
      selectActiveRaid(rk);
      buildBossButtonsForRaid(rk);
      const bossName = Object.entries(RAIDS[rk].encounters).find(([, id]) => id === ph.id)?.[0] ?? 'Encounter';
      fetchAndDisplayRankings(bossName, ph.id);
      return;
    }
  }

  const entries = Object.entries(RAIDS[currentRaidKey].encounters);
  if (entries.length) {
    const [bossName, encounterId] = entries[0];
    fetchAndDisplayRankings(bossName, encounterId);
  } else {
    rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${RAIDS[currentRaidKey].name} yet.</div>`;
    updateLastUpdated(null);
    // Clear talent summary when no bosses
    const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
    if (talentSummaryElement) {
      talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
    }
  }
});
