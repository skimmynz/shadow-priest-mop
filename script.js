// Debounced DOM Updates with RequestAnimationFrame
const DOMUpdater = {
  pendingUpdates: new Map(),
  
  scheduleUpdate(key, updateFn) {
    this.pendingUpdates.set(key, updateFn);
    if (this.pendingUpdates.size === 1) {
      requestAnimationFrame(() => this.flushUpdates());
    }
  },
  
  flushUpdates() {
    this.pendingUpdates.forEach((updateFn) => updateFn());
    this.pendingUpdates.clear();
  }
};

// Template Cache for Performance
const TemplateCache = new Map();

function createTemplate(templateString) {
  if (!TemplateCache.has(templateString)) {
    const template = document.createElement('template');
    template.innerHTML = templateString;
    TemplateCache.set(templateString, template);
  }
  return TemplateCache.get(templateString);
}

// Intersection Observer for Lazy Loading Images
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    }
  });
}, { rootMargin: '50px' });

function createLazyImage(src, alt, className) {
  const img = document.createElement('img');
  img.dataset.src = src;
  img.alt = alt;
  img.className = className;
  img.loading = 'lazy';
  img.style.opacity = '0';
  img.style.transition = 'opacity 0.3s ease';
  
  // Set placeholder
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzc0MTUxIi8+CjwvcnZnPgo=';
  
  img.addEventListener('load', () => {
    img.style.opacity = '1';
  });
  
  imageObserver.observe(img);
  return img;
}

// Web Worker for Heavy Computations
class TalentAnalysisWorker {
  constructor() {
    this.worker = null;
    this.initWorker();
  }
  
  initWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { rankings, talentTiers, TIER_ORDER, VALID_TALENT_SET, TIER_BY_TALENT } = e.data;
        
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
        
        self.postMessage({ tierCounts, totalPerTier });
      };
      
      function getTalentDisplayName(apiName) {
        const talentNameMap = { "Surge of Light": "From Darkness, Comes Light", "Mind Control": "Dominate Mind" };
        return talentNameMap[apiName] ?? apiName;
      }
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch (e) {
      console.warn('Web Workers not supported, falling back to main thread');
    }
  }
  
  async analyzeTalents(rankings) {
    if (!this.worker) {
      return this.analyzeTalentsMainThread(rankings);
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 5000);
      
      this.worker.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data);
      };
      
      this.worker.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      
      this.worker.postMessage({
        rankings,
        talentTiers,
        TIER_ORDER,
        VALID_TALENT_SET: Array.from(VALID_TALENT_SET),
        TIER_BY_TALENT: Array.from(TIER_BY_TALENT.entries())
      });
    });
  }
  
  analyzeTalentsMainThread(rankings) {
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
    
    return { tierCounts, totalPerTier };
  }
  
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Initialize performance components
let talentWorker = new TalentAnalysisWorker();
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
  toes: { short: 'ToES', name: 'Terrace of Endless Spring', encounters: {} },
};

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

// FIXED: Event Delegation for Dropdown Toggle
function setupEventDelegation() {
  rankingsDiv.addEventListener('click', (e) => {
    const header = e.target.closest('.ranking-header');
    if (header) {
      const entryId = header.getAttribute('data-entry-id');
      if (entryId) {
        toggleDropdown(entryId);
      }
    }
  });
}

