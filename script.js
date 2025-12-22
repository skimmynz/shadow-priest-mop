// Time-slicing for large operations
class TimeSlicing {
  static async processInChunks(items, processor, chunkSize = 50, yieldEvery = 5) {
    const results = [];
    let processedChunks = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      processedChunks++;
      if (processedChunks % yieldEvery === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return results;
  }
}

// Optimized DOM batch updates (no reliance on fragment.children)
class DOMBatcher {
  constructor() {
    this.pendingUpdates = new Map();
    this.isScheduled = false;
  }
  schedule(key, updateFn) {
    this.pendingUpdates.set(key, updateFn);
    if (!this.isScheduled) {
      this.isScheduled = true;
      scheduler.postTask(() => this.flush(), { priority: 'user-blocking' });
    }
  }
  flush() {
    // Just run the queued update functions; they write to the DOM themselves.
    this.pendingUpdates.forEach(updateFn => {
      try { updateFn(); } catch (e) { console.error('DOMBatcher update failed:', e); }
    });
    this.pendingUpdates.clear();
    this.isScheduled = false;
  }
}

// Task scheduler polyfill
const domBatcher = new DOMBatcher();
const scheduler = window.scheduler || {
  postTask: (fn, options) => {
    const priority = options && options.priority ? options.priority : 'background';
    if (priority === 'user-blocking') {
      return Promise.resolve().then(fn);
    }
    return new Promise(resolve => setTimeout(() => resolve(fn()), 0));
  }
};

// Debounced event handlers
function createDebounced(fn, delay = 100, immediate = false) {
  let timeoutId = null;
  let lastArgs = null;
  const debounced = function (...args) {
    lastArgs = args;
    if (immediate && !timeoutId) {
      fn.apply(this, args);
    }
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        fn.apply(this, lastArgs);
      }
    }, delay);
  };
  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };
  return debounced;
}

/* --------------------------------------------------------------------------------
   Boss icon helpers (Throne of Thunder normalization)
   -------------------------------------------------------------------------------- */
// ToT assets use 15xx icon IDs, not 515xx encounter IDs.
// Normalize: 51559–51580 -> 1559–1580; otherwise return unchanged.
function getBossIconId(encounterId) {
  if (encounterId >= 51559 && encounterId <= 51580) {
    return encounterId - 50000; // e.g., 51577 -> 1577
  }
  return encounterId; // T14 etc. already match asset icon IDs
}
function bossIconUrl(encounterId) {
  const iconId = getBossIconId(encounterId);
  return 'https://assets.rpglogs.com/img/warcraft/bosses/' + iconId + '-icon.jpg?v=2';
}

/* --------------------------------------------------------------------------------
   Talent analysis (time-sliced)
   -------------------------------------------------------------------------------- */
async function analyzeTalentsOptimized(rankings) {
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return { tierCounts: {}, totalPerTier: {} };
  }
  const tierCounts = {};
  const totalPerTier = {};

  // Initialize structures
  for (const tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (const talent of talentTiers[tier]) {
      tierCounts[tier][talent] = 0;
    }
  }

  await TimeSlicing.processInChunks(
    rankings,
    async (chunk) => {
      return chunk.map(entry => {
        const seenTiers = new Set();
        const talents = Array.isArray(entry && entry.talents) ? entry.talents : [];
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
        return entry;
      });
    },
    25, // Smaller chunk size for better yielding
    2   // Yield more frequently
  );

  return { tierCounts, totalPerTier };
}

/* --------------------------------------------------------------------------------
   Optimized Renderer
   -------------------------------------------------------------------------------- */
class OptimizedRenderer {
  constructor(container) {
    this.container = container;
    this.renderCache = new Map();
  }

  async renderRankings(data, topByTier) {
    const rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
    const visibleRankings = rankings.slice(0, 100);

    // Pre-calculate colors
    const rankColors = new Map();
    for (let i = 0; i < visibleRankings.length; i++) {
      const rank = i + 1;
      if (rank === 1) rankColors.set(i, '#e5cc80');
      else if (rank >= 2 && rank <= 25) rankColors.set(i, '#e268a8');
      else rankColors.set(i, '#ff8000');
    }

    const renderedEntries = await TimeSlicing.processInChunks(
      visibleRankings,
      async (chunk) => {
        return chunk.map((r) => {
          const globalIndex = visibleRankings.indexOf(r);
          return this.renderSingleEntry(r, globalIndex, rankColors.get(globalIndex), topByTier);
        });
      },
      10,
      1
    );

    return renderedEntries.join('');
  }

