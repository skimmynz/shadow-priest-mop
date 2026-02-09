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
    var priority = options && options.priority ? options.priority : 'background';
    if (priority === 'user-blocking') return Promise.resolve().then(fn);
    return new Promise(resolve => setTimeout(() => resolve(fn()), 0));
  }
};

// Debounce
function createDebounced(fn, delay = 100, immediate = false) {
  let timeoutId = null;
  let lastArgs = null;
  return function (...args) {
    lastArgs = args;
    if (immediate && !timeoutId) fn.apply(this, args);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) fn.apply(this, lastArgs);
    }, delay);
  };
}

/* --------------------------------------------------------------------------------
   Boss icon helpers
   -------------------------------------------------------------------------------- */
function getBossIconId(encounterId) {
  if (encounterId >= 51559 && encounterId <= 51580) return encounterId - 50000;
  return encounterId;
}
function bossIconUrl(encounterId) {
  return 'https://assets.rpglogs.com/img/warcraft/bosses/' + getBossIconId(encounterId) + '-icon.jpg?v=2';
}

/* --------------------------------------------------------------------------------
   Talent analysis
   -------------------------------------------------------------------------------- */
async function analyzeTalentsOptimized(rankings) {
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return { tierCounts: {}, totalPerTier: {} };
  }
  var tierCounts = {}, totalPerTier = {};
  for (var tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (var talent of talentTiers[tier]) tierCounts[tier][talent] = 0;
  }
  await TimeSlicing.processInChunks(rankings, async (chunk) => {
    return chunk.map(entry => {
      var seenTiers = new Set();
      var talents = Array.isArray(entry && entry.talents) ? entry.talents : [];
      for (var t of talents) {
        var displayName = getTalentDisplayName(t.name);
        if (!VALID_TALENT_SET.has(displayName)) continue;
        var tier = TIER_BY_TALENT.get(displayName);
        if (tier && !seenTiers.has(tier)) {
          tierCounts[tier][displayName]++;
          totalPerTier[tier]++;
          seenTiers.add(tier);
        }
      }
      return entry;
    });
  }, 25, 2);
  return { tierCounts, totalPerTier };
}

/* --------------------------------------------------------------------------------
   Optimized Renderer
   -------------------------------------------------------------------------------- */
class OptimizedRenderer {
  constructor() { this.renderCache = new Map(); }

  async renderRankings(data, topByTier) {
    var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
    var visible = rankings.slice(0, 100);
    var rankColors = new Map();
    for (var i = 0; i < visible.length; i++) {
      var rank = i + 1;
      if (rank === 1) rankColors.set(i, '#e5cc80');
      else if (rank <= 25) rankColors.set(i, '#e268a8');
      else rankColors.set(i, '#ff8000');
    }
    var rendered = await TimeSlicing.processInChunks(visible, async (chunk) => {
      return chunk.map(r => {
        var idx = visible.indexOf(r);
        return this.renderSingleEntry(r, idx, rankColors.get(idx), topByTier);
      });
    }, 10, 1);
    return rendered.join('');
  }

