/* ============================================================================
   CONFIGURATION
   ========================================================================= */

const CONFIG = {
  CACHE_TTL_MS: 5 * 60 * 1000,
  API_BASE: '/.netlify/functions/getLogs',
  ASSETS_BASE: 'https://assets.rpglogs.com/img/warcraft',
  WOWHEAD_BASE: 'https://www.wowhead.com/mop-classic',
  WCL_BASE: 'https://classic.warcraftlogs.com/reports',
  
  RANK_COLORS: {
    1: '#e5cc80',
    2: '#e268a8',
    default: '#ff8000'
  },
  
  TALENT_THRESHOLDS: {
    high: 75,
    low: 10,
    epsilon: 0.05
  }
};

const GEAR_SLOTS = {
  0: 'Head', 1: 'Neck', 2: 'Shoulder', 3: 'Shirt', 4: 'Chest',
  5: 'Belt', 6: 'Legs', 7: 'Feet', 8: 'Wrist', 9: 'Hands',
  10: 'Ring 1', 11: 'Ring 2', 12: 'Trinket 1', 13: 'Trinket 2',
  14: 'Back', 15: 'Main Hand', 16: 'Off Hand', 17: 'Ranged'
};

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

const TALENT_CONFIG = {
  tiers: {
    15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
    30: ["Body and Soul", "Angelic Feather", "Phantasm"],
    45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
    60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
    75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
    90: ["Cascade", "Divine Star", "Halo"]
  },
  
  icons: {
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
  },
  
  spellIds: {
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
  },
  
  nameMap: {
    "Surge of Light": "From Darkness, Comes Light",
    "Mind Control": "Dominate Mind"
  }
};

// Precomputed talent helpers
const TALENT_HELPERS = (() => {
  const tierOrder = Object.keys(TALENT_CONFIG.tiers).map(Number).sort((a, b) => a - b);
  const validSet = new Set([].concat(...Object.values(TALENT_CONFIG.tiers)));
  const tierByTalent = new Map();
  
  for (const tierStr in TALENT_CONFIG.tiers) {
    const tier = Number(tierStr);
    for (const t of TALENT_CONFIG.tiers[tier]) {
      tierByTalent.set(t, tier);
    }
  }
  
  return { tierOrder, validSet, tierByTalent };
})();

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
  51575: { title: "Horridon", rules: ["Horridon is removed from Damage All Star Points."] },
  51570: { title: "Council of Elders", rules: ["Damage done to Living Sand is removed."] },
  51565: { title: "Tortos", rules: ["Damage done to Humming Crystal is removed.","Heroic Only: Damage done to Vampiric Cave Bat is removed.","Only damage done to Whirl Turtles that cast Shell Concussion (which they do when kicked) counts."] },
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

/* ============================================================================
   UTILITIES
   ========================================================================= */