  renderSingleEntry(r, index, color, topByTier) {
    const cacheKey = (r.reportID + '-' + r.fightID + '-' + index);
    if (this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey);
    }

    const reportUrl = 'https://classic.warcraftlogs.com/reports/' + r.reportID + '?fight=' + r.fightID + '&type=damage-done';
    const dps = (r && typeof r.total === 'number') ? Math.round(r.total) : '—';
    const playerName = (r && r.name) ? r.name : 'Unknown';
    const perPlayerTalents = this.buildPlayerTalentIcons(r && r.talents, topByTier);
    const entryId = 'entry-' + index + '-' + r.reportID + '-' + r.fightID;

    const html =
      '<div class="rank-entry">' +
      '<div class="ranking-header" onclick="toggleDropdown(\'' + entryId + '\')">' +
      '<div class="name-wrapper" style="color:' + color + '">' +
      (index + 1) + '. ' + playerName + ' — ' + (typeof dps === 'number' ? dps.toLocaleString() : dps) + ' DPS' +
      '</div>' +
      '<div class="header-right">' +
      perPlayerTalents +
      '<span class="expand-icon">▼</span>' +
      '</div>' +
      '</div>' +
      '<div class="dropdown-content" id="' + entryId + '">' +
      this.renderDropdownContent(r, reportUrl) +
      '</div>' +
      '</div>';

    this.renderCache.set(cacheKey, html);
    return html;
  }

  renderDropdownContent(r, reportUrl) {
    return (
      '<div class="dropdown-placeholder" data-report-id="' + r.reportID + '" data-fight-id="' + r.fightID + '">' +
      '<div style="text-align: center; padding: 1rem; color: #94a3b8;">' +
      'Click to load details...' +
      '</div>' +
      '</div>'
    );
  }

  buildPlayerTalentIcons(playerTalentsRaw, topByTier) {
    const chosenByTier = new Map();
    const talents = Array.isArray(playerTalentsRaw) ? playerTalentsRaw : [];

    for (const t of talents) {
      const displayName = getTalentDisplayName(t.name);
      if (!VALID_TALENT_SET.has(displayName)) continue;
      const tier = TIER_BY_TALENT.get(displayName);
      if (tier && !chosenByTier.has(tier)) chosenByTier.set(tier, displayName);
    }

    const cells = TIER_ORDER.map((tier) => {
      const name = chosenByTier.get(tier) || null;
      const iconUrl = talentIconUrl(name);
      const spellId = name ? getSpellId(name) : 0;
      const href = spellId ? ('https://www.wowhead.com/mop-classic/spell=' + spellId) : null;
      const title = name || 'Unknown (no data)';
      const metaInfo = topByTier && topByTier.get ? topByTier.get(tier) : null;
      const isMeta = !!(name && metaInfo && metaInfo.winners && metaInfo.winners.has(name));
      const img = '<img class="talent-icon-img" loading="lazy" src="' + iconUrl + '" alt="' + title + '" />';
      const classes = 'talent-link' + (href ? ' wowhead' : '') + (isMeta ? ' is-meta' : '');
      if (href) {
        return '<a class="' + classes + '" href="' + href + '" target="_blank" rel="noopener">' + img + '<div class="talent-percent" aria-hidden="true"></div></a>';
      }
      return '<span class="' + classes + '">' + img + '<div class="talent-percent" aria-hidden="true"></div></span>';
    });

    return '<div class="talent-row">' + cells.join('') + '</div>';
  }
}

/* --------------------------------------------------------------------------------
   Dropdown toggle (debounced, lazy-load)
   -------------------------------------------------------------------------------- */
const debouncedToggleDropdown = createDebounced(async function (entryId) {
  const dropdown = document.getElementById(entryId);
  const header = dropdown ? dropdown.previousElementSibling : null;
  const expandIcon = header ? header.querySelector('.expand-icon') : null;
  if (!dropdown || !expandIcon) return;

  const isActive = dropdown.classList.contains('active');

  const otherDropdowns = document.querySelectorAll('.dropdown-content.active');
  otherDropdowns.forEach(el => {
    if (el.id !== entryId) {
      el.classList.remove('active');
      const otherIcon = el.previousElementSibling ? el.previousElementSibling.querySelector('.expand-icon') : null;
      if (otherIcon) otherIcon.classList.remove('rotated');
    }
  });

  if (!isActive) {
    const placeholder = dropdown.querySelector('.dropdown-placeholder');
    if (placeholder) {
      const reportId = placeholder.dataset.reportId;
      const fightId = placeholder.dataset.fightId;
      await loadDropdownContent(dropdown, reportId, fightId);
    }
  }

  dropdown.classList.toggle('active', !isActive);
  expandIcon.classList.toggle('rotated', !isActive);
}, 50, true);