  renderSingleEntry(r, index, color, topByTier) {
    // Cache by reportID + fightID + original rank (not display index)
    var cacheKey = r.reportID + '-' + r.fightID + '-' + index;
    if (this.renderCache.has(cacheKey)) return this.renderCache.get(cacheKey);

    var reportUrl = 'https://classic.warcraftlogs.com/reports/' + r.reportID + '?fight=' + r.fightID + '&type=damage-done';
    var dps = (r && typeof r.total === 'number') ? Math.round(r.total) : '—';
    var playerName = (r && r.name) ? r.name : 'Unknown';
    var perPlayerTalents = this.buildPlayerTalentIcons(r && r.talents, topByTier);
    var entryId = 'entry-' + index + '-' + r.reportID + '-' + r.fightID;
    var duration = formatDuration(r.duration);
    var itemLevel = (r.itemLevel != null) ? r.itemLevel : 'N/A';
    var server = formatServerInfo(r.serverName, r.regionName);
    var killDate = formatKillDate(r.startTime);
    var searchData = playerName.toLowerCase();

    var html =
      '<div class="rank-entry" data-original-rank="' + (index + 1) + '" data-dps="' + dps + '" data-ilvl="' + itemLevel + '" data-duration="' + (r.duration || 0) + '" data-name="' + playerName + '" data-search="' + searchData + '" data-region="' + (r.regionName || '').toLowerCase() + '">' +
      '<div class="ranking-header" onclick="toggleDropdown(\'' + entryId + '\')">' +
      '<div class="name-wrapper" style="color:' + color + '">' +
      (index + 1) + '. ' + playerName + ' — ' + (typeof dps === 'number' ? dps.toLocaleString() : dps) + ' DPS' +
      '</div>' +
      '<div class="header-right">' +
      '<span class="fight-summary">' + server + ' - ' + duration + ' - ' + itemLevel + ' iLvl - ' + killDate + '</span>' +
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
      '<div style="text-align: center; padding: 1rem; color: #94a3b8;">Click to load details...</div>' +
      '</div>'
    );
  }

  buildPlayerTalentIcons(playerTalentsRaw, topByTier) {
    var chosenByTier = new Map();
    var talents = Array.isArray(playerTalentsRaw) ? playerTalentsRaw : [];
    for (var t of talents) {
      var displayName = getTalentDisplayName(t.name);
      if (!VALID_TALENT_SET.has(displayName)) continue;
      var tier = TIER_BY_TALENT.get(displayName);
      if (tier && !chosenByTier.has(tier)) chosenByTier.set(tier, displayName);
    }
    var cells = TIER_ORDER.map(tier => {
      var name = chosenByTier.get(tier) || null;
      var iconUrl = talentIconUrl(name);
      var spellId = name ? getSpellId(name) : 0;
      var href = spellId ? ('https://www.wowhead.com/mop-classic/spell=' + spellId) : null;
      var title = name || 'Unknown';
      var metaInfo = topByTier && topByTier.get ? topByTier.get(tier) : null;
      var isMeta = !!(name && metaInfo && metaInfo.winners && metaInfo.winners.has(name));
      var img = '<img class="talent-icon-img" loading="lazy" src="' + iconUrl + '" alt="' + title + '" />';
      var classes = 'talent-link' + (href ? ' wowhead' : '') + (isMeta ? ' is-meta' : '');
      if (href) return '<a class="' + classes + '" href="' + href + '" target="_blank" rel="noopener">' + img + '<div class="talent-percent" aria-hidden="true"></div></a>';
      return '<span class="' + classes + '">' + img + '<div class="talent-percent" aria-hidden="true"></div></span>';
    });
    return '<div class="talent-row">' + cells.join('') + '</div>';
  }
}

/* --------------------------------------------------------------------------------
   Dropdown toggle
   -------------------------------------------------------------------------------- */
var debouncedToggleDropdown = createDebounced(async function (entryId) {
  var dropdown = document.getElementById(entryId);
  var header = dropdown ? dropdown.previousElementSibling : null;
  var expandIcon = header ? header.querySelector('.expand-icon') : null;
  if (!dropdown || !expandIcon) return;

  var isActive = dropdown.classList.contains('active');
  document.querySelectorAll('.dropdown-content.active').forEach(el => {
    if (el.id !== entryId) {
      el.classList.remove('active');
      var otherIcon = el.previousElementSibling ? el.previousElementSibling.querySelector('.expand-icon') : null;
      if (otherIcon) otherIcon.classList.remove('rotated');
    }
  });

  if (!isActive) {
    var placeholder = dropdown.querySelector('.dropdown-placeholder');
    if (placeholder) {
      await loadDropdownContent(dropdown, placeholder.dataset.reportId, placeholder.dataset.fightId);
    }
  }
  dropdown.classList.toggle('active', !isActive);
  expandIcon.classList.toggle('rotated', !isActive);
}, 50, true);

async function loadDropdownContent(dropdown, reportId, fightId) {
  if (!currentData || !currentData.rankings) return;
  var entry = currentData.rankings.find(r => r.reportID === reportId && r.fightID === parseInt(fightId, 10));
  if (!entry) return;
  var reportUrl = 'https://classic.warcraftlogs.com/reports/' + reportId + '?fight=' + fightId + '&type=damage-done';
  dropdown.innerHTML =
    '<div class="info-section">' +
    '<h4>Gear & Equipment <span class="report-link-inline">Report: <a href="' + reportUrl + '" target="_blank" rel="noopener">' + reportId + '</a></span></h4>' +
    '<div class="gear-grid">' + buildGearDisplay(entry.gear) + '</div>' +
    '</div>';
}

function toggleDropdown(entryId) { debouncedToggleDropdown(entryId); }

var optimizedRenderer = new OptimizedRenderer();
var currentData = null;

/* --------------------------------------------------------------------------------
   Search & Sort State
   -------------------------------------------------------------------------------- */