// FIXED: Toggle function with proper lazy loading
function toggleDropdown(entryId) {
  const dropdown = document.getElementById(entryId);
  const header = dropdown?.previousElementSibling;
  const expandIcon = header?.querySelector('.expand-icon');
  
  if (!dropdown || !expandIcon) return;
  
  const isActive = dropdown.classList.contains('active');
  
  // Close other dropdowns first
  document.querySelectorAll('.dropdown-content.active').forEach(el => {
    if (el.id !== entryId) {
      el.classList.remove('active');
      const otherIcon = el.previousElementSibling?.querySelector('.expand-icon');
      if (otherIcon) otherIcon.classList.remove('rotated');
    }
  });
  
  // Lazy load content if opening and not loaded
  if (!isActive) {
    const lazyContent = dropdown.querySelector('.lazy-content');
    if (lazyContent && !lazyContent.dataset.loaded) {
      try {
        const itemData = JSON.parse(lazyContent.dataset.item.replace(/&#39;/g, "'"));
        lazyContent.innerHTML = generateDropdownContent(itemData);
        lazyContent.dataset.loaded = 'true';
        
        // Initialize Wowhead tooltips for new content
        if (window.$WowheadPower) {
          setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
        }
      } catch (e) {
        console.warn('Failed to parse item data:', e);
        lazyContent.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 1rem;">Failed to load details</div>';
      }
    }
  }
  
  // Toggle current dropdown
  dropdown.classList.toggle('active', !isActive);
  expandIcon.classList.toggle('rotated', !isActive);
}

function generateDropdownContent(item) {
  const duration = formatDuration(item.duration);
  const itemLevel = item.itemLevel || 'N/A';
  const serverInfo = formatServerInfo(item.serverName, item.regionName);
  const faction = formatFaction(item.faction);
  const guildName = item.guildName || 'No Guild';
  const raidSize = item.size || 'N/A';
  const reportUrl = `https://classic.warcraftlogs.com/reports/${item.reportID}?fight=${item.fightID}&type=damage-done`;
  
  return `
    <div class="info-grid">
      <div class="info-section">
        <h4>Fight Details</h4>
        <div class="info-row">
          <span class="info-label">Duration:</span>
          <span class="info-value">${duration}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fight ID:</span>
          <span class="info-value">${item.fightID || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Report:</span>
          <span class="info-value">
            <a href="${reportUrl}" target="_blank" rel="noopener">${item.reportID || 'N/A'}</a>
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
        ${buildGearDisplay(item.gear)}
      </div>
    </div>
  `;
}

// ======= Slug & Hash helpers =======
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
        fetchAndDisplayRankings(bossName, encounterId);
      } else {
        rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added for ${raid.name} yet.</div>`;
        updateLastUpdated(null);
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

// ======= FIXED Fetch + Render =======
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
    
    // Use lazy loading for talent icons
    const img = createLazyImage(iconUrl, title, 'talent-icon-img');
    
    const classes = `talent-link${href ? ' wowhead' : ''}${isMeta ? ' is-meta' : ''}`;
    if (href) { 
      const link = document.createElement('a');
      link.className = classes;
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.appendChild(img);
      const percentDiv = document.createElement('div');
      percentDiv.className = 'talent-percent';
      percentDiv.setAttribute('aria-hidden', 'true');
      link.appendChild(percentDiv);
      return link.outerHTML;
    }
    const span = document.createElement('span');
    span.className = classes;
    span.appendChild(img);
    const percentDiv = document.createElement('div');
    percentDiv.className = 'talent-percent';
    percentDiv.setAttribute('aria-hidden', 'true');
    span.appendChild(percentDiv);
    return span.outerHTML;
  });
  return `<div class="talent-row">${cells.join('')}</div>`;
}

// FIXED: Standard Rendering without Virtual Scrolling for Working Dropdowns
function renderRankings(data, TOP_BY_TIER) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
  
  // Limit to 100 entries for performance
  const limitedRankings = rankings.slice(0, 100);
  
  let html = '';
  
  for (let index = 0; index < limitedRankings.length; index++) {
    const item = limitedRankings[index];
    const color = getColor(index + 1);
    const reportUrl = `https://classic.warcraftlogs.com/reports/${item.reportID}?fight=${item.fightID}&type=damage-done`;
    const dps = typeof item?.total === 'number' ? Math.round(item.total) : '—';
    const playerName = item?.name ?? 'Unknown';
    const entryId = `entry-${index}-${item.reportID}-${item.fightID}`;
    
    html += `
      <div class="rank-entry" data-index="${index}" data-entry-id="${entryId}">
        <div class="ranking-header" data-entry-id="${entryId}">
          <div class="name-wrapper" style="color:${color}">
              ${index + 1}. ${playerName} — ${dps.toLocaleString()} DPS
          </div>
          <div class="header-right">
            ${buildPlayerTalentIcons(item?.talents, TOP_BY_TIER)}
            <span class="expand-icon">▼</span>
          </div>
        </div>
        
        <div class="dropdown-content" id="${entryId}">
          <div class="lazy-content" data-entry-index="${index}" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
            <div style="text-align: center; color: #94a3b8; padding: 1rem;">Click to load details...</div>
          </div>
        </div>
      </div>
    `;
  }
  
  return html;
}