async function loadDropdownContent(dropdown, reportId, fightId) {
  if (!currentData || !currentData.rankings) return;

  const entry = currentData.rankings.find(r =>
    r.reportID === reportId && r.fightID === parseInt(fightId, 10)
  );
  if (!entry) return;

  const reportUrl = 'https://classic.warcraftlogs.com/reports/' + reportId + '?fight=' + fightId + '&type=damage-done';
  const duration = formatDuration(entry.duration);
  const itemLevel = (entry.itemLevel != null) ? entry.itemLevel : 'N/A';
  const serverInfo = formatServerInfo(entry.serverName, entry.regionName);
  const faction = formatFaction(entry.faction);
  const guildName = entry.guildName || 'No Guild';
  const raidSize = (entry.size != null) ? entry.size : 'N/A';

  const content =
    '<div class="info-grid">' +
      '<div class="info-section">' +
        '<h4>Fight Details</h4>' +
        '<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">' + duration + '</span></div>' +
        '<div class="info-row"><span class="info-label">Fight ID:</span><span class="info-value">' + fightId + '</span></div>' +
        '<div class="info-row"><span class="info-label">Report:</span><span class="info-value"><a href="' + reportUrl + '" target="_blank" rel="noopener">' + reportId + '</a></span></div>' +
        '<div class="info-row"><span class="info-label">Raid Size:</span><span class="info-value">' + raidSize + '</span></div>' +
      '</div>' +
      '<div class="info-section">' +
        '<h4>Player Info</h4>' +
        '<div class="info-row"><span class="info-label">Server:</span><span class="info-value">' + serverInfo + '</span></div>' +
        '<div class="info-row"><span class="info-label">Guild:</span><span class="info-value">' + guildName + '</span></div>' +
        '<div class="info-row"><span class="info-label">Faction:</span><span class="info-value">' + faction + '</span></div>' +
        '<div class="info-row"><span class="info-label">Item Level:</span><span class="info-value">' + itemLevel + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="info-section">' +
      '<h4>Gear & Equipment</h4>' +
      '<div class="gear-grid">' +
      buildGearDisplay(entry.gear) +
      '</div>' +
    '</div>';

  dropdown.innerHTML = content;
}

// Global toggle function
function toggleDropdown(entryId) {
  debouncedToggleDropdown(entryId);
}

// Renderer init
const optimizedRenderer = new OptimizedRenderer();
let currentData = null;

/* --------------------------------------------------------------------------------
   Tier / Raids data
   -------------------------------------------------------------------------------- */
const TIERS = {
  t14: {
    name: 'T14',
    raids: {
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
          "Imperial Vizier Zor'lok": 1507,
          "Blade Lord Ta'yak": 1504,
          "Garalon": 1463,
          "Wind Lord Mel'jarak": 1498,
          "Amber-Shaper Un'sok": 1499,
          "Grand Empress Shek'zeer": 1501
        }
      },
      toes: {
        short: 'ToES',
        name: 'Terrace of Endless Spring',
        encounters: {
          "Protectors of the Endless": 1409,
          "Tsulong": 1505,
          "Lei Shi": 1506,
          "Sha of Fear": 1431
        }
      }
    }
  },
  t15: {
    name: 'T15',
    raids: {
      tot: {
        short: 'ToT',
        name: 'Throne of Thunder',
        encounters: {
          "Jin'rokh the Breaker": 51577,
          "Horridon": 51575,
          "Council of Elders": 51570,
          "Tortos": 51565,
          "Megaera": 51578,
          "Ji-Kun": 51573,
          "Durumu the Forgotten": 51572,
          "Primordius": 51574,
          "Dark Animus": 51576,
          "Iron Qon": 51559,
          "Twin Consorts": 51560,
          "Lei Shen": 51579,
          "Ra-den": 51580
        }
      }
    }
  }
};
let currentTierKey = 't15';
let currentRaidKey = 'tot';

// DOM refs
const raidMenu = document.getElementById('raid-menu');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');

// Last updated element
let lastUpdatedEl = document.getElementById('last-updated');
if (!lastUpdatedEl) {
  const h1 = document.querySelector('h1');
  if (h1) {
    lastUpdatedEl = document.createElement('div');
    lastUpdatedEl.id = 'last-updated';
    lastUpdatedEl.className = 'last-updated';
    h1.insertAdjacentElement('afterend', lastUpdatedEl);
  }
}

