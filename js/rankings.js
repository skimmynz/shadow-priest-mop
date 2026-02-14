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
    var duration = formatDuration(r.duration);
    var itemLevel = (r.itemLevel != null) ? r.itemLevel : 'N/A';
    var server = formatServerInfo(r.serverName, r.regionName);
    var killDate = formatKillDate(r.startTime);
    var searchData = playerName.toLowerCase();
    var gear = buildGearStrip(r.gear);

    var html =
      '<div class="rank-entry" data-original-rank="' + (index + 1) + '" data-dps="' + dps + '" data-ilvl="' + itemLevel + '" data-duration="' + (r.duration || 0) + '" data-date="' + (r.startTime || 0) + '" data-name="' + playerName + '" data-search="' + searchData + '" data-region="' + (r.regionName || '').toLowerCase() + '">' +
      '<div class="ranking-header">' +
      '<div class="entry-row-1">' +
      '<div class="name-wrapper" style="color:' + color + '">' +
      (index + 1) + '. <a class="player-link" href="' + reportUrl + '" target="_blank" rel="noopener" style="color:' + color + '">' + playerName + '</a> — ' + (typeof dps === 'number' ? dps.toLocaleString() : dps) + ' DPS' +
      '</div>' +
      '<span class="fight-summary">' +
      '<span class="info-pill">' + server + '</span>' +
      '<span class="info-sep">&middot;</span>' +
      '<span class="info-pill">' + duration + '</span>' +
      '<span class="info-sep">&middot;</span>' +
      '<span class="info-pill">' + itemLevel + ' iLvl</span>' +
      '</span>' +
      '</div>' +
      '<div class="entry-row-2">' +
      '<div class="entry-gear-left">' + gear.main + '</div>' +
      '<div class="entry-highlights">' +
      gear.trinkets +
      perPlayerTalents +
      '<span class="kill-date">' + killDate + '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    this.renderCache.set(cacheKey, html);
    return html;
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
   (Dropdown removed — all data shown inline)
   -------------------------------------------------------------------------------- */

var optimizedRenderer = new OptimizedRenderer();
var currentData = null;

/* --------------------------------------------------------------------------------
   Search & Sort State
   -------------------------------------------------------------------------------- */
var currentSearch = '';
var currentSortField = 'dps';
var currentSortDir = 'desc';
var currentRegionFilter = '';

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
var GEAR_SLOTS = { 0:'Head',1:'Neck',2:'Shoulder',3:'Shirt',4:'Chest',5:'Belt',6:'Legs',7:'Feet',8:'Wrist',9:'Hands',10:'Ring 1',11:'Ring 2',12:'Trinket 1',13:'Trinket 2',14:'Back',15:'Main Hand',16:'Off Hand',17:'Ranged' };

function buildGearItemUrl(item, allItemIds) {
  var params = new URLSearchParams();
  if (item.itemLevel) params.append('ilvl', item.itemLevel);
  if (allItemIds) params.append('pcs', allItemIds);
  var gemIds = (Array.isArray(item.gems) ? item.gems : []).map(function(g) { return g.id; }).filter(Boolean);
  if (gemIds.length > 0) params.append('gems', gemIds.join(':'));
  if (item.permanentEnchant) params.append('ench', item.permanentEnchant);
  var qs = params.toString();
  return 'https://www.wowhead.com/mop-classic/item=' + item.id + (qs ? ('?' + qs) : '');
}

var GEAR_SKIP_SLOTS = new Set([3]); // Shirt
var GEAR_TRINKET_SLOTS = new Set([12, 13]); // Trinket 1, Trinket 2

function isTabardItem(item) {
  if (!item) return false;
  var name = (item.name || '').toLowerCase();
  var icon = (item.icon || '').toLowerCase();
  return name.indexOf('tabard') !== -1 || icon.indexOf('tabard') !== -1;
}

