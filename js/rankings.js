// Minimal scheduler for deferred work
var scheduler = window.scheduler || {
  postTask: function(fn, options) {
    var priority = options && options.priority ? options.priority : 'background';
    if (priority === 'user-blocking') return Promise.resolve().then(fn);
    return new Promise(function(resolve) { setTimeout(function() { resolve(fn()); }, 0); });
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
function analyzeTalents(rankings) {
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return { tierCounts: {}, totalPerTier: {} };
  }
  var tierCounts = {}, totalPerTier = {};
  for (var tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (var talent of talentTiers[tier]) tierCounts[tier][talent] = 0;
  }
  for (var i = 0; i < rankings.length; i++) {
    var entry = rankings[i];
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
  }
  return { tierCounts: tierCounts, totalPerTier: totalPerTier };
}

/* --------------------------------------------------------------------------------
   Optimized Renderer
   -------------------------------------------------------------------------------- */
class OptimizedRenderer {
  constructor() { this.renderCache = new Map(); }

  renderRankings(data, topByTier) {
    var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
    var visible = rankings.slice(0, 100);
    var maxDps = 0;
    for (var i = 0; i < visible.length; i++) {
      var d = (visible[i] && typeof visible[i].total === 'number') ? Math.round(visible[i].total) : 0;
      if (d > maxDps) maxDps = d;
    }
    var parts = [];
    for (var i = 0; i < visible.length; i++) {
      parts.push(this.renderSingleEntry(visible[i], i, topByTier, maxDps));
    }
    var header = '<div class="rank-table-header">' +
      '<span class="col-rank">#</span>' +
      '<span class="col-name">Player</span>' +
      '<span class="col-ilvl" data-sort="ilvl">iLvl <span class="sort-arrow"></span></span>' +
      '<span class="col-haste">Haste</span>' +
      '<span class="col-dps" data-sort="dps">DPS <span class="sort-arrow"></span></span>' +
      '<span class="col-date" data-sort="date">Date <span class="sort-arrow"></span></span>' +
      '<span class="col-time" data-sort="duration">Time <span class="sort-arrow"></span></span>' +
      '<span class="col-talents">Talents</span>' +
      '<span class="col-trinkets">Trinkets</span>' +
      '</div>';
    return header + parts.join('');
  }

  renderSingleEntry(r, index, topByTier, maxDps) {
    var cacheKey = r.reportID + '-' + r.fightID + '-' + index + '-' + (r.hasteRating != null ? r.hasteRating : '');
    if (this.renderCache.has(cacheKey)) return this.renderCache.get(cacheKey);

    var rank = index + 1;
    var rankTier = rank === 1 ? 'gold' : (rank <= 25 ? 'pink' : 'orange');
    var reportUrl = 'https://classic.warcraftlogs.com/reports/' + r.reportID + '?fight=' + r.fightID + '&type=damage-done';
    var dps = (r && typeof r.total === 'number') ? Math.round(r.total) : '—';
    var playerName = (r && r.name) ? r.name : 'Unknown';
    var perPlayerTalents = this.buildPlayerTalentIcons(r && r.talents, topByTier);
    var duration = formatDuration(r.duration);
    var itemLevel = (r.itemLevel != null) ? r.itemLevel : 'N/A';
    var server = formatServerInfo(r.guildName, r.serverName, r.regionName);
    var killDate = formatKillDate(r.startTime);
    var searchData = playerName.toLowerCase();
    var gear = buildGearStrip(r.gear);

    var hasteHtml = '';
    if (typeof r.hasteRating === 'number') {
      var hastePct = (((1 + r.hasteRating / 42500) * 1.05) - 1) * 100;
      hasteHtml = '<a class="player-haste" href="/haste?rating=' + r.hasteRating + '" title="Open in Haste Calculator">' +
        '<span class="player-haste-rating">' + r.hasteRating.toLocaleString() + '</span>' +
        ' <span class="player-haste-pct">' + hastePct.toFixed(1) + '%</span></a>';
    }

    var html =
      '<div class="rank-entry" data-rank-tier="' + rankTier + '" data-original-rank="' + rank + '" data-dps="' + dps + '" data-ilvl="' + itemLevel + '" data-duration="' + (r.duration || 0) + '" data-date="' + (r.startTime || 0) + '" data-name="' + playerName + '" data-search="' + searchData + '" data-region="' + (r.regionName || '').toLowerCase() + '">' +
      '<span class="col-rank">' + rank + '</span>' +
      '<span class="col-name"><a class="player-link" href="' + reportUrl + '" target="_blank" rel="noopener">' + playerName + '</a><span class="player-server">' + server + '</span></span>' +
      '<span class="col-ilvl">' + itemLevel + '</span>' +
      '<span class="col-haste">' + hasteHtml + '</span>' +
      '<span class="col-dps">' + (typeof dps === 'number' ? dps.toLocaleString() : dps) + '</span>' +
      '<span class="col-date">' + killDate + '</span>' +
      '<span class="col-time">' + duration + '</span>' +
      '<span class="col-talents">' + perPlayerTalents + '</span>' +
      '<span class="col-trinkets">' + gear.trinkets + '</span>' +
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
function formatServerInfo(guildName, serverName, regionName) {
  var parts = [];
  if (guildName) parts.push(guildName);
  if (serverName) {
    parts.push(regionName ? serverName + ' (' + regionName + ')' : serverName);
  }
  return parts.join(' - ') || 'Unknown Server';
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
function renderTalentSummary(data) {
  var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
  var result = analyzeTalents(rankings);
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
   Trinket summary rendering
   -------------------------------------------------------------------------------- */
function renderTrinketSummary(data) {
  var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
  var trinketCounts = {};
  var totalPlayers = 0;

  rankings.forEach(function(r) {
    if (!Array.isArray(r.gear) || r.gear.length === 0) return;
    totalPlayers++;
    var seen = {};
    r.gear.forEach(function(item, index) {
      if (!GEAR_TRINKET_SLOTS.has(index) || !item || item.id === 0) return;
      var trinketName = item.name || 'Unknown Trinket';
      if (seen[trinketName]) return;
      seen[trinketName] = true;
      if (!trinketCounts[trinketName]) {
        trinketCounts[trinketName] = {
          id: item.id,
          name: trinketName,
          icon: item.icon || 'inv_misc_questionmark.jpg',
          quality: item.quality || 'common',
          itemLevel: item.itemLevel || 0,
          count: 0
        };
      }
      // Keep the highest ilvl version for the tooltip
      if ((item.itemLevel || 0) > trinketCounts[trinketName].itemLevel) {
        trinketCounts[trinketName].id = item.id;
        trinketCounts[trinketName].itemLevel = item.itemLevel || 0;
        trinketCounts[trinketName].quality = item.quality || 'common';
        trinketCounts[trinketName].icon = item.icon || 'inv_misc_questionmark.jpg';
      }
      trinketCounts[trinketName].count++;
    });
  });

  var sorted = Object.values(trinketCounts).sort(function(a, b) { return b.count - a.count; });
  var top = sorted.slice(0, 8);
  if (!top.length || totalPlayers === 0) return '';

  var maxCount = top[0].count;
  var html = '<div class="trinket-summary-list">';
  top.forEach(function(t) {
    var pct = ((t.count / totalPlayers) * 100).toFixed(1);
    var barWidth = ((t.count / maxCount) * 100).toFixed(1);
    var iconSrc = 'https://assets.rpglogs.com/img/warcraft/abilities/' + t.icon;
    var itemUrl = 'https://www.wowhead.com/mop-classic/item=' + t.id;
    html += '<a class="trinket-summary-item wowhead" href="' + itemUrl + '" target="_blank" rel="noopener">' +
      '<span class="gear-strip-icon ' + t.quality + '"><img src="' + iconSrc + '" alt="' + t.name.replace(/"/g, '&quot;') + '" loading="lazy"></span>' +
      '<span class="trinket-summary-info">' +
        '<span class="trinket-summary-name ' + t.quality + '">' + t.name + '</span>' +
        '<span class="trinket-summary-bar"><span class="trinket-summary-bar-fill" style="width:' + barWidth + '%"></span></span>' +
      '</span>' +
      '<span class="trinket-summary-pct">' + pct + '%</span>' +
    '</a>';
  });
  html += '</div>';
  return html;
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
   Raid Nav Sidebar
   -------------------------------------------------------------------------------- */
function buildRaidNav() {
  if (!raidNavEl) return;

  // Tier tabs
  var html = '<div class="tier-tabs">';
  for (var tierKey in TIERS) {
    html += '<button type="button" class="tier-tab' + (tierKey === currentTierKey ? ' active' : '') + '" data-tier="' + tierKey + '">' + TIERS[tierKey].name + '</button>';
  }
  html += '</div>';

  // Accordion: raids + boss lists
  var raids = TIERS[currentTierKey].raids;
  for (var raidKey in raids) {
    var raid = raids[raidKey];
    var isExpanded = raidKey === currentRaidKey;
    html += '<div class="raid-section">';
    html += '<button type="button" class="raid-header' + (isExpanded ? ' active' : '') + '" data-raid="' + raidKey + '" style="background-image:url(img/' + raidKey + '.webp)">' +
      '<span class="raid-header-overlay"></span>' +
      '<span class="raid-header-content"><span class="raid-header-arrow">' + (isExpanded ? '&#9662;' : '&#9656;') + '</span>' + raid.name + '</span></button>';
    if (isExpanded) {
      html += '<div class="boss-list">';
      for (var bossName in raid.encounters) {
        var bossId = raid.encounters[bossName];
        var isActive = bossId === currentEncounterId;
        var noAsp = typeof getNoAsp === 'function' ? getNoAsp(bossId) : null;
        var aspBadge = noAsp
          ? '<span class="no-asp-badge" title="Not counted for All Star Points">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' +
              '<polygon points="8,1.5 9.9,6 14.8,6 11,9.2 12.5,14 8,11.2 3.5,14 5,9.2 1.2,6 6.1,6" fill="currentColor"/>' +
              '<line x1="2" y1="14.5" x2="14.5" y2="2" stroke-width="2" stroke-linecap="round" stroke="currentColor"/>' +
              '</svg>' +
            '</span>'
          : '';
        html += '<button type="button" class="boss-nav-item' + (isActive ? ' active' : '') + '" data-encounter-id="' + bossId + '" data-boss-name="' + bossName + '">' +
          '<img class="boss-nav-icon" src="' + bossIconUrl(bossId) + '" alt="" loading="lazy" onerror="this.src=\'https://assets.rpglogs.com/img/warcraft/abilities/inv_misc_questionmark.jpg\'">' +
          '<span class="boss-nav-name">' + bossName + '</span>' +
          aspBadge +
          '</button>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  raidNavEl.innerHTML = html;
}

function selectActiveBossNav(encounterId) {
  if (!raidNavEl) return;
  raidNavEl.querySelectorAll('.boss-nav-item').forEach(function(b) {
    var isActive = parseInt(b.dataset.encounterId, 10) === encounterId;
    b.classList.toggle('active', isActive);
  });
}

// Event delegation for raid nav
if (raidNavEl) {
  raidNavEl.addEventListener('click', function(e) {
    // Tier tab click
    var tierTab = e.target.closest('.tier-tab');
    if (tierTab) {
      var newTier = tierTab.dataset.tier;
      if (newTier === currentTierKey) return;
      currentTierKey = newTier;
      var raids = TIERS[newTier].raids;
      currentRaidKey = Object.keys(raids)[0];
      buildRaidNav();
      prefetchRaidBosses(currentRaidKey);
      var entries = Object.entries(raids[currentRaidKey].encounters);
      if (entries.length > 0) {
        fetchAndDisplayRankings(entries[0][0], entries[0][1]);
      }
      return;
    }

    // Raid header click (accordion)
    var raidHeader = e.target.closest('.raid-header');
    if (raidHeader) {
      var raidKey = raidHeader.dataset.raid;
      if (raidKey === currentRaidKey) {
        currentRaidKey = null;
        buildRaidNav();
      } else {
        currentRaidKey = raidKey;
        buildRaidNav();
        prefetchRaidBosses(raidKey);
        var remembered = lastBossPerRaid[raidKey];
        if (remembered && remembered.id === currentEncounterId) {
          // Already viewing this boss, just expand nav
        } else if (remembered) {
          fetchAndDisplayRankings(remembered.name, remembered.id);
        } else {
          var entries = Object.entries(TIERS[currentTierKey].raids[raidKey].encounters);
          if (entries.length > 0) {
            lastBossPerRaid[raidKey] = { name: entries[0][0], id: entries[0][1] };
            fetchAndDisplayRankings(entries[0][0], entries[0][1]);
          }
        }
      }
      return;
    }

    // Boss item click
    var bossItem = e.target.closest('.boss-nav-item');
    if (bossItem) {
      var id = parseInt(bossItem.dataset.encounterId, 10);
      var name = bossItem.dataset.bossName;
      if (currentRaidKey) {
        lastBossPerRaid[currentRaidKey] = { name: name, id: id };
      }
      fetchAndDisplayRankings(name, id);
    }
  });
}

/* --------------------------------------------------------------------------------
   Main fetch & display
   -------------------------------------------------------------------------------- */
function renderContent(data, encounterId) {
  var startTime = performance.now();
  currentData = data;
  populateFilterDropdowns(data);
  var talentResult = renderTalentSummary(data);
  var topByTier = talentResult.topByTier;
  var finalRankingsHTML = optimizedRenderer.renderRankings(data, topByTier);

  if (rankingsDiv) rankingsDiv.innerHTML = finalRankingsHTML;
  updateHeaderSortIndicators();
  applyFiltersAndSort();

  var el = document.querySelector('.talent-sidebar .talent-summary');
  if (el) el.innerHTML = talentResult.html;
  var trinketEl = document.getElementById('trinket-summary');
  if (trinketEl) trinketEl.innerHTML = renderTrinketSummary(data) || '';

  var rulesContainer = document.getElementById('sidebar-parsing-rules');
  if (rulesContainer) rulesContainer.innerHTML = renderParsingRules(encounterId);

  scheduler.postTask(function() {
    if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
    if (typeof loadHasteForRankings === 'function') {
      loadHasteForRankings(Array.isArray(data.rankings) ? data.rankings.slice(0, 100) : []);
    }
  }, { priority: 'background' });

  console.log('Rendered in ' + (performance.now() - startTime).toFixed(1) + 'ms');
}

/* Background revalidate — fetch fresh data and update if boss is still active */
function revalidateInBackground(encounterId) {
  fetch(API_URL(encounterId), { headers: { 'accept': 'application/json' } })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) {
      if (!data) return;
      var serverTs = data.cachedAt || (new Date()).toISOString();
      writeCache(encounterId, data, serverTs);
      // Only re-render if user is still viewing this boss
      if (currentEncounterId === encounterId) {
        updateLastUpdated(serverTs);
        renderContent(data, encounterId);
      }
    })
    .catch(function() { /* silent — stale data is already displayed */ });
}

/* Prefetch all bosses in the current raid (background, low priority) */
function prefetchRaidBosses(raidKey) {
  var raids = TIERS[currentTierKey] && TIERS[currentTierKey].raids;
  if (!raids || !raids[raidKey]) return;
  var encounters = raids[raidKey].encounters;
  Object.keys(encounters).forEach(function(bossName) {
    var id = encounters[bossName];
    if (id === currentEncounterId) return; // skip current boss
    var cached = readCache(id);
    if (cached && isFresh(cached.cachedAt || (cached.data && cached.data.cachedAt))) return; // already fresh
    // Stagger prefetches to avoid flooding
    setTimeout(function() {
      fetch(API_URL(id), { headers: { 'accept': 'application/json' } })
        .then(function(res) { return res.ok ? res.json() : null; })
        .then(function(data) {
          if (data) writeCache(id, data, data.cachedAt || (new Date()).toISOString());
        })
        .catch(function() {});
    }, Math.random() * 2000);
  });
}

async function fetchAndDisplayRankings(name, encounterId) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Update state
  currentBossName = name;
  currentEncounterId = encounterId;
  selectActiveBossNav(encounterId);

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

  // Stale-while-revalidate: show cached data immediately, fetch fresh in background
  var cached = readCache(encounterId);
  var cachedAt = cached ? (cached.cachedAt || (cached.data && cached.data.cachedAt)) : null;

  if (cached) {
    updateLastUpdated(cachedAt);
    renderContent(cached.data, encounterId);
    // If stale, revalidate in background (user already sees data)
    if (!isFresh(cachedAt)) {
      revalidateInBackground(encounterId);
    }
    return;
  }

  // No cache at all — show loader and fetch
  if (rankingsDiv) {
    rankingsDiv.innerHTML = '<div style="text-align:center;color:#bbb;margin-top:16px;"><div class="loader"></div><p>Loading ' + name + '…</p></div>';
  }

  try {
    var res = await fetch(API_URL(encounterId), {
      signal: currentController.signal,
      headers: { 'accept': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    var data = await res.json();
    var serverTs = data.cachedAt || (new Date()).toISOString();
    writeCache(encounterId, data, serverTs);
    updateLastUpdated(serverTs);
    renderContent(data, encounterId);

  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('Failed to fetch rankings:', err);
    if (rankingsDiv) {
      rankingsDiv.innerHTML = '<div style="text-align:center;color:red;margin-top:16px;">Couldn\'t load data for ' + name + '. Please try again later.</div>';
    }
    updateLastUpdated(null);
    var el = document.querySelector('.talent-sidebar .talent-summary');
    if (el) el.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem; font-style: italic;">Failed to load talent data</div>';
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
  if (!iso) { lastUpdatedEl.innerHTML = ''; return; }
  lastUpdatedEl.innerHTML = '<span class="last-updated-badge">' +
    '<img class="last-updated-icon" src="https://assets.rpglogs.com/img/warcraft/favicon.png?v=4" alt="">' +
    '<span class="last-updated-label">Updated from WarcraftLogs</span>' +
    '<span class="last-updated-separator"></span>' +
    '<span class="last-updated-time">' + formatAgo(iso) + '</span>' +
    '</span>';
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
// Sort via column headers
var defaultDirs = { dps: 'desc', ilvl: 'desc', duration: 'asc', date: 'desc' };

function updateHeaderSortIndicators() {
  if (!rankingsDiv) return;
  var headers = rankingsDiv.querySelectorAll('.rank-table-header [data-sort]');
  for (var i = 0; i < headers.length; i++) {
    var field = headers[i].getAttribute('data-sort');
    var arrow = headers[i].querySelector('.sort-arrow');
    if (field === currentSortField) {
      headers[i].classList.add('active-sort');
      if (arrow) arrow.textContent = currentSortDir === 'desc' ? '\u25BC' : '\u25B2';
    } else {
      headers[i].classList.remove('active-sort');
      if (arrow) arrow.textContent = '';
    }
  }
}

function resetSortToggles() {
  updateHeaderSortIndicators();
}

if (rankingsDiv) {
  rankingsDiv.addEventListener('click', function(e) {
    var header = e.target.closest('.rank-table-header [data-sort]');
    if (!header) return;
    var field = header.getAttribute('data-sort');
    if (field === currentSortField) {
      currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      currentSortField = field;
      currentSortDir = defaultDirs[field];
    }
    updateHeaderSortIndicators();
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
  buildRaidNav();

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