/* --------------------------------------------------------------------------------
   Cache & API
   -------------------------------------------------------------------------------- */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = (encounterId) => 'spriest_rankings_' + encounterId;
const API_URL = (encounterId) => '/.netlify/functions/getLogs?encounterId=' + encounterId;

/* --------------------------------------------------------------------------------
   Talents
   -------------------------------------------------------------------------------- */
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
  "Spectral Guise": 112833,
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

// Precomputed helpers
const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a, b) => a - b);
const VALID_TALENT_SET = new Set([].concat(...Object.values(talentTiers)));
const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const tierStr in talentTiers) {
    const tier = Number(tierStr);
    for (const t of talentTiers[tier]) m.set(t, tier);
  }
  return m;
})();
const getSpellId = (name) => (name in talentSpellIds ? talentSpellIds[name] : 0);
const getTalentDisplayName = (apiName) => (apiName in talentNameMap ? talentNameMap[apiName] : apiName);
const talentIconUrl = (name) => {
  const key = name && talentIcons[name] ? talentIcons[name] : 'inv_misc_questionmark';
  return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
};

/* --------------------------------------------------------------------------------
   Utility
   -------------------------------------------------------------------------------- */
function formatDuration(ms) {
  if (!ms || ms === 0) return 'N/A';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes + 'm ' + seconds + 's';
}
function formatFaction(faction) {
  return faction === 1 ? 'Alliance' : faction === 0 ? 'Horde' : 'Unknown';
}
function formatServerInfo(serverName, regionName) {
  if (!serverName) return 'Unknown Server';
  return regionName ? (serverName + ' (' + regionName + ')') : serverName;
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
  const allItemIds = gear.map(item => item ? item.id : 0).filter(Boolean).join(':');

  return gear.map((item, index) => {
    if (!item || item.id === 0) return '';
    const slotName = gearSlots[index] || ('Slot ' + index);
    const qualityClass = item.quality || 'common';
    const iconSrc = 'https://assets.rpglogs.com/img/warcraft/abilities/' + (item.icon || 'inv_misc_questionmark.jpg');

    const params = new URLSearchParams();
    if (item.itemLevel) params.append('ilvl', item.itemLevel);
    if (allItemIds) params.append('pcs', allItemIds);

    const gemIds = (Array.isArray(item.gems) ? item.gems : []).map(g => g.id).filter(Boolean);
    if (gemIds.length > 0) params.append('gems', gemIds.join(':'));
    if (item.permanentEnchant) params.append('ench', item.permanentEnchant);

    const queryString = params.toString();
    const itemUrl = 'https://www.wowhead.com/mop-classic/item=' + item.id + (queryString ? ('?' + queryString) : '');

    const itemLinkHtml =
      '<a href="' + itemUrl + '" class="rankings-gear-name ' + qualityClass + ' wowhead" target="_blank" rel="noopener">' +
      '<img src="' + iconSrc + '" alt="' + (item.name || 'Unknown Item') + '" class="rankings-gear-image" loading="lazy">' +
      (item.name || 'Unknown Item') +
      '</a>';

    return (
      '<div class="gear-item">' +
        '<div class="gear-header">' +
          '<div class="gear-info">' +
            itemLinkHtml +
            '<div class="gear-slot">' + slotName + '</div>' +
          '</div>' +
          '<div class="gear-ilvl">iLvl ' + (item.itemLevel || '0') + '</div>' +
        '</div>' +
      '</div>'
    );
  }).filter(Boolean).join('');
}

/* --------------------------------------------------------------------------------
   Talent summary rendering
   -------------------------------------------------------------------------------- */
