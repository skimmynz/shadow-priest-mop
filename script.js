
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