var currentSearch = '';
var currentSort = 'dps-desc';
var currentRegionFilter = '';

/* --------------------------------------------------------------------------------
   Tier / Raids data
   -------------------------------------------------------------------------------- */
var TIERS = {
  t14: {
    name: 'T14',
    raids: {
      msv: { short: 'MSV', name: "Mogu'shan Vaults", encounters: { "The Stone Guard": 1395, "Feng the Accursed": 1390, "Gara'jal the Spiritbinder": 1434, "The Spirit Kings": 1436, "Elegon": 1500, "Will of the Emperor": 1407 } },
      hof: { short: 'HoF', name: 'Heart of Fear', encounters: { "Imperial Vizier Zor'lok": 1507, "Blade Lord Ta'yak": 1504, "Garalon": 1463, "Wind Lord Mel'jarak": 1498, "Amber-Shaper Un'sok": 1499, "Grand Empress Shek'zeer": 1501 } },
      toes: { short: 'ToES', name: 'Terrace of Endless Spring', encounters: { "Protectors of the Endless": 1409, "Tsulong": 1505, "Lei Shi": 1506, "Sha of Fear": 1431 } }
    }
  },
  t15: {
    name: 'T15',
    raids: {
      tot: { short: 'ToT', name: 'Throne of Thunder', encounters: { "Jin'rokh the Breaker": 51577, "Horridon": 51575, "Council of Elders": 51570, "Tortos": 51565, "Megaera": 51578, "Ji-Kun": 51573, "Durumu the Forgotten": 51572, "Primordius": 51574, "Dark Animus": 51576, "Iron Qon": 51559, "Twin Empyreans": 51560, "Lei Shen": 51579, "Ra-den": 51580 } }
    }
  }
};
var currentTierKey = 't15';
var currentRaidKey = 'tot';
var currentBossName = '';
var currentEncounterId = null;

// DOM refs — new context bar elements
var tierToggleEl = document.getElementById('tier-toggle');
var raidPillsEl = document.getElementById('raid-pills');
var bossStripEl = document.getElementById('boss-strip');
var bossStripWrapper = document.querySelector('.boss-strip-wrapper');

// Existing DOM refs
var rankingsDiv = document.getElementById('rankings');
var searchInput = document.getElementById('search-input');
var searchClear = document.getElementById('search-clear');
var sortSelect = document.getElementById('sort-select');
var regionFilter = document.getElementById('region-filter');
var resultCountEl = document.getElementById('toolbar-result-count');

// Last updated
var lastUpdatedEl = document.getElementById('last-updated');
if (!lastUpdatedEl) {
  var h1 = document.querySelector('h1');
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
var CACHE_TTL_MS = 60 * 60 * 1000;
var CACHE_KEY = function(id) { return 'spriest_rankings_' + id; };
var API_URL = function(id) { return '/.netlify/functions/getLogs?encounterId=' + id; };

/* --------------------------------------------------------------------------------
   Talents
   -------------------------------------------------------------------------------- */
var talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"]
};
var talentIcons = {
  "Void Tendrils": "spell_priest_voidtendrils", "Psyfiend": "spell_priest_psyfiend",
  "Dominate Mind": "spell_shadow_shadowworddominate", "Body and Soul": "spell_holy_symbolofhope",
  "Angelic Feather": "ability_priest_angelicfeather", "Phantasm": "ability_priest_phantasm",
  "From Darkness, Comes Light": "spell_holy_surgeoflight", "Mindbender": "spell_shadow_soulleech_3",
  "Solace and Insanity": "ability_priest_flashoflight", "Desperate Prayer": "spell_holy_testoffaith",
  "Spectral Guise": "spell_priest_spectralguise", "Angelic Bulwark": "ability_priest_angelicbulwark",
  "Twist of Fate": "spell_shadow_mindtwisting", "Power Infusion": "spell_holy_powerinfusion",
  "Divine Insight": "spell_priest_burningwill", "Cascade": "ability_priest_cascade",
  "Divine Star": "spell_priest_divinestar", "Halo": "ability_priest_halo"
};
var talentSpellIds = {
  "Void Tendrils": 108920, "Psyfiend": 108921, "Dominate Mind": 605,
  "Body and Soul": 64129, "Angelic Feather": 121536, "Phantasm": 108942,
  "From Darkness, Comes Light": 109186, "Mindbender": 123040, "Solace and Insanity": 129250,
  "Desperate Prayer": 19236, "Spectral Guise": 112833, "Angelic Bulwark": 108945,
  "Twist of Fate": 109142, "Power Infusion": 10060, "Divine Insight": 109175,
  "Cascade": 121135, "Divine Star": 110744, "Halo": 120517
};
var talentNameMap = { "Surge of Light": "From Darkness, Comes Light", "Mind Control": "Dominate Mind" };