async function renderTalentSummary(data) {
  const rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
  const result = await analyzeTalentsOptimized(rankings);
  const tierCounts = result.tierCounts;
  const totalPerTier = result.totalPerTier;

  const TOP_BY_TIER = new Map();
  let talentSummaryHTML = '<div class="talent-summary-content">';

  for (const tier of TIER_ORDER) {
    const total = totalPerTier[tier] || 0;

    const rowStats = talentTiers[tier].map((talent) => {
      const count = (tierCounts[tier] && tierCounts[tier][talent]) ? tierCounts[tier][talent] : 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);
      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId ? ('https://www.wowhead.com/mop-classic/spell=' + spellId) : 'https://www.wowhead.com/';
      return { talent: talent, percentNum: percentNum, percent: percent, iconUrl: iconUrl, wowheadUrl: wowheadUrl };
    });

    const maxPct = Math.max.apply(null, rowStats.map(s => s.percentNum).concat([0]));
    const EPS = 0.05;
    const winners = rowStats
      .filter(s => s.percentNum >= maxPct - EPS && maxPct > 0)
      .map(s => s.talent);

    TOP_BY_TIER.set(tier, { winners: new Set(winners), percent: maxPct });

    talentSummaryHTML += '<div class="talent-row">';
    for (const stat of rowStats) {
      const isTop = stat.percentNum >= maxPct - EPS && maxPct > 0;
      const color = stat.percentNum >= 75 ? 'limegreen' : (stat.percentNum <= 10 ? 'red' : 'orange');
      talentSummaryHTML += '<a class="talent-link wowhead ' + (isTop ? 'is-top' : '') + '" href="' + stat.wowheadUrl + '" target="_blank" rel="noopener"><img class="talent-icon-img" loading="lazy" src="' + stat.iconUrl + '" alt="' + stat.talent + '" /><div class="talent-percent" style="color:' + color + '">' + stat.percent + '%</div></a>';
    }
    talentSummaryHTML += '</div>';
  }

  talentSummaryHTML += '</div>';
  return { html: talentSummaryHTML, topByTier: TOP_BY_TIER };
}

/* --------------------------------------------------------------------------------
   Parsing rules
   -------------------------------------------------------------------------------- */
const PARSING_RULES = {
  1395: { title: "The Stone Guard", rules: ["The damage bonus from Energized Tiles is normalized."] },
  1390: { title: "Feng the Accursed", rules: ["Damage done to Soul Fragments is removed."] },
  1434: { title: "Gara'jal the Spiritbinder", rules: ["Damage done to Spirit Totems is removed."] },
  1436: { title: "The Spirit Kings", rules: ["No rules, though friendly fire damage (during Mind Control) is already excluded."] },
  1500: { title: "Elegon", rules: ["Damage done during Draw Power is normalized, and damage done to Cosmic Sparks is removed."] },
  1407: { title: "Will of the Emperor", rules: ["Damage done to Emperor's Rage is removed from 25-man Heroic.","Will of the Emperor is removed from Damage All Star Points."] },
  1507: { title: "Imperial Vizier Zor'lok", rules: ["Damage done to adds that don't die is removed."] },
  1504: { title: "Blade Lord Ta'yak", rules: ["No rules."] },
  1463: { title: "Garalon", rules: ["Garalon is removed from Damage All Star Points."] },
  1498: { title: "Wind Lord Mel'jarak", rules: ["Damage done to adds that don't die is removed."] },
  1499: { title: "Amber-Shaper Un'sok", rules: ["Amber-Shaper is removed from All Star Points (both Damage and Healing)."] },
  1501: { title: "Grand Empress Shek'zeer", rules: ["Damage done to Kor'thik Reavers and Set'thik Windblades is removed."] },
  1409: { title: "Protectors of the Endless", rules: ["Damage done to bosses that heal to full is removed.","Damage gained from Corrupted Essence is normalized.","Only Hardmode/Elite order ranks as Heroic. This means Protector Kaolan has to die last."] },
  1505: { title: "Tsulong", rules: ["Damage done to The Dark of Night, Fright Spawn, and Embodied Terrors is removed."] },
  1506: { title: "Lei Shi", rules: ["Damage done to Animated Protectors is removed."] },
  1431: { title: "Sha of Fear", rules: ["Sha of Fear is removed from Damage ASP."] },
  51577: { title: "Jin'rokh the Breaker", rules: ["No rules."] },
  51575: { title: "Horridon", rules: ["No rules."] },
  51570: { title: "Council of Elders", rules: ["No rules."] },
  51565: { title: "Tortos", rules: ["No rules."] },
  51578: { title: "Megaera", rules: ["No rules."] },
  51573: { title: "Ji-Kun", rules: ["No rules."] },
  51572: { title: "Durumu the Forgotten", rules: ["No rules."] },
  51574: { title: "Primordius", rules: ["No rules."] },
  51576: { title: "Dark Animus", rules: ["No rules."] },
  51559: { title: "Iron Qon", rules: ["No rules."] },
  51560: { title: "Twin Consorts", rules: ["No rules."] },
  51579: { title: "Lei Shen", rules: ["No rules."] },
  51580: { title: "Ra-den", rules: ["No rules."] }
};
function renderParsingRules(encounterId) {
  const rules = PARSING_RULES[encounterId];
  if (!rules) return '';
  const ruleItems = rules.rules.map(rule => '<li class="parsing-rule-item">' + rule + '</li>').join('');
  return (
    '<div class="parsing-rules-header-container">' +
      '<div class="parsing-rules-content active">' +
        '<ul class="parsing-rules-list">' +
          ruleItems +
        '</ul>' +
      '</div>' +
    '</div>'
  );
}