function getColor(rank) {
  if (rank === 1) return '#e5cc80';
  if (rank >= 2 && rank <= 25) return '#e268a8';
  return '#ff8000';
}

// OPTIMIZED: Talent Summary with Web Worker
async function optimizedRenderTalentSummary(data) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
  
  try {
    // Use web worker for heavy computation
    const { tierCounts, totalPerTier } = await talentWorker.analyzeTalents(rankings);
    
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
        
        // Use lazy loading for talent summary icons
        const img = createLazyImage(stat.iconUrl, stat.talent, 'talent-icon-img');
        const linkElement = document.createElement('a');
        linkElement.className = `talent-link wowhead ${isTop ? 'is-top' : ''}`;
        linkElement.href = stat.wowheadUrl;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener';
        linkElement.appendChild(img);
        
        const percentDiv = document.createElement('div');
        percentDiv.className = 'talent-percent';
        percentDiv.style.color = color;
        percentDiv.textContent = `${stat.percent}%`;
        linkElement.appendChild(percentDiv);
        
        talentSummaryHTML += linkElement.outerHTML;
      }
      talentSummaryHTML += `</div>`;
    }
    talentSummaryHTML += `</div>`;

    return { html: talentSummaryHTML, topByTier: TOP_BY_TIER };
  } catch (error) {
    console.warn('Talent analysis failed, falling back to main thread:', error);
    // Fallback to original implementation
    return renderTalentSummary(data);
  }
}

// Original render function for fallback
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

// FIXED: Main fetch function with standard rendering
async function fetchAndDisplayRankings(name, encounterId, { force = false } = {}) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Store current data for lazy loading
  const setCurrentData = (data) => {
    currentData = data;
  };

  // Fixed content rendering with batched updates
  const renderContentAndAttachListeners = async (data) => {
    try {
      // Use optimized talent summary generation
      const { html: talentSummaryHTML, topByTier } = await optimizedRenderTalentSummary(data);
      
      // Store data for lazy loading
      setCurrentData(data);
      
      // Batch DOM updates
      DOMUpdater.scheduleUpdate('main-content', () => {
        // Use standard rendering instead of virtual scrolling
        rankingsDiv.innerHTML = renderRankings(data, topByTier);
        
        // Update talent summary in sidebar
        const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
        if (talentSummaryElement) {
          talentSummaryElement.innerHTML = talentSummaryHTML;
        }
        
        // Refresh Wowhead tooltips after DOM update
        if (window.$WowheadPower) {
          setTimeout(() => window.$WowheadPower.refreshLinks(), 200);
        }
      });
      
    } catch (error) {
      console.error('Error in renderContentAndAttachListeners:', error);
      // Fallback to basic rendering
      const { html: talentSummaryHTML, topByTier } = renderTalentSummary(data);
      setCurrentData(data);
      rankingsDiv.innerHTML = renderRankings(data, topByTier);
      
      const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
      if (talentSummaryElement) {
        talentSummaryElement.innerHTML = talentSummaryHTML;
      }
    }
  };

  try {
    disableButtons(true);
    selectActiveButton(encounterId);
    updateHash(name, encounterId);
    
    // Show loading state
    DOMUpdater.scheduleUpdate('loading', () => {
      rankingsDiv.innerHTML = `<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ${name}…</p></div>`;
    });

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
      DOMUpdater.scheduleUpdate('error', () => {
        rankingsDiv.innerHTML = `<div style="text-align:center;color:red;margin-top:16px;">Couldn't load data for ${name}. Please try again later.</div>`;
      });
      updateLastUpdated(null);
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
  // Initialize event delegation
  setupEventDelegation();
  
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
    const talentSummaryElement = document.querySelector('.talent-sidebar .talent-summary');
    if (talentSummaryElement) {
      talentSummaryElement.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">No talent data available</div>';
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (talentWorker) {
    talentWorker.destroy();
  }
  if (currentController) {
    currentController.abort();
  }
});

// Performance monitoring (optional)
if (typeof PerformanceObserver !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' && entry.name.startsWith('rankings-')) {
        console.log(`Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
      }
    }
  });
  observer.observe({ entryTypes: ['measure'] });
}