var TIER_ORDER = Object.keys(talentTiers).map(Number).sort(function(a, b) { return a - b; });
var VALID_TALENT_SET = new Set([].concat.apply([], Object.values(talentTiers)));
var TIER_BY_TALENT = (function() {
  var m = new Map();
  for (var tierStr in talentTiers) {
    var tier = Number(tierStr);
    for (var t of talentTiers[tier]) m.set(t, tier);
  }
  return m;
})();
var getSpellId = function(n) { return n in talentSpellIds ? talentSpellIds[n] : 0; };
var getTalentDisplayName = function(n) { return n in talentNameMap ? talentNameMap[n] : n; };
var talentIconUrl = function(name) {
  var key = name && talentIcons[name] ? talentIcons[name] : 'inv_misc_questionmark';
  return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
};

/* --------------------------------------------------------------------------------
   Utility
   -------------------------------------------------------------------------------- */
function formatDuration(ms) {
  if (!ms || ms === 0) return 'N/A';
  return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
}
function formatKillDate(startTime) {
  if (!startTime) return 'Unknown Date';
  return new Date(startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatServerInfo(serverName, regionName) {
  if (!serverName) return 'Unknown Server';
  return regionName ? (serverName + ' (' + regionName + ')') : serverName;
}
function buildGearDisplay(gear) {
  if (!Array.isArray(gear) || gear.length === 0) return '<div class="no-gear">No gear data available</div>';
  var gearSlots = { 0:'Head',1:'Neck',2:'Shoulder',3:'Shirt',4:'Chest',5:'Belt',6:'Legs',7:'Feet',8:'Wrist',9:'Hands',10:'Ring 1',11:'Ring 2',12:'Trinket 1',13:'Trinket 2',14:'Back',15:'Main Hand',16:'Off Hand',17:'Ranged' };
  var allItemIds = gear.map(function(item) { return item ? item.id : 0; }).filter(Boolean).join(':');
  return gear.map(function(item, index) {
    if (!item || item.id === 0) return '';
    var slotName = gearSlots[index] || ('Slot ' + index);
    var qualityClass = item.quality || 'common';
    var iconSrc = 'https://assets.rpglogs.com/img/warcraft/abilities/' + (item.icon || 'inv_misc_questionmark.jpg');
    var params = new URLSearchParams();
    if (item.itemLevel) params.append('ilvl', item.itemLevel);
    if (allItemIds) params.append('pcs', allItemIds);
    var gemIds = (Array.isArray(item.gems) ? item.gems : []).map(function(g) { return g.id; }).filter(Boolean);
    if (gemIds.length > 0) params.append('gems', gemIds.join(':'));
    if (item.permanentEnchant) params.append('ench', item.permanentEnchant);
    var qs = params.toString();
    var itemUrl = 'https://www.wowhead.com/mop-classic/item=' + item.id + (qs ? ('?' + qs) : '');
    return (
      '<div class="gear-item"><div class="gear-header"><div class="gear-info">' +
      '<a href="' + itemUrl + '" class="rankings-gear-name ' + qualityClass + ' wowhead" target="_blank" rel="noopener">' +
      '<img src="' + iconSrc + '" alt="' + (item.name || 'Unknown Item') + '" class="rankings-gear-image" loading="lazy">' +
      (item.name || 'Unknown Item') + '</a>' +
      '<div class="gear-slot">' + slotName + '</div></div>' +
      '<div class="gear-ilvl">iLvl ' + (item.itemLevel || '0') + '</div></div></div>'
    );
  }).filter(Boolean).join('');
}

/* --------------------------------------------------------------------------------
   Talent summary rendering
   -------------------------------------------------------------------------------- */
async function renderTalentSummary(data) {
  var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
  var result = await analyzeTalentsOptimized(rankings);
  var tierCounts = result.tierCounts, totalPerTier = result.totalPerTier;
  var TOP_BY_TIER = new Map();
  var html = '<div class="talent-summary-content">';
  for (var tier of TIER_ORDER) {
    var total = totalPerTier[tier] || 0;
    var rowStats = talentTiers[tier].map(function(talent) {
      var count = (tierCounts[tier] && tierCounts[tier][talent]) ? tierCounts[tier][talent] : 0;
      var pct = total > 0 ? (count / total) * 100 : 0;
      return { talent: talent, percentNum: pct, percent: pct.toFixed(1), iconUrl: talentIconUrl(talent), wowheadUrl: getSpellId(talent) ? ('https://www.wowhead.com/mop-classic/spell=' + getSpellId(talent)) : '#' };
    });
    var maxPct = Math.max.apply(null, rowStats.map(function(s) { return s.percentNum; }).concat([0]));
    var EPS = 0.05;
    var winners = rowStats.filter(function(s) { return s.percentNum >= maxPct - EPS && maxPct > 0; }).map(function(s) { return s.talent; });
    TOP_BY_TIER.set(tier, { winners: new Set(winners), percent: maxPct });
    html += '<div class="talent-row">';
    for (var stat of rowStats) {
      var isTop = stat.percentNum >= maxPct - EPS && maxPct > 0;
      var color = stat.percentNum >= 75 ? 'limegreen' : (stat.percentNum <= 10 ? 'red' : 'orange');
      html += '<a class="talent-link wowhead ' + (isTop ? 'is-top' : '') + '" href="' + stat.wowheadUrl + '" target="_blank" rel="noopener"><img class="talent-icon-img" loading="lazy" src="' + stat.iconUrl + '" alt="' + stat.talent + '" /><div class="talent-percent" style="color:' + color + '">' + stat.percent + '%</div></a>';
    }
    html += '</div>';
  }
  html += '</div>';
  return { html: html, topByTier: TOP_BY_TIER };
}

/* --------------------------------------------------------------------------------
   Parsing rules
   -------------------------------------------------------------------------------- */
var PARSING_RULES = {
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
  1409: { title: "Protectors of the Endless", rules: ["Damage done to bosses that heal to full is removed.","Damage gained from Corrupted Essence is normalized.","Only Hardmode/Elite order ranks as Heroic."] },
  1505: { title: "Tsulong", rules: ["Damage done to The Dark of Night, Fright Spawn, and Embodied Terrors is removed."] },
  1506: { title: "Lei Shi", rules: ["Damage done to Animated Protectors is removed."] },
  1431: { title: "Sha of Fear", rules: ["Sha of Fear is removed from Damage ASP."] },
  51577: { title: "Jin'rokh the Breaker", rules: ["No rules."] },
  51575: { title: "Horridon", rules: ["Horridon is removed from Damage All Star Points."] },
  51570: { title: "Council of Elders", rules: ["Damage done to Living Sand is removed."] },
  51565: { title: "Tortos", rules: ["Damage done to Humming Crystal is removed.","Heroic Only: Damage done to Vampiric Cave Bat is removed.","Only damage done to Whirl Turtles that cast Shell Concussion counts."] },
  51578: { title: "Megaera", rules: ["Damage done to heads that don't die is removed.","25m Heroic: Damage done to Nether Wyrm is removed."] },
  51573: { title: "Ji-Kun", rules: ["Ji-Kun is removed from Damage All Star Points."] },
  51572: { title: "Durumu the Forgotten", rules: ["Damage done to Wandering Eye is removed."] },
  51574: { title: "Primordius", rules: ["Primordius is removed from Damage and Healing All Star Points."] },
  51576: { title: "Dark Animus", rules: ["Heroic: Damage to Large Anima Golem and Massive Anima Golem is removed.","Only count damage done to Anima Golems that die."] },
  51559: { title: "Iron Qon", rules: ["Damage done to Ice Tomb is removed."] },
  51560: { title: "Twin Empyreans", rules: ["Damage done to Lurker in the Night is removed."] },
  51579: { title: "Lei Shen", rules: ["Damage done to Unharnessed Power, Lesser Diffused Lightning, Greater Diffused Lightning, and Diffused Lightning is removed."] },
  51580: { title: "Ra-den", rules: ["Damage done to Sanguine Horror, Corrupted Anima, Corrupted Vita, and Essence of Vita is removed."] }
};
function renderParsingRules(encounterId) {
  var rules = PARSING_RULES[encounterId];
  if (!rules) return '';
  var items = rules.rules.map(function(r) { return '<li class="parsing-rule-item">' + r + '</li>'; }).join('');
  return '<h3 class="sidebar-rules-heading">Parsing Rules</h3><div class="parsing-rules-content active"><ul class="parsing-rules-list">' + items + '</ul></div>';
}

/* --------------------------------------------------------------------------------
   Search & Sort
   -------------------------------------------------------------------------------- */
function applyFiltersAndSort() {
  var entries = rankingsDiv ? rankingsDiv.querySelectorAll('.rank-entry') : [];
  if (!entries.length) return;

  var query = currentSearch.toLowerCase().trim();
  var visibleCount = 0;

  // Build array for sorting
  var entryArr = Array.from(entries);

  // Apply search + region + server filters
  var regionVal = currentRegionFilter.toLowerCase();
  entryArr.forEach(function(el) {
    var hidden = false;
    if (query) {
      var searchData = el.getAttribute('data-search') || '';
      if (searchData.indexOf(query) === -1) hidden = true;
    }
    if (!hidden && regionVal) {
      if ((el.getAttribute('data-region') || '') !== regionVal) hidden = true;
    }
    el.classList.toggle('filtered-out', hidden);
  });

  // Sort visible entries
  var sortField = currentSort;
  var parent = rankingsDiv;
  var sorted = entryArr.slice().sort(function(a, b) {
    if (sortField === 'dps-asc') {
      return (parseInt(b.getAttribute('data-original-rank')) || 0) - (parseInt(a.getAttribute('data-original-rank')) || 0);
    }
    if (sortField === 'ilvl') {
      return (parseFloat(b.getAttribute('data-ilvl')) || 0) - (parseFloat(a.getAttribute('data-ilvl')) || 0);
    }
    if (sortField === 'duration') {
      return (parseFloat(a.getAttribute('data-duration')) || 0) - (parseFloat(b.getAttribute('data-duration')) || 0);
    }
    // Default: dps-desc — restore original rank order (highest first)
    return (parseInt(a.getAttribute('data-original-rank')) || 0) - (parseInt(b.getAttribute('data-original-rank')) || 0);
  });
  sorted.forEach(function(el) { parent.appendChild(el); });

  // Count visible
  entryArr.forEach(function(el) {
    if (!el.classList.contains('filtered-out')) visibleCount++;
  });

  // Update result count
  if (resultCountEl) {
    if (query) {
      resultCountEl.textContent = visibleCount + ' of ' + entryArr.length + ' players';
    } else {
      resultCountEl.textContent = '';
    }
  }

  // Toggle clear button
  if (searchClear) {
    searchClear.style.display = currentSearch ? 'block' : 'none';
  }
}

var debouncedApplyFilters = createDebounced(applyFiltersAndSort, 150);

function populateFilterDropdowns(data) {
  var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
  var regions = new Set();
  rankings.forEach(function(r) {
    if (r.regionName) regions.add(r.regionName);
  });

  if (regionFilter) {
    var regionHtml = '<option value="">Region: All</option>';
    Array.from(regions).sort().forEach(function(r) {
      regionHtml += '<option value="' + r + '">' + r + '</option>';
    });
    regionFilter.innerHTML = regionHtml;
    regionFilter.value = '';
  }
}

/* --------------------------------------------------------------------------------
   Context Bar: Build UI
   -------------------------------------------------------------------------------- */
function buildContextBar() {
  buildTierToggle();
  buildRaidPills();
  buildBossStrip();
}

function buildTierToggle() {
  if (!tierToggleEl) return;
  var html = '';
  for (var key in TIERS) {
    html += '<button type="button" class="tier-toggle-btn' + (key === currentTierKey ? ' active' : '') + '" data-tier="' + key + '" role="radio" aria-checked="' + (key === currentTierKey) + '">' + TIERS[key].name + '</button>';
  }
  tierToggleEl.innerHTML = html;

  tierToggleEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.tier-toggle-btn');
    if (!btn) return;
    var newTier = btn.dataset.tier;
    if (newTier === currentTierKey) return;

    currentTierKey = newTier;
    var raids = TIERS[newTier].raids;
    currentRaidKey = Object.keys(raids)[0];

    buildTierToggle();
    buildRaidPills();
    buildBossStrip();

    var entries = Object.entries(raids[currentRaidKey].encounters);
    if (entries.length > 0) {
      fetchAndDisplayRankings(entries[0][0], entries[0][1]);
    }
  });
}