function buildGearStrip(gear) {
  var empty = { main: '<div class="no-gear">No gear data</div>', trinkets: '' };
  if (!Array.isArray(gear) || gear.length === 0) return empty;
  var allItemIds = gear.map(function(item) { return item ? item.id : 0; }).filter(Boolean).join(':');
  var mainIcons = [];
  var trinketIcons = [];
  gear.forEach(function(item, index) {
    if (!item || item.id === 0 || GEAR_SKIP_SLOTS.has(index) || isTabardItem(item)) return;
    var iconSrc = 'https://assets.rpglogs.com/img/warcraft/abilities/' + (item.icon || 'inv_misc_questionmark.jpg');
    var qualityClass = item.quality || 'common';
    var slotName = GEAR_SLOTS[index] || ('Slot ' + index);
    var itemUrl = buildGearItemUrl(item, allItemIds);
    var isTrinket = GEAR_TRINKET_SLOTS.has(index);
    var html =
      '<a href="' + itemUrl + '" class="gear-strip-icon ' + qualityClass + ' wowhead' + (isTrinket ? ' is-trinket' : '') + '" data-gear-index="' + index + '"' +
      ' data-item-name="' + (item.name || 'Unknown Item').replace(/"/g, '&quot;') + '"' +
      ' data-item-ilvl="' + (item.itemLevel || '0') + '"' +
      ' data-item-slot="' + slotName + '"' +
      ' data-item-quality="' + qualityClass + '"' +
      '>' +
      '<img src="' + iconSrc + '" alt="' + slotName + '" loading="lazy">' +
      '</a>';
    if (isTrinket) trinketIcons.push(html);
    else mainIcons.push(html);
  });
  return {
    main: '<div class="gear-strip">' + mainIcons.join('') + '</div>',
    trinkets: trinketIcons.length ? '<div class="gear-strip gear-trinkets">' + trinketIcons.join('') + '</div>' : ''
  };
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
  var field = currentSortField;
  var dir = currentSortDir;
  var parent = rankingsDiv;
  var sorted = entryArr.slice().sort(function(a, b) {
    var aVal, bVal;
    if (field === 'dps') {
      aVal = parseInt(a.getAttribute('data-original-rank')) || 0;
      bVal = parseInt(b.getAttribute('data-original-rank')) || 0;
      return dir === 'desc' ? aVal - bVal : bVal - aVal;
    }
    if (field === 'ilvl') {
      aVal = parseFloat(a.getAttribute('data-ilvl')) || 0;
      bVal = parseFloat(b.getAttribute('data-ilvl')) || 0;
    } else if (field === 'duration') {
      aVal = parseFloat(a.getAttribute('data-duration')) || 0;
      bVal = parseFloat(b.getAttribute('data-duration')) || 0;
    } else if (field === 'date') {
      aVal = parseFloat(a.getAttribute('data-date')) || 0;
      bVal = parseFloat(b.getAttribute('data-date')) || 0;
    }
    return dir === 'desc' ? bVal - aVal : aVal - bVal;
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
    currentSortField = 'dps';
    currentSortDir = 'desc';
    currentRegionFilter = '';
    if (searchInput) searchInput.value = '';
    resetSortToggles();
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
// Sort toggle buttons
var sortTogglesEl = document.getElementById('sort-toggles');
var defaultDirs = { dps: 'desc', ilvl: 'desc', duration: 'asc', date: 'desc' };

function resetSortToggles() {
  if (!sortTogglesEl) return;
  var btns = sortTogglesEl.querySelectorAll('.sort-btn');
  for (var i = 0; i < btns.length; i++) {
    var f = btns[i].getAttribute('data-sort');
    btns[i].classList.toggle('active', f === 'dps');
    btns[i].querySelector('.sort-arrow').textContent = defaultDirs[f] === 'desc' ? '\u25BC' : '\u25B2';
  }
}

if (sortTogglesEl) {
  sortTogglesEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.sort-btn');
    if (!btn) return;
    var field = btn.getAttribute('data-sort');
    if (field === currentSortField) {
      currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      currentSortField = field;
      currentSortDir = defaultDirs[field];
      var btns = sortTogglesEl.querySelectorAll('.sort-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      btn.classList.add('active');
    }
    btn.querySelector('.sort-arrow').textContent = currentSortDir === 'desc' ? '\u25BC' : '\u25B2';
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
