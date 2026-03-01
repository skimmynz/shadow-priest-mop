/* --------------------------------------------------------------------------------
   Per-player haste display in rankings
   -------------------------------------------------------------------------------- */

var HASTE_CACHE_PREFIX = 'haste-';
var HASTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hasteToPercent(rating) {
  // Shadow Priest base 5% haste passive (1.05 multiplier), gear stat only — no buffs
  return ((1 + rating / 42500) * 1.05 - 1) * 100;
}

function readHasteCache(reportID, fightID) {
  try {
    var raw = localStorage.getItem(HASTE_CACHE_PREFIX + reportID + '-' + fightID);
    if (!raw) return null;
    var entry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > HASTE_CACHE_TTL_MS) return null;
    return entry.players;
  } catch (e) {
    return null;
  }
}

function writeHasteCache(reportID, fightID, players) {
  try {
    localStorage.setItem(
      HASTE_CACHE_PREFIX + reportID + '-' + fightID,
      JSON.stringify({ players: players, cachedAt: Date.now() })
    );
  } catch (e) {}
}

function fetchHasteForFight(reportID, fightID) {
  var cached = readHasteCache(reportID, fightID);
  if (cached) return Promise.resolve(cached);
  return fetch('/.netlify/functions/getPlayerHaste?reportID=' + reportID + '&fightID=' + fightID, {
    headers: { 'accept': 'application/json' }
  })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) {
      if (!data || !data.players) return {};
      writeHasteCache(reportID, fightID, data.players);
      return data.players;
    })
    .catch(function() { return {}; });
}

function injectHaste(playerName, hasteRating) {
  var entries = document.querySelectorAll('.rank-entry');
  for (var i = 0; i < entries.length; i++) {
    var el = entries[i];
    if (el.getAttribute('data-name') !== playerName) continue;
    var colHaste = el.querySelector('.col-haste');
    if (!colHaste) continue;
    // Replace loading placeholder if present
    var existing = colHaste.querySelector('.player-haste');
    if (existing && existing.classList.contains('player-haste-loading')) {
      existing.remove();
    } else if (existing) {
      continue; // already injected
    }
    var pct = hasteToPercent(hasteRating).toFixed(1);
    var link = document.createElement('a');
    link.className = 'player-haste';
    link.href = '/haste?rating=' + hasteRating;
    link.title = 'Open in Haste Calculator';
    link.innerHTML = '<span class="player-haste-rating">' + hasteRating.toLocaleString() + '</span> <span class="player-haste-pct">' + pct + '%</span>';
    colHaste.appendChild(link);
  }
}

function setHastePlaceholders(rankings) {
  for (var i = 0; i < rankings.length; i++) {
    var r = rankings[i];
    if (!r || !r.name) continue;
    var entries = document.querySelectorAll('.rank-entry');
    for (var j = 0; j < entries.length; j++) {
      var el = entries[j];
      if (el.getAttribute('data-name') !== r.name) continue;
      var colHaste = el.querySelector('.col-haste');
      if (!colHaste || colHaste.querySelector('.player-haste')) continue;
      var placeholder = document.createElement('span');
      placeholder.className = 'player-haste player-haste-loading';
      placeholder.textContent = '···';
      colHaste.appendChild(placeholder);
    }
  }
}

function loadHasteForRankings(rankings) {
  if (!Array.isArray(rankings) || rankings.length === 0) return;
  // Only inject haste that was pre-embedded server-side — no extra WCL API calls.
  for (var i = 0; i < rankings.length; i++) {
    var r = rankings[i];
    if (r && r.name && typeof r.hasteRating === 'number') {
      injectHaste(r.name, r.hasteRating);
    }
  }
}