function buildRaidPills() {
  if (!raidPillsEl) return;
  var raids = TIERS[currentTierKey].raids;
  var html = '';
  for (var key in raids) {
    var raid = raids[key];
    html += '<button type="button" class="raid-pill' + (key === currentRaidKey ? ' active' : '') + '" data-raid="' + key + '" role="tab" aria-selected="' + (key === currentRaidKey) + '" style="background-image: url(img/' + key + '.webp)">' +
      raid.name + '</button>';
  }
  raidPillsEl.innerHTML = html;

  raidPillsEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.raid-pill');
    if (!btn) return;
    var key = btn.dataset.raid;
    if (key === currentRaidKey) return;

    currentRaidKey = key;
    buildRaidPills();
    buildBossStrip();

    var entries = Object.entries(TIERS[currentTierKey].raids[key].encounters);
    if (entries.length > 0) {
      fetchAndDisplayRankings(entries[0][0], entries[0][1]);
    }
  });
}

function buildBossStrip() {
  if (!bossStripEl) return;
  var raid = TIERS[currentTierKey].raids[currentRaidKey];
  if (!raid) return;

  var html = '';
  for (var name in raid.encounters) {
    var id = raid.encounters[name];
    var isActive = id === currentEncounterId;
    html += '<button type="button" class="boss-chip' + (isActive ? ' active' : '') + '" data-encounter-id="' + id + '" data-boss-name="' + name + '" role="tab" aria-selected="' + isActive + '">' +
      '<img src="' + bossIconUrl(id) + '" alt="" class="boss-chip-icon" loading="lazy" onerror="this.src=\'https://assets.rpglogs.com/img/warcraft/abilities/inv_misc_questionmark.jpg\'">' +
      name + '</button>';
  }
  bossStripEl.innerHTML = html;

  bossStripEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.boss-chip');
    if (!btn) return;
    var id = parseInt(btn.dataset.encounterId, 10);
    var name = btn.dataset.bossName;
    fetchAndDisplayRankings(name, id);
  });

  updateBossStripOverflow();
  scrollToActiveBossChip();
}

