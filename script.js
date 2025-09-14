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

// Optimized DOM batch updates
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
    const fragment = document.createDocumentFragment();
    this.pendingUpdates.forEach(updateFn => updateFn(fragment));
    
    // Single DOM write
    if (fragment.children.length > 0) {
      const container = document.getElementById('rankings');
      container?.replaceChildren(fragment);
    }
    
    this.pendingUpdates.clear();
    this.isScheduled = false;
  }
}

// Initialize optimized components
const domBatcher = new DOMBatcher();
const scheduler = window.scheduler || {
  postTask: (fn, options) => {
    const priority = options?.priority || 'background';
    if (priority === 'user-blocking') {
      return Promise.resolve().then(fn);
    }
    return new Promise(resolve => setTimeout(() => resolve(fn()), 0));
  }
};

// Debounced event handlers
function createDebounced(fn, delay = 100, immediate = false) {
  let timeoutId;
  let lastArgs;
  
  const debounced = function(...args) {
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

// Optimized talent analysis with time-slicing
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

  // Process rankings in time-sliced chunks
  await TimeSlicing.processInChunks(
    rankings,
    async (chunk) => {
      return chunk.map(entry => {
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
        return entry;
      });
    },
    25, // Smaller chunk size for better yielding
    2   // Yield more frequently
  );

  return { tierCounts, totalPerTier };
}

// Optimized rendering with virtual scrolling concepts
class OptimizedRenderer {
  constructor(container) {
    this.container = container;
    this.renderCache = new Map();
  }

  async renderRankings(data, topByTier) {
    const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
    const visibleRankings = rankings.slice(0, 100);
    
    // Pre-calculate all rank colors
    const rankColors = new Map();
    for (let i = 0; i < visibleRankings.length; i++) {
      const rank = i + 1;
      if (rank === 1) rankColors.set(i, '#e5cc80');
      else if (rank >= 2 && rank <= 25) rankColors.set(i, '#e268a8');
      else rankColors.set(i, '#ff8000');
    }

    // Time-slice the rendering process
    const renderedEntries = await TimeSlicing.processInChunks(
      visibleRankings,
      async (chunk) => {
        return chunk.map((r, localIndex) => {
          const globalIndex = visibleRankings.indexOf(r);
          return this.renderSingleEntry(r, globalIndex, rankColors.get(globalIndex), topByTier);
        });
      },
      10, // Small chunks for better responsiveness
      1   // Yield after every chunk
    );

    return renderedEntries.join('');
  }

  renderSingleEntry(r, index, color, topByTier) {
    const cacheKey = `${r.reportID}-${r.fightID}-${index}`;
    if (this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey);
    }

    const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;
    const dps = typeof r?.total === 'number' ? Math.round(r.total) : '—';
    const playerName = r?.name ?? 'Unknown';
    const perPlayerTalents = this.buildPlayerTalentIcons(r?.talents, topByTier);
    
    const entryId = `entry-${index}-${r.reportID}-${r.fightID}`;
    
    const html = `
      <div class="rank-entry">
        <div class="ranking-header" onclick="toggleDropdown('${entryId}')">
          <div class="name-wrapper" style="color:${color}">
              ${index + 1}. ${playerName} — ${dps.toLocaleString()} DPS
          </div>
          <div class="header-right">
            ${perPlayerTalents}
            <span class="expand-icon">▼</span>
          </div>
        </div>
        
        <div class="dropdown-content" id="${entryId}">
          ${this.renderDropdownContent(r, reportUrl)}
        </div>
      </div>
    `;

    this.renderCache.set(cacheKey, html);
    return html;
  }

  renderDropdownContent(r, reportUrl) {
    // Lazy render dropdown content only when needed
    return `
      <div class="dropdown-placeholder" data-report-id="${r.reportID}" data-fight-id="${r.fightID}">
        <div style="text-align: center; padding: 1rem; color: #94a3b8;">
          Click to load details...
        </div>
      </div>
    `;
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
      const name = chosenByTier.get(tier) ?? null;
      const iconUrl = talentIconUrl(name);
      const spellId = name ? getSpellId(name) : 0;
      const href = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : null;
      const title = name ?? 'Unknown (no data)';
      const metaInfo = topByTier?.get(tier);
      const isMeta = !!(name && metaInfo && metaInfo.winners.has(name));
      
      const img = `<img class="talent-icon-img" loading="lazy" src="${iconUrl}" alt="${title}" />`;
      const classes = `talent-link${href ? ' wowhead' : ''}${isMeta ? ' is-meta' : ''}`;
      
      if (href) {
        return `<a class="${classes}" href="${href}" target="_blank" rel="noopener">${img}<div class="talent-percent" aria-hidden="true"></div></a>`;
      }
      return `<span class="${classes}">${img}<div class="talent-percent" aria-hidden="true"></div></span>`;
    });
    
    return `<div class="talent-row">${cells.join('')}</div>`;
  }
}