/* --------------------------------------------------------------------------------
   Main fetch & display
   -------------------------------------------------------------------------------- */
async function fetchAndDisplayRankings(name, encounterId, opts) {
  const force = opts && opts.force ? opts.force : false;
  const startTime = performance.now();

  if (currentController) currentController.abort();
  currentController = new AbortController();

  const renderContentAndAttachListeners = async (data) => {
    currentData = data;
    const talentResult = await renderTalentSummary(data);
    const topByTier = talentResult.topByTier;
    const talentSummaryHTML = talentResult.html;
    const finalRankingsHTML = await optimizedRenderer.renderRankings(data, topByTier);

    domBatcher.schedule('rankings', () => {
      if (rankingsDiv) rankingsDiv.innerHTML = finalRankingsHTML;
    });
    domBatcher.schedule('talents', () => {
      const el = document.querySelector('.talent-sidebar .talent-summary');
      if (el) el.innerHTML = talentSummaryHTML;
    });
    domBatcher.schedule('parsing-rules', () => {
      const lastUpdatedEl = document.getElementById('last-updated');
      if (lastUpdatedEl) {
        const existingRules = document.querySelector('.parsing-rules-header-container');
        if (existingRules) existingRules.remove();
        const parsingRulesHTML = renderParsingRules(encounterId);
        if (parsingRulesHTML) lastUpdatedEl.insertAdjacentHTML('afterend', parsingRulesHTML);
      }
    });

    scheduler.postTask(() => {
      if (window.$WowheadPower) {
        window.$WowheadPower.refreshLinks();
      }
    }, { priority: 'background' });

    console.log('Rendering completed in ' + (performance.now() - startTime) + 'ms');
  };

  try {
    disableButtons(true);
    selectActiveButton(encounterId);
    updateHash(name, encounterId);

    if (rankingsDiv) {
      rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ' + name + '…</p></div>';
    }

    const cached = readCache(encounterId);
    const cachedAt = cached ? (cached.cachedAt || (cached.data && cached.data.cachedAt)) : null;

    if (cached && isFresh(cachedAt) && !force) {
      updateLastUpdated(cachedAt);
      await renderContentAndAttachListeners(cached.data);
      return;
    }

    const res = await fetch(API_URL(encounterId), {
      signal: currentController.signal,
      headers: { 'accept': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const serverTs = data.cachedAt || (new Date()).toISOString();

    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    await renderContentAndAttachListeners(data);

  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('Failed to fetch rankings:', err);

    const cached = readCache(encounterId);
    if (cached) {
      updateLastUpdated(cached.cachedAt || (cached.data && cached.data.cachedAt));
      await renderContentAndAttachListeners(cached.data);
    } else {
      if (rankingsDiv) {
        rankingsDiv.innerHTML = '<div style="text-align:center;color:red;margin-top:16px;">Couldn\'t load data for ' + name + '. Please try again later.</div>';
      }
      updateLastUpdated(null);
      const el = document.querySelector('.talent-sidebar .talent-summary');
      if (el) {
        el.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">Failed to load talent data</div>';
      }
    }
  } finally {
    disableButtons(false);
    currentController = null;
  }
}

/* --------------------------------------------------------------------------------
   Hash, menus & buttons
   -------------------------------------------------------------------------------- */
function slugify(str) {
  return String(str).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')       // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')           // non-alphanum -> dash
    .replace(/^-+|-+$/g, '')               // trim leading/trailing dashes
    .replace(/--+/g, '-');                 // collapse multiple dashes
}
function hashFor(name, encounterId) { return '#' + slugify(name) + '-' + encounterId; }
function updateHash(name, encounterId) { try { history.replaceState(null, '', hashFor(name, encounterId)); } catch {} }
function parseHash() {
  const h = location.hash || '';
  const m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
  if (m) return { slug: m[1].toLowerCase(), id: parseInt(m[2], 10) };
  const legacy = h.match(/^#e-(\d+)$/i);
  if (legacy) return { slug: 'e', id: parseInt(legacy[1], 10), legacy: true };
  return null;
}

function createTierMenu() {
  if (!raidMenu) return;

  const fragment = document.createDocumentFragment();

  // Tier toggle buttons (instead of dropdown)
  const tierToggleContainer = document.createElement('div');
  tierToggleContainer.className = 'tier-toggle-container';

  for (const tierKey in TIERS) {
    const tier = TIERS[tierKey];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tier-toggle-button';
    button.dataset.tierKey = tierKey;
    button.textContent = tier.name;
    
    if (tierKey === currentTierKey) {
      button.classList.add('active');
    }

  button.addEventListener('click', (e) => {
    const newTierKey = e.currentTarget.dataset.tierKey;
    if (currentTierKey === newTierKey) return;
  
    currentTierKey = newTierKey;
    createTierMenu();
  
    const raids = TIERS[newTierKey].raids;
    const firstRaidKey = Object.keys(raids)[0];
  
    currentRaidKey = firstRaidKey;
    selectActiveRaid(firstRaidKey);
    buildBossButtonsForRaid(firstRaidKey);
  
    const entries = Object.entries(raids[firstRaidKey].encounters);
    if (entries.length > 0) {
      const firstBoss = entries[0];
      fetchAndDisplayRankings(firstBoss[0], firstBoss[1]);
    }
  });

    tierToggleContainer.appendChild(button);
  }

  fragment.appendChild(tierToggleContainer);

  // Raid buttons
  const raidButtonsContainer = document.createElement('div');
  raidButtonsContainer.id = 'raid-buttons-container';
  raidButtonsContainer.className = 'raid-buttons-container';

  const raids = TIERS[currentTierKey].raids;
  for (const key in raids) {
    const raid = raids[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.raidKey = key;

    const img = document.createElement('img');
    img.src = 'public/images/' + key + '.webp';
    img.alt = raid.name;
    img.className = 'raid-icon';
    img.loading = 'lazy';

    const span = document.createElement('span');
    span.textContent = raid.name;

    btn.append(img, span);
    btn.addEventListener('click', createDebounced((e) => {
      e.preventDefault();
      if (currentRaidKey === key) return;

      currentRaidKey = key;
      selectActiveRaid(key);
      buildBossButtonsForRaid(key);

      const entries = Object.entries(raids[key].encounters);
      if (entries.length > 0) {
        const firstBoss = entries[0];
        fetchAndDisplayRankings(firstBoss[0], firstBoss[1]);
      } else {
        if (rankingsDiv) {
          rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ' + raid.name + ' yet.</div>';
        }
        updateLastUpdated(null);
        const el = document.querySelector('.talent-sidebar .talent-summary');
        if (el) {
          el.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
        }
      }
    }, 100), { passive: true });

    raidButtonsContainer.appendChild(btn);
  }

  fragment.appendChild(raidButtonsContainer);

  raidMenu.replaceChildren(fragment);
  selectActiveRaid(currentRaidKey);
}

function selectActiveRaid(raidKey) {
  const container = document.getElementById('raid-buttons-container');
  if (!container) return;
  const buttons = container.querySelectorAll('button');
  buttons.forEach(b => b.classList.remove('active'));
  const active = container.querySelector('button[data-raid-key="' + raidKey + '"]');
  if (active) active.classList.add('active');
}

function buildBossButtonsForRaid(raidKey) {
  if (!bossButtonsDiv) return;

  const fragment = document.createDocumentFragment();
  const raid = TIERS[currentTierKey].raids[raidKey];
  if (!raid) return;

  const encounters = raid.encounters;
  for (const [name, id] of Object.entries(encounters)) {
    const button = document.createElement('button');
    button.dataset.encounterId = String(id);
    button.dataset.bossName = name;

    const img = document.createElement('img');
    img.src = bossIconUrl(id); // normalized for ToT
    img.alt = name;
    img.className = 'boss-icon';
    img.loading = 'lazy';
    img.onerror = () => {
      img.src = 'https://assets.rpglogs.com/img/warcraft/abilities/inv_misc_questionmark.jpg';
    };

    const span = document.createElement('span');
    span.textContent = name;

    button.append(img, span);

    button.addEventListener('click', createDebounced((e) => {
      e.preventDefault();
      fetchAndDisplayRankings(name, id);
    }, 100), { passive: true });

    fragment.appendChild(button);
  }

  bossButtonsDiv.replaceChildren(fragment);
}

function selectActiveButton(encounterId) {
  if (!bossButtonsDiv) return;
  bossButtonsDiv.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  const active = bossButtonsDiv.querySelector('button[data-encounter-id="' + encounterId + '"]');
  if (active) active.classList.add('active');
}

function findRaidKeyByEncounterId(encounterId) {
  for (const tierKey in TIERS) {
    const tier = TIERS[tierKey];
    for (const raidKey in tier.raids) {
      const raid = tier.raids[raidKey];
      if (Object.values(raid.encounters).includes(encounterId)) {
        return { tierKey: tierKey, raidKey: raidKey };
      }
    }
  }
  return null;
}

/* --------------------------------------------------------------------------------
   Cache helpers
   -------------------------------------------------------------------------------- */
function readCache(encounterId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(encounterId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeCache(encounterId, data, cachedAt) {
  try {
    const ts = cachedAt || (new Date()).toISOString();
    localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data: data, cachedAt: ts }));
  } catch {}
}
function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return (Date.now() - ts) < CACHE_TTL_MS;
  } catch { return false; }
}
function formatAgo(dateish) {
  const ms = Date.now() - (typeof dateish === 'number' ? dateish : Date.parse(dateish));
  if (isNaN(ms)) return 'unknown';
  if (ms < 60000) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  return days + 'd ago';
}
function updateLastUpdated(isoOrEpoch) {
  if (!lastUpdatedEl) return;
  if (!isoOrEpoch) { lastUpdatedEl.textContent = ''; return; }
  const when = new Date(isoOrEpoch).toLocaleString();
  const ago = formatAgo(isoOrEpoch);
  lastUpdatedEl.textContent = 'Last updated: ' + when + ' (' + ago + ')';
}

/* --------------------------------------------------------------------------------
   Button state
   -------------------------------------------------------------------------------- */
let currentController = null;
function disableButtons(disabled) {
  const buttons = bossButtonsDiv ? bossButtonsDiv.querySelectorAll('button') : null;
  if (!buttons) return;
  requestAnimationFrame(() => {
    buttons.forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.7' : '';
      btn.style.cursor = disabled ? 'not-allowed' : '';
    });
  });
}