function selectActiveBossChip(encounterId) {
  if (!bossStripEl) return;
  bossStripEl.querySelectorAll('.boss-chip').forEach(function(b) {
    var isActive = parseInt(b.dataset.encounterId, 10) === encounterId;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });
  scrollToActiveBossChip();
}

function scrollToActiveBossChip() {
  if (!bossStripEl) return;
  var active = bossStripEl.querySelector('.boss-chip.active');
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  // Delay overflow check to let scroll settle
  setTimeout(updateBossStripOverflow, 100);
}

function updateBossStripOverflow() {
  if (!bossStripEl || !bossStripWrapper) return;
  var hasOverflowLeft = bossStripEl.scrollLeft > 4;
  var hasOverflowRight = (bossStripEl.scrollWidth - bossStripEl.scrollLeft - bossStripEl.clientWidth) > 4;
  bossStripWrapper.classList.toggle('has-overflow-left', hasOverflowLeft);
  bossStripWrapper.classList.toggle('has-overflow-right', hasOverflowRight);
}

// Listen for scroll on boss strip to update fade indicators
if (bossStripEl) {
  bossStripEl.addEventListener('scroll', createDebounced(updateBossStripOverflow, 50), { passive: true });
}

/* --------------------------------------------------------------------------------
   Main fetch & display
   -------------------------------------------------------------------------------- */