const Cache = {
  key: (encounterId) => `spriest_rankings_${encounterId}`,
  
  read(encounterId) {
    try {
      const raw = localStorage.getItem(this.key(encounterId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  
  write(encounterId, data, cachedAt) {
    try {
      const ts = cachedAt || new Date().toISOString();
      localStorage.setItem(this.key(encounterId), JSON.stringify({ data, cachedAt: ts }));
    } catch {}
  },
  
  isFresh(cachedAt) {
    try {
      const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
      return (Date.now() - ts) < CONFIG.CACHE_TTL_MS;
    } catch {
      return false;
    }
  }
};

const Format = {
  duration(ms) {
    if (!ms || ms === 0) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  },
  
  faction(faction) {
    return faction === 1 ? 'Alliance' : faction === 0 ? 'Horde' : 'Unknown';
  },
  
  serverInfo(serverName, regionName) {
    if (!serverName) return 'Unknown Server';
    return regionName ? `${serverName} (${regionName})` : serverName;
  },
  
  ago(dateish) {
    const ms = Date.now() - (typeof dateish === 'number' ? dateish : Date.parse(dateish));
    if (isNaN(ms)) return 'unknown';
    if (ms < 60000) return 'just now';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
};

const Hash = {
  slugify(str) {
    return String(str).normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
  },
  
  build(name, encounterId) {
    return `#${this.slugify(name)}-${encounterId}`;
  },
  
  update(name, encounterId) {
    try {
      history.replaceState(null, '', this.build(name, encounterId));
    } catch {}
  },
  
  parse() {
    const h = location.hash || '';
    const m = h.match(/^#([a-z0-9-]+)-(\d+)$/i);
    if (m) return { slug: m[1].toLowerCase(), id: parseInt(m[2], 10) };
    const legacy = h.match(/^#e-(\d+)$/i);
    if (legacy) return { slug: 'e', id: parseInt(legacy[1], 10), legacy: true };
    return null;
  }
};

const TalentUtils = {
  getSpellId(name) {
    return TALENT_CONFIG.spellIds[name] || 0;
  },
  
  getDisplayName(apiName) {
    return TALENT_CONFIG.nameMap[apiName] || apiName;
  },
  
  getIconUrl(name) {
    const key = name && TALENT_CONFIG.icons[name] ? TALENT_CONFIG.icons[name] : 'inv_misc_questionmark';
    return `${CONFIG.ASSETS_BASE}/abilities/${key}.jpg`;
  },
  
  getBossIconId(encounterId) {
    if (encounterId >= 51559 && encounterId <= 51580) {
      return encounterId - 50000;
    }
    return encounterId;
  },
  
  getBossIconUrl(encounterId) {
    const iconId = this.getBossIconId(encounterId);
    return `${CONFIG.ASSETS_BASE}/bosses/${iconId}-icon.jpg?v=2`;
  }
};

const URLBuilder = {
  wowheadSpell(spellId) {
    return spellId ? `${CONFIG.WOWHEAD_BASE}/spell=${spellId}` : CONFIG.WOWHEAD_BASE;
  },
  
  wowheadItem(item, allGear) {
    const params = new URLSearchParams();
    if (item.itemLevel) params.append('ilvl', item.itemLevel);
    
    const allItemIds = allGear.map(i => i?.id || 0).filter(Boolean).join(':');
    if (allItemIds) params.append('pcs', allItemIds);
    
    const gemIds = (Array.isArray(item.gems) ? item.gems : []).map(g => g.id).filter(Boolean);
    if (gemIds.length > 0) params.append('gems', gemIds.join(':'));
    if (item.permanentEnchant) params.append('ench', item.permanentEnchant);
    
    const query = params.toString();
    return `${CONFIG.WOWHEAD_BASE}/item=${item.id}${query ? '?' + query : ''}`;
  },
  
  warcraftlogs(reportID, fightID) {
    return `${CONFIG.WCL_BASE}/${reportID}?fight=${fightID}&type=damage-done`;
  },
  
  api(encounterId) {
    return `${CONFIG.API_BASE}?encounterId=${encounterId}`;
  }
};

function debounce(fn, delay = 100, immediate = false) {
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

/* ============================================================================
   PERFORMANCE
   ========================================================================= */

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
      try {
        updateFn();
      } catch (e) {
        console.error('DOMBatcher update failed:', e);
      }
    });
    this.pendingUpdates.clear();
    this.isScheduled = false;
  }
}

const scheduler = window.scheduler || {
  postTask: (fn, options) => {
    const priority = options?.priority || 'background';
    if (priority === 'user-blocking') {
      return Promise.resolve().then(fn);
    }
    return new Promise(resolve => setTimeout(() => resolve(fn()), 0));
  }
};

const domBatcher = new DOMBatcher();

/* ============================================================================
   STATE MANAGEMENT
   ========================================================================= */

const AppState = {
  currentTierKey: 't15',
  currentRaidKey: 'tot',
  currentData: null,
  currentController: null,
  
  setTier(key) {
    this.currentTierKey = key;
  },
  
  setRaid(key) {
    this.currentRaidKey = key;
  },
  
  setData(data) {
    this.currentData = data;
  },
  
  abortRequest() {
    if (this.currentController) {
      this.currentController.abort();
    }
  },
  
  createController() {
    this.currentController = new AbortController();
    return this.currentController;
  }
};

const DOM = {
  get raidMenu() { return document.getElementById('raid-menu'); },
  get bossButtons() { return document.getElementById('boss-buttons'); },
  get rankings() { return document.getElementById('rankings'); },
  get lastUpdated() { return document.getElementById('last-updated'); },
  get talentSummary() { return document.querySelector('.talent-sidebar .talent-summary'); },
  get raidButtonsContainer() { return document.getElementById('raid-buttons-container'); }
};

/* ============================================================================
   COMPONENTS
   ========================================================================= */

class TalentAnalyzer {
  static async analyze(rankings) {
    if (!Array.isArray(rankings) || rankings.length === 0) {
      return { tierCounts: {}, totalPerTier: {} };
    }
    
    const stats = this.initializeStats();
    
    await TimeSlicing.processInChunks(
      rankings,
      async (chunk) => chunk.map(entry => {
        this.processEntry(entry, stats);
        return entry;
      }),
      25, 2
    );
    
    return stats;
  }
  
  static initializeStats() {
    const tierCounts = {};
    const totalPerTier = {};
    
    for (const tier of TALENT_HELPERS.tierOrder) {
      tierCounts[tier] = {};
      totalPerTier[tier] = 0;
      for (const talent of TALENT_CONFIG.tiers[tier]) {
        tierCounts[tier][talent] = 0;
      }
    }
    
    return { tierCounts, totalPerTier };
  }
  
  static processEntry(entry, stats) {
    const seenTiers = new Set();
    const talents = Array.isArray(entry?.talents) ? entry.talents : [];
    
    for (const t of talents) {
      const displayName = TalentUtils.getDisplayName(t.name);
      if (!TALENT_HELPERS.validSet.has(displayName)) continue;
      
      const tier = TALENT_HELPERS.tierByTalent.get(displayName);
      if (tier && !seenTiers.has(tier)) {
        stats.tierCounts[tier][displayName]++;
        stats.totalPerTier[tier]++;
        seenTiers.add(tier);
      }
    }
  }
  
  static async renderSummary(data) {
    const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
    const { tierCounts, totalPerTier } = await this.analyze(rankings);
    
    const topByTier = new Map();
    const rows = [];
    
    for (const tier of TALENT_HELPERS.tierOrder) {
      const total = totalPerTier[tier] || 0;
      const rowStats = this.calculateRowStats(tier, tierCounts, total);
      const { winners, maxPct } = this.findWinners(rowStats);
      
      topByTier.set(tier, { winners: new Set(winners), percent: maxPct });
      rows.push(this.renderRow(rowStats, maxPct));
    }
    
    return {
      html: `<div class="talent-summary-content">${rows.join('')}</div>`,
      topByTier
    };
  }
  
  static calculateRowStats(tier, tierCounts, total) {
    return TALENT_CONFIG.tiers[tier].map(talent => {
      const count = tierCounts[tier]?.[talent] || 0;
      const percentNum = total > 0 ? (count / total) * 100 : 0;
      
      return {
        talent,
        percentNum,
        percent: percentNum.toFixed(1),
        iconUrl: TalentUtils.getIconUrl(talent),
        spellId: TalentUtils.getSpellId(talent),
        wowheadUrl: URLBuilder.wowheadSpell(TalentUtils.getSpellId(talent))
      };
    });
  }
  
  static findWinners(rowStats) {
    const maxPct = Math.max(...rowStats.map(s => s.percentNum), 0);
    const winners = rowStats
      .filter(s => s.percentNum >= maxPct - CONFIG.TALENT_THRESHOLDS.epsilon && maxPct > 0)
      .map(s => s.talent);
    
    return { winners, maxPct };
  }
  
  static renderRow(rowStats, maxPct) {
    const cells = rowStats.map(stat => {
      const isTop = stat.percentNum >= maxPct - CONFIG.TALENT_THRESHOLDS.epsilon && maxPct > 0;
      const color = stat.percentNum >= CONFIG.TALENT_THRESHOLDS.high ? 'limegreen' 
                  : stat.percentNum <= CONFIG.TALENT_THRESHOLDS.low ? 'red' 
                  : 'orange';
      
      return `<a class="talent-link wowhead ${isTop ? 'is-top' : ''}" href="${stat.wowheadUrl}" target="_blank" rel="noopener">
        <img class="talent-icon-img" loading="lazy" src="${stat.iconUrl}" alt="${stat.talent}" />
        <div class="talent-percent" style="color:${color}">${stat.percent}%</div>
      </a>`;
    });
    
    return `<div class="talent-row">${cells.join('')}</div>`;
  }
}

class GearRenderer {
  static render(gear) {
    if (!Array.isArray(gear) || gear.length === 0) {
      return '<div class="no-gear">No gear data available</div>';
    }
    
    return gear
      .map((item, index) => item?.id ? this.renderItem(item, index, gear) : '')
      .filter(Boolean)
      .join('');
  }
  
  static renderItem(item, index, allGear) {
    const slotName = GEAR_SLOTS[index] || `Slot ${index}`;
    const qualityClass = item.quality || 'common';
    const iconSrc = `${CONFIG.ASSETS_BASE}/abilities/${item.icon || 'inv_misc_questionmark.jpg'}`;
    const itemUrl = URLBuilder.wowheadItem(item, allGear);
    
    return `
      <div class="gear-item">
        <div class="gear-header">
          <div class="gear-info">
            <a href="${itemUrl}" class="rankings-gear-name ${qualityClass} wowhead" target="_blank" rel="noopener">
              <img src="${iconSrc}" alt="${item.name || 'Unknown Item'}" class="rankings-gear-image" loading="lazy">
              ${item.name || 'Unknown Item'}
            </a>
            <div class="gear-slot">${slotName}</div>
          </div>
          <div class="gear-ilvl">iLvl ${item.itemLevel || '0'}</div>
        </div>
      </div>
    `;
  }
}

class RankingsRenderer {
  constructor() {
    this.renderCache = new Map();
  }
  
  async renderRankings(data, topByTier) {
    const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
    const visibleRankings = rankings.slice(0, 100);
    const rankColors = this.calculateColors(visibleRankings);
    
    const renderedEntries = await TimeSlicing.processInChunks(
      visibleRankings,
      async (chunk) => chunk.map((r) => {
        const globalIndex = visibleRankings.indexOf(r);
        return this.renderEntry(r, globalIndex, rankColors.get(globalIndex), topByTier);
      }),
      10, 1
    );
    
    return renderedEntries.join('');
  }
  
  calculateColors(rankings) {
    const colors = new Map();
    for (let i = 0; i < rankings.length; i++) {
      const rank = i + 1;
      if (rank === 1) colors.set(i, CONFIG.RANK_COLORS[1]);
      else if (rank >= 2 && rank <= 25) colors.set(i, CONFIG.RANK_COLORS[2]);
      else colors.set(i, CONFIG.RANK_COLORS.default);
    }
    return colors;
  }
  
  renderEntry(r, index, color, topByTier) {
    const cacheKey = `${r.reportID}-${r.fightID}-${index}`;
    if (this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey);
    }
    
    const reportUrl = URLBuilder.warcraftlogs(r.reportID, r.fightID);
    const dps = typeof r.total === 'number' ? Math.round(r.total) : '—';
    const playerName = r.name || 'Unknown';
    const talentIcons = this.renderPlayerTalents(r.talents, topByTier);
    const entryId = `entry-${index}-${r.reportID}-${r.fightID}`;
    const duration = Format.duration(r.duration);
    const itemLevel = r.itemLevel != null ? r.itemLevel : 'N/A';
    
    const html = `
      <div class="rank-entry">
        <div class="ranking-header" onclick="toggleDropdown('${entryId}')">
          <div class="name-wrapper" style="color:${color}">
            ${index + 1}. ${playerName} — ${typeof dps === 'number' ? dps.toLocaleString() : dps} DPS
          </div>
          <div class="header-right">
            <span class="fight-summary">${duration} - ${itemLevel} iLvl</span>
            ${talentIcons}
            <span class="expand-icon">▼</span>
          </div>
        </div>
        <div class="dropdown-content" id="${entryId}">
          <div class="dropdown-placeholder" data-report-id="${r.reportID}" data-fight-id="${r.fightID}">
            <div style="text-align: center; padding: 1rem; color: #94a3b8;">Click to load details...</div>
          </div>
        </div>
      </div>
    `;
    
    this.renderCache.set(cacheKey, html);
    return html;
  }
  
  renderPlayerTalents(playerTalents, topByTier) {
    const chosenByTier = new Map();
    const talents = Array.isArray(playerTalents) ? playerTalents : [];
    
    for (const t of talents) {
      const displayName = TalentUtils.getDisplayName(t.name);
      if (!TALENT_HELPERS.validSet.has(displayName)) continue;
      const tier = TALENT_HELPERS.tierByTalent.get(displayName);
      if (tier && !chosenByTier.has(tier)) {
        chosenByTier.set(tier, displayName);
      }
    }
    
    const cells = TALENT_HELPERS.tierOrder.map((tier) => {
      const name = chosenByTier.get(tier) || null;
      const iconUrl = TalentUtils.getIconUrl(name);
      const spellId = name ? TalentUtils.getSpellId(name) : 0;
      const href = spellId ? URLBuilder.wowheadSpell(spellId) : null;
      const title = name || 'Unknown (no data)';
      const metaInfo = topByTier?.get?.(tier);
      const isMeta = !!(name && metaInfo?.winners?.has(name));
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

class DropdownManager {
  constructor() {
    this.toggle = debounce(this._toggle.bind(this), 50, true);
  }
  
  async _toggle(entryId) {
    const dropdown = document.getElementById(entryId);
    const header = dropdown?.previousElementSibling;
    const expandIcon = header?.querySelector('.expand-icon');
    if (!dropdown || !expandIcon) return;
    
    const isActive = dropdown.classList.contains('active');
    
    this.closeOthers(entryId);
    
    if (!isActive) {
      await this.loadContent(dropdown);
    }
    
    dropdown.classList.toggle('active', !isActive);
    expandIcon.classList.toggle('rotated', !isActive);
  }
  
  closeOthers(excludeId) {
    document.querySelectorAll('.dropdown-content.active').forEach(el => {
      if (el.id !== excludeId) {
        el.classList.remove('active');
        const icon = el.previousElementSibling?.querySelector('.expand-icon');
        if (icon) icon.classList.remove('rotated');
      }
    });
  }
  
  async loadContent(dropdown) {
    const placeholder = dropdown.querySelector('.dropdown-placeholder');
    if (!placeholder || !AppState.currentData?.rankings) return;
    
    const reportId = placeholder.dataset.reportId;
    const fightId = placeholder.dataset.fightId;
    
    const entry = AppState.currentData.rankings.find(r =>
      r.reportID === reportId && r.fightID === parseInt(fightId, 10)
    );
    
    if (!entry) return;
    
    const reportUrl = URLBuilder.warcraftlogs(reportId, fightId);
    dropdown.innerHTML = `
      <div class="info-section">
        <h4>Gear & Equipment <span class="report-link-inline">Report: <a href="${reportUrl}" target="_blank" rel="noopener">${reportId}</a></span></h4>
        <div class="gear-grid">${GearRenderer.render(entry.gear)}</div>
      </div>
    `;
  }
}

class ParsingRulesRenderer {
  static render(encounterId) {
    const rules = PARSING_RULES[encounterId];
    if (!rules) return '';
    
    const ruleItems = rules.rules.map(rule => `<li class="parsing-rule-item">${rule}</li>`).join('');
    
    return `
      <div class="parsing-rules-header-container">
        <div class="parsing-rules-content active">
          <ul class="parsing-rules-list">${ruleItems}</ul>
        </div>
      </div>
    `;
  }
}

class NavigationManager {
  static createTierMenu() {
    if (!DOM.raidMenu) return;
    
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.createTierToggle());
    fragment.appendChild(this.createRaidButtons());
    
    DOM.raidMenu.replaceChildren(fragment);
    this.selectActiveRaid(AppState.currentRaidKey);
  }
  
  static createTierToggle() {
    const container = document.createElement('div');
    container.className = 'tier-toggle-container';
    
    for (const tierKey in TIERS) {
      const tier = TIERS[tierKey];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tier-toggle-button';
      button.dataset.tierKey = tierKey;
      button.textContent = tier.name;
      
      if (tierKey === AppState.currentTierKey) {
        button.classList.add('active');
      }
      
      button.addEventListener('click', (e) => this.handleTierClick(e.currentTarget.dataset.tierKey));
      container.appendChild(button);
    }
    
    return container;
  }
  
  static handleTierClick(newTierKey) {
    if (AppState.currentTierKey === newTierKey) return;
    
    AppState.setTier(newTierKey);
    this.createTierMenu();
    
    const raids = TIERS[newTierKey].raids;
    const firstRaidKey = Object.keys(raids)[0];
    
    AppState.setRaid(firstRaidKey);
    this.selectActiveRaid(firstRaidKey);
    this.buildBossButtons(firstRaidKey);
    
    const entries = Object.entries(raids[firstRaidKey].encounters);
    if (entries.length > 0) {
      const [name, id] = entries[0];
      RankingsAPI.fetch(name, id);
    }
  }
  
  static createRaidButtons() {
    const container = document.createElement('div');
    container.id = 'raid-buttons-container';
    container.className = 'raid-buttons-container';
    
    const raids = TIERS[AppState.currentTierKey].raids;
    for (const key in raids) {
      const raid = raids[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.raidKey = key;
      
      const img = document.createElement('img');
      img.src = `public/images/${key}.webp`;
      img.alt = raid.name;
      img.className = 'raid-icon';
      img.loading = 'lazy';
      
      const span = document.createElement('span');
      span.textContent = raid.name;
      
      btn.append(img, span);
      btn.addEventListener('click', debounce((e) => {
        e.preventDefault();
        this.handleRaidClick(key, raid);
      }, 100), { passive: true });
      
      container.appendChild(btn);
    }
    
    return container;
  }
  
  static handleRaidClick(key, raid) {
    if (AppState.currentRaidKey === key) return;
    
    AppState.setRaid(key);
    this.selectActiveRaid(key);
    this.buildBossButtons(key);
    
    const entries = Object.entries(raid.encounters);
    if (entries.length > 0) {
      const [name, id] = entries[0];
      RankingsAPI.fetch(name, id);
    } else {
      UIManager.showNoData(`No bosses added for ${raid.name} yet.`);
    }
  }
  
  static selectActiveRaid(raidKey) {
    const container = DOM.raidButtonsContainer;
    if (!container) return;
    
    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    const active = container.querySelector(`button[data-raid-key="${raidKey}"]`);
    if (active) active.classList.add('active');
  }
  
  static buildBossButtons(raidKey) {
    if (!DOM.bossButtons) return;
    
    const fragment = document.createDocumentFragment();
    const raid = TIERS[AppState.currentTierKey].raids[raidKey];
    if (!raid) return;
    
    for (const [name, id] of Object.entries(raid.encounters)) {
      const button = document.createElement('button');
      button.dataset.encounterId = String(id);
      button.dataset.bossName = name;
      
      const img = document.createElement('img');
      img.src = TalentUtils.getBossIconUrl(id);
      img.alt = name;
      img.className = 'boss-icon';
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = `${CONFIG.ASSETS_BASE}/abilities/inv_misc_questionmark.jpg`;
      };
      
      const span = document.createElement('span');
      span.textContent = name;
      
      button.append(img, span);
      button.addEventListener('click', debounce((e) => {
        e.preventDefault();
        RankingsAPI.fetch(name, id);
      }, 100), { passive: true });
      
      fragment.appendChild(button);
    }
    
    DOM.bossButtons.replaceChildren(fragment);
  }
  
  static selectActiveBoss(encounterId) {
    if (!DOM.bossButtons) return;
    
    DOM.bossButtons.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    const active = DOM.bossButtons.querySelector(`button[data-encounter-id="${encounterId}"]`);
    if (active) active.classList.add('active');
  }
  
  static findRaidByEncounter(encounterId) {
    for (const tierKey in TIERS) {
      for (const raidKey in TIERS[tierKey].raids) {
        if (Object.values(TIERS[tierKey].raids[raidKey].encounters).includes(encounterId)) {
          return { tierKey, raidKey };
        }
      }
    }
    return null;
  }
}

class UIManager {
  static updateLastUpdated(isoOrEpoch) {
    if (!DOM.lastUpdated) return;
    if (!isoOrEpoch) {
      DOM.lastUpdated.textContent = '';
      return;
    }
    
    const when = new Date(isoOrEpoch).toLocaleString();
    const ago = Format.ago(isoOrEpoch);
    DOM.lastUpdated.textContent = `Last updated: ${when} (${ago})`;
  }
  
  static showLoading(bossName) {
    if (DOM.rankings) {
      DOM.rankings.innerHTML = `
        <div style="text-align:center;color:#bbb;margin-top:16px;">
          <div class="loader"></div>
          <p>Loading ${bossName}…</p>
        </div>
      `;
    }
  }
  
  static showError(bossName) {
    if (DOM.rankings) {
      DOM.rankings.innerHTML = `
        <div style="text-align:center;color:red;margin-top:16px;">
          Couldn't load data for ${bossName}. Please try again later.
        </div>
      `;
    }
    this.updateLastUpdated(null);
    if (DOM.talentSummary) {
      DOM.talentSummary.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">
          Failed to load talent data
        </div>
      `;
    }
  }
  
  static showNoData(message) {
    if (DOM.rankings) {
      DOM.rankings.innerHTML = `
        <div style="text-align:center;color:#bbb;margin-top:16px;">${message}</div>
      `;
    }
    this.updateLastUpdated(null);
    if (DOM.talentSummary) {
      DOM.talentSummary.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">
          No talent data available
        </div>
      `;
    }
  }
  
  static disableButtons(disabled) {
    const buttons = DOM.bossButtons?.querySelectorAll('button');
    if (!buttons) return;
    
    requestAnimationFrame(() => {
      buttons.forEach(btn => {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.7' : '';
        btn.style.cursor = disabled ? 'not-allowed' : '';
      });
    });
  }
}

/* ============================================================================
   API & DATA FETCHING
   ========================================================================= */

const RankingsAPI = {
  renderer: new RankingsRenderer(),
  
  async fetch(name, encounterId, options = {}) {
    const force = options.force || false;
    const startTime = performance.now();
    
    AppState.abortRequest();
    const controller = AppState.createController();
    
    try {
      UIManager.disableButtons(true);
      NavigationManager.selectActiveBoss(encounterId);
      Hash.update(name, encounterId);
      UIManager.showLoading(name);
      
      const cached = Cache.read(encounterId);
      const cachedAt = cached?.cachedAt || cached?.data?.cachedAt;
      
      if (cached && Cache.isFresh(cachedAt) && !force) {
        UIManager.updateLastUpdated(cachedAt);
        await this.renderData(cached.data, encounterId, startTime);
        return;
      }
      
      const res = await fetch(URLBuilder.api(encounterId), {
        signal: controller.signal,
        headers: { 'accept': 'application/json' }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const serverTs = data.cachedAt || new Date().toISOString();
      
      Cache.write(encounterId, data, serverTs);
      UIManager.updateLastUpdated(serverTs);
      await this.renderData(data, encounterId, startTime);
      
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch rankings:', err);
      
      const cached = Cache.read(encounterId);
      if (cached) {
        UIManager.updateLastUpdated(cached.cachedAt || cached.data?.cachedAt);
        await this.renderData(cached.data, encounterId, startTime);
      } else {
        UIManager.showError(name);
      }
    } finally {
      UIManager.disableButtons(false);
    }
  }
  
  async renderData(data, encounterId, startTime) {
    AppState.setData(data);
    
    const talentResult = await TalentAnalyzer.renderSummary(data);
    const rankingsHTML = await this.renderer.renderRankings(data, talentResult.topByTier);
    
    domBatcher.schedule('rankings', () => {
      if (DOM.rankings) DOM.rankings.innerHTML = rankingsHTML;
    });
    
    domBatcher.schedule('talents', () => {
      if (DOM.talentSummary) DOM.talentSummary.innerHTML = talentResult.html;
    });
    
    domBatcher.schedule('parsing-rules', () => {
      if (DOM.lastUpdated) {
        document.querySelector('.parsing-rules-header-container')?.remove();
        const parsingHTML = ParsingRulesRenderer.render(encounterId);
        if (parsingHTML) DOM.lastUpdated.insertAdjacentHTML('afterend', parsingHTML);
      }
    });
    
    scheduler.postTask(() => {
      window.$WowheadPower?.refreshLinks();
    }, { priority: 'background' });
    
    console.log(`Rendering completed in ${(performance.now() - startTime).toFixed(2)}ms`);
  }
};

/* ============================================================================
   GLOBAL FUNCTIONS (for inline onclick handlers)
   ========================================================================= */

const dropdownManager = new DropdownManager();
window.toggleDropdown = (id) => dropdownManager.toggle(id);

/* ============================================================================
   INITIALIZATION
   ========================================================================= */

function initializeApp() {
  const initStart = performance.now();
  
  // Create last-updated element if missing
  if (!DOM.lastUpdated) {
    const h1 = document.querySelector('h1');
    if (h1) {
      const el = document.createElement('div');
      el.id = 'last-updated';
      el.className = 'last-updated';
      h1.insertAdjacentElement('afterend', el);
    }
  }
  
  NavigationManager.createTierMenu();
  NavigationManager.buildBossButtons(AppState.currentRaidKey);
  
  // Check for hash navigation
  const parsed = Hash.parse();
  if (parsed?.id) {
    const result = NavigationManager.findRaidByEncounter(parsed.id);
    if (result) {
      AppState.setTier(result.tierKey);
      AppState.setRaid(result.raidKey);
      
      NavigationManager.createTierMenu();
      NavigationManager.selectActiveRaid(result.raidKey);
      NavigationManager.buildBossButtons(result.raidKey);
      
      const entries = Object.entries(TIERS[result.tierKey].raids[result.raidKey].encounters);
      const match = entries.find(pair => pair[1] === parsed.id);
      const bossName = match ? match[0] : 'Encounter';
      
      RankingsAPI.fetch(bossName, parsed.id);
      console.log(`Initial load from hash in ${(performance.now() - initStart).toFixed(2)}ms`);
      return;
    }
  }
  
  // Default: load first boss
  const raid = TIERS[AppState.currentTierKey].raids[AppState.currentRaidKey];
  const entries = Object.entries(raid.encounters);
  
  if (entries.length) {
    const [name, id] = entries[0];
    RankingsAPI.fetch(name, id);
  } else {
    UIManager.showNoData(`No bosses added for ${raid.name} yet.`);
  }
  
  console.log(`DOMContentLoaded in ${(performance.now() - initStart).toFixed(2)}ms`);
}

document.addEventListener('DOMContentLoaded', initializeApp);
