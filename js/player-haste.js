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
    var colName = el.querySelector('.col-name');
    if (!colName) continue;
    // Replace loading placeholder if present
    var existing = colName.querySelector('.player-haste');
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
    link.innerHTML = hasteRating.toLocaleString() + ' <span class="player-haste-pct">' + pct + '%</span>';
    var playerServer = colName.querySelector('.player-server');
    if (playerServer) {
      colName.insertBefore(link, playerServer);
    } else {
      colName.appendChild(link);
    }
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
      var colName = el.querySelector('.col-name');
      if (!colName || colName.querySelector('.player-haste')) continue;
      var placeholder = document.createElement('span');
      placeholder.className = 'player-haste player-haste-loading';
      placeholder.textContent = '···';
      var playerServer = colName.querySelector('.player-server');
      if (playerServer) {
        colName.insertBefore(placeholder, playerServer);
      } else {
        colName.appendChild(placeholder);
      }
    }
  }
}

function loadHasteForRankings(rankings) {
  if (!Array.isArray(rankings) || rankings.length === 0) return;

  setHastePlaceholders(rankings);

  // Group players by reportID+fightID
  var groups = new Map();
  for (var i = 0; i < rankings.length; i++) {
    var r = rankings[i];
    if (!r || !r.reportID || !r.fightID || !r.name) continue;
    var key = r.reportID + '-' + r.fightID;
    if (!groups.has(key)) groups.set(key, { reportID: r.reportID, fightID: r.fightID, players: [] });
    groups.get(key).players.push(r.name);
  }

  var tasks = Array.from(groups.values());
  var index = 0;
  var CONCURRENCY = 5;

  function runNext() {
    if (index >= tasks.length) return;
    var task = tasks[index++];
    fetchHasteForFight(task.reportID, task.fightID).then(function(playerMap) {
      for (var name in playerMap) {
        if (playerMap[name] && typeof playerMap[name].hasteRating === 'number') {
          injectHaste(name, playerMap[name].hasteRating);
        }
      }
      runNext();
    });
  }

  // Start up to CONCURRENCY tasks
  var initialBatch = Math.min(CONCURRENCY, tasks.length);
  for (var i = 0; i < initialBatch; i++) {
    runNext();
  }
}