async function fetchAndDisplayRankings(name, encounterId) {
  var startTime = performance.now();

  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Update state
  currentBossName = name;
  currentEncounterId = encounterId;

  var renderContentAndAttachListeners = async function(data) {
    currentData = data;
    populateFilterDropdowns(data);
    var talentResult = await renderTalentSummary(data);
    var topByTier = talentResult.topByTier;
    var talentSummaryHTML = talentResult.html;
    var finalRankingsHTML = await optimizedRenderer.renderRankings(data, topByTier);

    domBatcher.schedule('rankings', function() {
      if (rankingsDiv) rankingsDiv.innerHTML = finalRankingsHTML;
      // Re-apply filters after rendering
      applyFiltersAndSort();
    });
    domBatcher.schedule('talents', function() {
      var el = document.querySelector('.talent-sidebar .talent-summary');
      if (el) el.innerHTML = talentSummaryHTML;
    });
    domBatcher.schedule('parsing-rules', function() {
      var rulesContainer = document.getElementById('sidebar-parsing-rules');
      if (rulesContainer) {
        rulesContainer.innerHTML = renderParsingRules(encounterId);
      }
    });

    scheduler.postTask(function() {
      if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
    }, { priority: 'background' });

    console.log('Rendering completed in ' + (performance.now() - startTime) + 'ms');
  };

  try {
    selectActiveBossChip(encounterId);

    // Reset search/sort on boss change
    currentSearch = '';
    currentSort = 'dps-desc';
    currentRegionFilter = '';
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'dps-desc';
    if (regionFilter) regionFilter.value = '';
    if (searchClear) searchClear.style.display = 'none';
    if (resultCountEl) resultCountEl.textContent = '';

    if (rankingsDiv) {
      rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ' + name + '…</p></div>';
    }

    var cached = readCache(encounterId);
    var cachedAt = cached ? (cached.cachedAt || (cached.data && cached.data.cachedAt)) : null;

    if (cached && isFresh(cachedAt)) {
      updateLastUpdated(cachedAt);
      await renderContentAndAttachListeners(cached.data);
      return;
    }

    var res = await fetch(API_URL(encounterId), {
      signal: currentController.signal,
      headers: { 'accept': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    var data = await res.json();
    var serverTs = data.cachedAt || (new Date()).toISOString();
    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    await renderContentAndAttachListeners(data);

  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('Failed to fetch rankings:', err);

    var cached = readCache(encounterId);
    if (cached) {
      updateLastUpdated(cached.cachedAt || (cached.data && cached.data.cachedAt));
      await renderContentAndAttachListeners(cached.data);
    } else {
      if (rankingsDiv) {
        rankingsDiv.innerHTML = '<div style="text-align:center;color:red;margin-top:16px;">Couldn\'t load data for ' + name + '. Please try again later.</div>';
      }
      updateLastUpdated(null);
      var el = document.querySelector('.talent-sidebar .talent-summary');
      if (el) el.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">Failed to load talent data</div>';
    }
  } finally {
    currentController = null;
  }
}

/* --------------------------------------------------------------------------------
   Hash, URL
   -------------------------------------------------------------------------------- */
function clearHash() {
  try { history.replaceState(null, '', location.pathname); } catch(e) {}
}


/* --------------------------------------------------------------------------------
   Cache helpers
   -------------------------------------------------------------------------------- */
function readCache(id) {
  try { var raw = localStorage.getItem(CACHE_KEY(id)); return raw ? JSON.parse(raw) : null; } catch(e) { return null; }
}
function writeCache(id, data, cachedAt) {
  try { localStorage.setItem(CACHE_KEY(id), JSON.stringify({ data: data, cachedAt: cachedAt || (new Date()).toISOString() })); } catch(e) {}
}
function isFresh(cachedAt) {
  try { var ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt); return (Date.now() - ts) < CACHE_TTL_MS; } catch(e) { return false; }
}
function formatAgo(d) {
  var ms = Date.now() - (typeof d === 'number' ? d : Date.parse(d));
  if (isNaN(ms)) return 'unknown';
  if (ms < 60000) return 'just now';
  var mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + 'm ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}
function updateLastUpdated(iso) {
  if (!lastUpdatedEl) return;
  if (!iso) { lastUpdatedEl.textContent = ''; return; }
  lastUpdatedEl.textContent = 'Last updated: ' + new Date(iso).toLocaleString() + ' (' + formatAgo(iso) + ')';
}

/* --------------------------------------------------------------------------------
   Button state (no-op now — boss chips handle their own state)
   -------------------------------------------------------------------------------- */
var currentController = null;

/* --------------------------------------------------------------------------------
   Search & Sort event listeners
   -------------------------------------------------------------------------------- */
if (searchInput) {
  searchInput.addEventListener('input', function() {
    currentSearch = searchInput.value;
    debouncedApplyFilters();
  });
  searchInput.addEventListener('focus', function() { this.select(); });
}
if (searchClear) {
  searchClear.addEventListener('click', function() {
    currentSearch = '';
    searchInput.value = '';
    searchClear.style.display = 'none';
    applyFiltersAndSort();
    searchInput.focus();
  });
}
if (sortSelect) {
  sortSelect.addEventListener('change', function() {
    currentSort = sortSelect.value;
    applyFiltersAndSort();
  });
}
if (regionFilter) {
  regionFilter.addEventListener('change', function() {
    currentRegionFilter = regionFilter.value;
    applyFiltersAndSort();
  });
}

/* --------------------------------------------------------------------------------
   Boot sequence
   -------------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function() {
  // Clear any existing hash
  clearHash();

  // Build context bar
  buildContextBar();

  // Load first boss of current tier/raid
  var currentRaid = TIERS[currentTierKey].raids[currentRaidKey];
  var entries = Object.entries(currentRaid.encounters);
  if (entries.length) {
    fetchAndDisplayRankings(entries[0][0], entries[0][1]);
  } else {
    if (rankingsDiv) rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;">No bosses added yet.</div>';
    updateLastUpdated(null);
  }
});