// Optimized dropdown toggle with lazy loading
const debouncedToggleDropdown = createDebounced(async function(entryId) {
  const dropdown = document.getElementById(entryId);
  const header = dropdown?.previousElementSibling;
  const expandIcon = header?.querySelector('.expand-icon');
  
  if (!dropdown || !expandIcon) return;
  
  const isActive = dropdown.classList.contains('active');
  
  // Close other dropdowns immediately (no animation needed)
  const otherDropdowns = document.querySelectorAll('.dropdown-content.active');
  otherDropdowns.forEach(el => {
    if (el.id !== entryId) {
      el.classList.remove('active');
      const otherIcon = el.previousElementSibling?.querySelector('.expand-icon');
      if (otherIcon) otherIcon.classList.remove('rotated');
    }
  });
  
  if (!isActive) {
    // Lazy load dropdown content if it's a placeholder
    const placeholder = dropdown.querySelector('.dropdown-placeholder');
    if (placeholder) {
      const reportId = placeholder.dataset.reportId;
      const fightId = placeholder.dataset.fightId;
      await loadDropdownContent(dropdown, reportId, fightId);
    }
  }
  
  // Toggle current dropdown
  dropdown.classList.toggle('active', !isActive);
  expandIcon.classList.toggle('rotated', !isActive);
}, 50, true); // Immediate execution with trailing debounce

// Lazy load dropdown content
async function loadDropdownContent(dropdown, reportId, fightId) {
  if (!currentData?.rankings) return;
  
  const entry = currentData.rankings.find(r => 
    r.reportID === reportId && r.fightID === parseInt(fightId)
  );
  
  if (!entry) return;
  
  const reportUrl = `https://classic.warcraftlogs.com/reports/${reportId}?fight=${fightId}&type=damage-done`;
  const duration = formatDuration(entry.duration);
  const itemLevel = entry.itemLevel || 'N/A';
  const serverInfo = formatServerInfo(entry.serverName, entry.regionName);
  const faction = formatFaction(entry.faction);
  const guildName = entry.guildName || 'No Guild';
  const raidSize = entry.size || 'N/A';
  
  const content = `
    <div class="info-grid">
      <div class="info-section">
        <h4>Fight Details</h4>
        <div class="info-row">
          <span class="info-label">Duration:</span>
          <span class="info-value">${duration}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fight ID:</span>
          <span class="info-value">${fightId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Report:</span>
          <span class="info-value">
            <a href="${reportUrl}" target="_blank" rel="noopener">${reportId}</a>
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
        ${buildGearDisplay(entry.gear)}
      </div>
    </div>
  `;
  
  dropdown.innerHTML = content;
}

// Global toggle function for backwards compatibility
function toggleDropdown(entryId) {
  debouncedToggleDropdown(entryId);
}

// Initialize optimized renderer
const optimizedRenderer = new OptimizedRenderer();
let currentData = null;

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
  hof: {
    short: 'HoF',
    name: 'Heart of Fear',
    encounters: {
      "Imperial Vizier Zor'lok": 1507,
      "Blade Lord Ta'yak": 1504,
      "Garalon": 1463,
      "Wind Lord Mel'jarak": 1498,
      "Amber-Shaper Un'sok": 1499,
      "Grand Empress Shek'zeer": 1501,
    },
  },
  toes: { 
    short: 'ToES', 
    name: 'Terrace of Endless Spring', 
    encounters: {
      "Protectors of the Endless": 1409,
      "Tsulong": 1505,
      "Lei Shi": 1506,
      "Sha of Fear": 1431,
    }
  },
};

let currentRaidKey = 'msv';

// DOM refs with null checks
const raidMenu = document.getElementById('raid-menu');
const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');

// Optimized last updated element creation
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

// Cache and API configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = (encounterId) => `spriest_rankings_${encounterId}`;
const API_URL = (encounterId) => `/.netlify/functions/getLogs?encounterId=${encounterId}`;

// Talent data
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
  "Halo": "ability_priest_halo",
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
  "Halo": 120517,
};

const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind"
};

// Precomputed helpers
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