/* --------------------------------------------------------------------------------
   Performance logging
   -------------------------------------------------------------------------------- */
let performanceMetrics = { renderTimes: [], interactionTimes: [] };
function trackPerformance(name, startTime) {
  const duration = performance.now() - startTime;
  performanceMetrics.renderTimes.push({ name: name, duration: duration, timestamp: Date.now() });
  if (performanceMetrics.renderTimes.length > 20) {
    performanceMetrics.renderTimes = performanceMetrics.renderTimes.slice(-20);
  }
  console.log('Performance: ' + name + ' completed in ' + duration.toFixed(2) + 'ms');
}

/* --------------------------------------------------------------------------------
   Boot sequence
   -------------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const initStart = performance.now();

  createTierMenu();
  buildBossButtonsForRaid(currentRaidKey);

  const ph = parseHash();
  if (ph && ph.id) {
    const result = findRaidKeyByEncounterId(ph.id);
    if (result) {
      const tierKey = result.tierKey;
      const raidKey = result.raidKey;
      currentTierKey = tierKey;
      currentRaidKey = raidKey;

      createTierMenu();
      selectActiveRaid(raidKey);
      buildBossButtonsForRaid(raidKey);

      const entries = Object.entries(TIERS[tierKey].raids[raidKey].encounters);
      const match = entries.find(pair => pair[1] === ph.id);
      const bossName = match ? match[0] : 'Encounter';

      fetchAndDisplayRankings(bossName, ph.id);
      trackPerformance('Initial load from hash', initStart);
      return;
    }
  }

  const currentTier = TIERS[currentTierKey];
  const currentRaid = currentTier.raids[currentRaidKey];
  const entries = Object.entries(currentRaid.encounters);
  if (entries.length) {
    const firstBoss = entries[0];
    fetchAndDisplayRankings(firstBoss[0], firstBoss[1]);
  } else {
    if (rankingsDiv) {
      rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ' + currentRaid.name + ' yet.</div>';
    }
    updateLastUpdated(null);
    const el = document.querySelector('.talent-sidebar .talent-summary');
    if (el) {
      el.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
    }
  }

  trackPerformance('DOMContentLoaded', initStart);
});


// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle && navLinks) {
  mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-open');
    mobileMenuToggle.textContent = navLinks.classList.contains('mobile-open') ? '✕' : '☰';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('mobile-open');
      mobileMenuToggle.textContent = '☰';
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.top-nav')) {
      navLinks.classList.remove('mobile-open');
      mobileMenuToggle.textContent = '☰';
    }
  });
}