// Utility functions
function formatDuration(ms) {
  if (!ms || ms === 0) return 'N/A';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatFaction(faction) {
  return faction === 1 ? 'Alliance' : faction === 0 ? 'Horde' : 'Unknown';
}

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
    if (!item || item.id === 0) return '';

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

// Optimized talent summary rendering
async function renderTalentSummary(data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
  
  // Use optimized analysis
  const { tierCounts, totalPerTier } = await analyzeTalentsOptimized(rankings);
  
  const TOP_BY_TIER = new Map();
  let talentSummaryHTML = '<div class="talent-summary-content">';
  
  for (const tier of TIER_ORDER) {
    const total = totalPerTier[tier] ?? 0;
    const rowStats = talentTiers[tier].map((talent) => {
      const count = tierCounts[tier][talent] ?? 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      const percent = percentNum.toFixed(1);
      const iconUrl = talentIconUrl(talent);
      const spellId = getSpellId(talent);
      const wowheadUrl = spellId ? `https://www.wowhead.com/mop-classic/spell=${spellId}` : 'https://www.wowhead.com/';
      return { talent, percentNum, percent, iconUrl, wowheadUrl };
    });
    
    const maxPct = Math.max(...rowStats.map((s) => s.percentNum), 0);
    const EPS = 0.05;
    const winners = rowStats.filter((s) => s.percentNum >= maxPct - EPS && maxPct > 0).map((s) => s.talent);
    TOP_BY_TIER.set(tier, { winners: new Set(winners), percent: maxPct });
    
    talentSummaryHTML += '<div class="talent-row">';
    for (const stat of rowStats) {
      const isTop = stat.percentNum >= maxPct - EPS && maxPct > 0;
      const color = stat.percentNum >= 75 ? 'limegreen' : stat.percentNum <= 10 ? 'red' : 'orange';
      talentSummaryHTML += `<a class="talent-link wowhead ${isTop ? 'is-top' : ''}" href="${stat.wowheadUrl}" target="_blank" rel="noopener"><img class="talent-icon-img" loading="lazy" src="${stat.iconUrl}" alt="${stat.talent}" /><div class="talent-percent" style="color:${color}">${stat.percent}%</div></a>`;
    }
    talentSummaryHTML += '</div>';
  }
  talentSummaryHTML += '</div>';

  return { html: talentSummaryHTML, topByTier: TOP_BY_TIER };
}

// Optimized main fetch and display function
async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  // Performance timing
  const startTime = performance.now();
  
  if (currentController) currentController.abort();
  currentController = new AbortController();

  const PARSING_RULES = {
  // MSV
  1395: { // The Stone Guard
    title: "The Stone Guard",
    rules: [
      "The damage bonus from Energized Tiles is normalized."
    ]
  },
  1390: { // Feng the Accursed
    title: "Feng the Accursed", 
    rules: [
      "Damage done to Soul Fragments is removed."
    ]
  },
  1434: { // Gara'jal the Spiritbinder
    title: "Gara'jal the Spiritbinder",
    rules: [
      "Damage done to Spirit Totems is removed."
    ]
  },
  1436: { // The Spirit Kings
    title: "The Spirit Kings",
    rules: [
      "No rules, though friendly fire damage (during Mind Control) is already excluded."
    ]
  },
  1500: { // Elegon
    title: "Elegon",
    rules: [
      "Damage done during Draw Power is normalized, and damage done to Cosmic Sparks is removed."
    ]
  },
  1407: { // Will of the Emperor
    title: "Will of the Emperor",
    rules: [
      "Damage done to Emperor's Rage is removed from 25-man Heroic.",
      "Will of the Emperor is removed from Damage All Star Points."
    ]
  },
  
  // HoF
  1507: { // Imperial Vizier Zor'lok
    title: "Imperial Vizier Zor'lok",
    rules: [
      "Damage done to adds that don't die is removed."
    ]
  },
  1504: { // Blade Lord Ta'yak
    title: "Blade Lord Ta'yak",
    rules: [
      "No rules."
    ]
  },
  1463: { // Garalon
    title: "Garalon",
    rules: [
      "Garalon is removed from Damage All Star Points."
    ]
  },
  1498: { // Wind Lord Mel'jarak
    title: "Wind Lord Mel'jarak",
    rules: [
      "Damage done to adds that don't die is removed."
    ]
  },
  1499: { // Amber-Shaper Un'sok
    title: "Amber-Shaper Un'sok",
    rules: [
      "Amber-Shaper is removed from All Star Points (both Damage and Healing)."
    ]
  },
  1501: { // Grand Empress Shek'zeer
    title: "Grand Empress Shek'zeer",
    rules: [
      "Damage done to Kor'thik Reavers and Set'thik Windblades is removed."
    ]
  },
  
  // ToES
  1409: { // Protectors of the Endless
    title: "Protectors of the Endless",
    rules: [
      "Damage done to bosses that heal to full is removed.",
      "Damage gained from Corrupted Essence is normalized.",
      "Only Hardmode/Elite order ranks as Heroic. This means Protector Kaolan has to die last."
    ]
  },
  1505: { // Tsulong
    title: "Tsulong",
    rules: [
      "Damage done to The Dark of Night, Fright Spawn, and Embodied Terrors is removed."
    ]
  },
  1506: { // Lei Shi
    title: "Lei Shi",
    rules: [
      "Damage done to Animated Protectors is removed."
    ]
  },
  1431: { // Sha of Fear
    title: "Sha of Fear",
    rules: [
      "Sha of Fear is removed from Damage ASP."
    ]
  }
};

// Function to render parsing rules
function renderParsingRules(encounterId) {
  const rules = PARSING_RULES[encounterId];
  if (!rules) return '';
  
  const ruleItems = rules.rules.map(rule => `
    <li class="parsing-rule-item">${rule}</li>
  `).join('');
  
  return `
    <div class="parsing-rules-container">
      <div class="parsing-rules-header">
        <h3>Parsing Rules</h3>
        <div class="parsing-rules-icon">📊</div>
      </div>
      <ul class="parsing-rules-list">
        ${ruleItems}
      </ul>
    </div>
  `;
}

  const renderContentAndAttachListeners = async (data) => {
    currentData = data; // Store for lazy loading
    
    // Use Promise.all to parallelize talent summary and rankings rendering
    const [talentResult, rankingsHTML] = await Promise.all([
      renderTalentSummary(data),
      optimizedRenderer.renderRankings(data, null) // We'll update topByTier after
    ]);
    
    const { html: talentSummaryHTML, topByTier } = talentResult;
    
    // Update rankings with talent analysis
    const finalRankingsHTML = await optimizedRenderer.renderRankings(data, topByTier);

    // Batch DOM updates
    domBatcher.schedule('rankings', () => {
      if (rankingsDiv) {
        rankingsDiv.innerHTML = finalRankingsHTML;
      }
    });
    
    domBatcher.schedule('talents', () => {
      const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
      if (talentSummaryElement) {
        talentSummaryElement.innerHTML = talentSummaryHTML;
      }
    });

    // Refresh Wowhead tooltips
    scheduler.postTask(() => {
      if (window.$WowheadPower) {
        window.$WowheadPower.refreshLinks();
      }
    }, { priority: 'background' });
    
    const endTime = performance.now();
    console.log(`Rendering completed in ${endTime - startTime}ms`);
  };

  try {
    disableButtons(true);
    selectActiveButton(encounterId);
    updateHash(name, encounterId);
    
    if (rankingsDiv) {
      rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ${name}…</p></div>`;
    }

    const cached = readCache(encounterId);
    const cachedAt = cached?.cachedAt || cached?.data?.cachedAt;
    
    if (cached && isFresh(cachedAt) && !force) {
      updateLastUpdated(cachedAt);
      await renderContentAndAttachListeners(cached.data);
      return;
    }

    const res = await fetch(API_URL(encounterId), { 
      signal: currentController.signal, 
      headers: { 'accept': 'application/json' } 
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const serverTs = data.cachedAt || new Date().toISOString();
    
    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    await renderContentAndAttachListeners(data);

  } catch (err) {
    if (err?.name === 'AbortError') return;
    
    console.error('Failed to fetch rankings:', err);
    const cached = readCache(encounterId);
    
    if (cached) {
      updateLastUpdated(cached.cachedAt || cached.data?.cachedAt);
      await renderContentAndAttachListeners(cached.data);
    } else {
      if (rankingsDiv) {
        rankingsDiv.innerHTML = `<div style="text-align:center;color:red;margin-top:16px;">Couldn't load data for ${name}. Please try again later.</div>`;
      }
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

// Keep your existing utility functions but optimize them
function slugify(str) { 
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-'); 
}

function hashFor(name, encounterId) { 
  return `#${slugify(name)}-${encounterId}`; 
}

function updateHash(name, encounterId) { 
  try { 
    history.replaceState(null, '', hashFor(name, encounterId)); 
  } catch {} 
}

function parseHash() {
  const h = location.hash ?? '';
  const m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
  if (m) return { slug: m[1].toLowerCase(), id: parseInt(m[2], 10) };
  const legacy = h.match(/^#e-(\d+)$/i);
  if (legacy) return { slug: 'e', id: parseInt(legacy[1], 10), legacy: true };
  return null;
}

// Optimized raid and boss menu creation
function createRaidMenu() {
  if (!raidMenu) return;
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
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
    
    // Use passive event listeners where possible
    btn.addEventListener('click', createDebounced((e) => {
      e.preventDefault();
      if (currentRaidKey === key) return;
      
      currentRaidKey = key;
      selectActiveRaid(key);
      buildBossButtonsForRaid(key);
      
      const entries = Object.entries(RAIDS[key].encounters);
      if (entries.length > 0) {
        const [bossName, encounterId] = entries[0];
        fetchAndDisplayRankings(bossName, encounterId);
      } else {
        if (rankingsDiv) {
          rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${raid.name} yet.</div>`;
        }
        updateLastUpdated(null);
        
        const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
        if (talentSummaryElement) {
          talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
        }
      }
    }, 100), { passive: true });
    
    fragment.appendChild(btn);
  }
  
  raidMenu.replaceChildren(fragment);
  selectActiveRaid(currentRaidKey);
}

function selectActiveRaid(raidKey) {
  raidMenu?.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
  const active = raidMenu?.querySelector(`button[data-raid-key="${raidKey}"]`);
  active?.classList.add('active');
}

function buildBossButtonsForRaid(raidKey) {
  if (!bossButtonsDiv) return;
  
  const fragment = document.createDocumentFragment();
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
    
    button.addEventListener('click', createDebounced((e) => {
      e.preventDefault();
      fetchAndDisplayRankings(name, id);
    }, 100), { passive: true });
    
    fragment.appendChild(button);
  }
  
  bossButtonsDiv.replaceChildren(fragment);
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

// Cache helpers (optimized)
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
    localStorage.setItem(CACHE_KEY(encounterId), JSON.stringify({ data, cachedAt })); 
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
  if (!isoOrEpoch) { 
    lastUpdatedEl.textContent = ''; 
    return; 
  }
  const when = new Date(isoOrEpoch).toLocaleString();
  const ago = formatAgo(isoOrEpoch);
  lastUpdatedEl.textContent = `Last updated: ${when} (${ago})`;
}

// Optimized button state management
let currentController = null;

function disableButtons(disabled) {
  const buttons = bossButtonsDiv?.querySelectorAll('button');
  if (!buttons) return;
  
  // Use requestAnimationFrame for visual updates
  requestAnimationFrame(() => {
    buttons.forEach((btn) => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.7' : '';
      btn.style.cursor = disabled ? 'not-allowed' : '';
    });
  });
}

// Initialize performance monitoring
let performanceMetrics = {
  renderTimes: [],
  interactionTimes: []
};

function trackPerformance(name, startTime) {
  const duration = performance.now() - startTime;
  performanceMetrics.renderTimes.push({ name, duration, timestamp: Date.now() });
  
  // Keep only last 20 measurements
  if (performanceMetrics.renderTimes.length > 20) {
    performanceMetrics.renderTimes = performanceMetrics.renderTimes.slice(-20);
  }
  
  console.log(`Performance: ${name} completed in ${duration.toFixed(2)}ms`);
}

// Boot sequence with performance optimizations
document.addEventListener('DOMContentLoaded', () => {
  const initStart = performance.now();

  // Create raid menu and boss buttons
  createRaidMenu();
  buildBossButtonsForRaid(currentRaidKey);

  // Handle initial routing
  const ph = parseHash();
  if (ph && ph.id) {
    const rk = findRaidKeyByEncounterId(ph.id);
    if (rk) {
      currentRaidKey = rk;
      selectActiveRaid(rk);
      buildBossButtonsForRaid(rk);
      const bossName = Object.entries(RAIDS[rk].encounters).find(([, id]) => id === ph.id)?.[0] ?? 'Encounter';
      fetchAndDisplayRankings(bossName, ph.id);
      trackPerformance('Initial load from hash', initStart);
      return;
    }
  }

  // Load default encounter
  const entries = Object.entries(RAIDS[currentRaidKey].encounters);
  if (entries.length) {
    const [bossName, encounterId] = entries[0];
    fetchAndDisplayRankings(bossName, encounterId);
  } else {
    if (rankingsDiv) {
      rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${RAIDS[currentRaidKey].name} yet.</div>`;
    }
    updateLastUpdated(null);
    
    const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
    if (talentSummaryElement) {
      talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
    }
  }
  
  trackPerformance('DOMContentLoaded', initStart);
});
