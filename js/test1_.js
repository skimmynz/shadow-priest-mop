// Boss data (matching script.js TIERS structure)
const TIERS = {
  t14: {
    msv: {
      "The Stone Guard": 1395,
      "Feng the Accursed": 1390,
      "Gara'jal the Spiritbinder": 1434,
      "The Spirit Kings": 1436,
      "Elegon": 1500,
      "Will of the Emperor": 1407
    },
    hof: {
      "Imperial Vizier Zor'lok": 1507,
      "Blade Lord Ta'yak": 1504,
      "Garalon": 1463,
      "Wind Lord Mel'jarak": 1498,
      "Amber-Shaper Un'sok": 1499,
      "Grand Empress Shek'zeer": 1501
    },
    toes: {
      "Protectors of the Endless": 1409,
      "Tsulong": 1505,
      "Lei Shi": 1506,
      "Sha of Fear": 1431
    }
  },
  t15: {
    tot: {
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
};

// Talent data
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

let currentTier = 't15';
let fetchController = null;
const fetchCache = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBossIconId(enc) {
  return (enc >= 51559 && enc <= 51580) ? enc - 50000 : enc;
}
function bossIconUrl(enc) {
  return 'https://assets.rpglogs.com/img/warcraft/bosses/' + getBossIconId(enc) + '-icon.jpg?v=2';
}
function talentIconUrl(name) {
  var key = talentIcons[name] || 'inv_misc_questionmark';
  return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
}
function getTalentDisplayName(apiName) {
  return talentNameMap[apiName] || apiName;
}

// ---------------------------------------------------------------------------
// First boss of current tier (used for auto-load)
// ---------------------------------------------------------------------------
function firstBossOfTier(tier) {
  var raids = TIERS[tier];
  for (var raid in raids) {
    var entries = Object.entries(raids[raid]);
    if (entries.length) return { name: entries[0][0], id: entries[0][1] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Render boss icon grid
// ---------------------------------------------------------------------------
function renderBossIcons() {
  var container = document.getElementById('boss-selection');
  if (!container) return;

  var tierData = TIERS[currentTier], html = '';
  for (var raid in tierData) {
    for (var [name, id] of Object.entries(tierData[raid])) {
      html +=
        '<button class="boss-icon-btn" data-boss-id="' + id + '" data-boss-name="' + name + '">' +
          '<img src="' + bossIconUrl(id) + '" alt="' + name + '" loading="lazy" ' +
            'onerror="this.src=\'https://assets.rpglogs.com/img/warcraft/abilities/inv_misc_questionmark.jpg\'">' +
          '<div class="boss-name-tooltip">' + name + '</div>' +
        '</button>';
    }
  }
  container.innerHTML = html;

  container.querySelectorAll('.boss-icon-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectBoss(parseInt(btn.dataset.bossId), btn.dataset.bossName, btn);
    });
  });
}

// ---------------------------------------------------------------------------
// Select a boss — cancel in-flight, set active state, fetch & render
// ---------------------------------------------------------------------------
async function selectBoss(bossId, bossName, btnElement) {
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();

  // Active state on the clicked button
  if (btnElement) {
    document.querySelectorAll('.boss-icon-btn').forEach(function(b) { b.classList.remove('active'); });
    btnElement.classList.add('active');
  }

  var resultsDiv = document.getElementById('talent-results');
  if (!resultsDiv) return;

  resultsDiv.innerHTML =
    '<div class="loading-state">' +
      '<div style="margin:0 auto 0.5rem;border:3px solid var(--border-color);border-top:3px solid var(--accent-color);' +
        'border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;"></div>' +
      '<p>Loading...</p>' +
    '</div>';

  try {
    var CACHE_KEY = 'spriest_rankings_' + bossId;
    var data = null;

    // 1. In-memory cache (fastest)
    if (fetchCache.has(CACHE_KEY)) {
      var cached = fetchCache.get(CACHE_KEY);
      if ((Date.now() - cached.timestamp) < 3600000) {
        data = cached.data;
      }
    }

    // 2. localStorage cache
    if (!data) {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          var cachedAt = parsed.cachedAt || (parsed.data && parsed.data.cachedAt);
          if (cachedAt && (Date.now() - Date.parse(cachedAt)) < 3600000 && parsed.data) {
            data = parsed.data;
            fetchCache.set(CACHE_KEY, { data: data, timestamp: Date.now() });
          }
        }
      } catch (e) { /* ignore */ }
    }

    // 3. Network fetch
    if (!data) {
      var res = await fetch('/.netlify/functions/getLogs?encounterId=' + bossId, {
        signal: fetchController.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();

      if (!data || !data.rankings || !data.rankings.length) {
        resultsDiv.innerHTML = '<div class="empty-state">No ranking data available for this boss yet.</div>';
        return;
      }

      // Write both caches
      fetchCache.set(CACHE_KEY, { data: data, timestamp: Date.now() });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data, cachedAt: new Date().toISOString() }));
      } catch (e) {
        // quota exceeded — evict oldest 5 and retry
        try {
          var keys = Object.keys(localStorage).filter(function(k) { return k.startsWith('spriest_rankings_'); });
          var entries = keys.map(function(k) {
            try { var d = JSON.parse(localStorage.getItem(k)); return { key: k, time: Date.parse(d.cachedAt) || 0 }; }
            catch(x) { return { key: k, time: 0 }; }
          }).sort(function(a, b) { return a.time - b.time; });
          for (var i = 0; i < Math.min(5, entries.length); i++) localStorage.removeItem(entries[i].key);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data, cachedAt: new Date().toISOString() }));
        } catch (x) { /* give up on cache */ }
      }
    }

    renderTalents(data, bossName);

  } catch (err) {
    if (err.name === 'AbortError') return;
    resultsDiv.innerHTML = '<div class="empty-state">Failed to load talent data. Please try again later.</div>';
  }
}

// ---------------------------------------------------------------------------
// Render talent grid
// ---------------------------------------------------------------------------
function renderTalents(data, bossName) {
  var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];

  // Tally
  var tierCounts = {}, totalPerTier = {};
  Object.keys(talentTiers).forEach(function(tier) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    talentTiers[tier].forEach(function(t) { tierCounts[tier][t] = 0; });
  });

  rankings.forEach(function(entry) {
    var seen = {};
    var talents = Array.isArray(entry && entry.talents) ? entry.talents : [];
    talents.forEach(function(t) {
      var dn = getTalentDisplayName(t.name);
      var tier = Object.keys(talentTiers).find(function(ti) { return talentTiers[ti].indexOf(dn) !== -1; });
      if (tier && !seen[tier]) {
        tierCounts[tier][dn]++;
        totalPerTier[tier]++;
        seen[tier] = true;
      }
    });
  });

  // Build HTML
  var html = '<div class="talent-display">';

  Object.keys(talentTiers).sort(function(a, b) { return Number(a) - Number(b); }).forEach(function(tier) {
    var total = totalPerTier[tier] || 0;

    // Find max percentage in this tier for "is-top" highlighting
    var maxPct = 0;
    talentTiers[tier].forEach(function(t) {
      var pct = total > 0 ? ((tierCounts[tier][t] || 0) / total) * 100 : 0;
      if (pct > maxPct) maxPct = pct;
    });

    html += '<div class="talent-row-container">';
    html += '<div class="talent-tier-label">' + tier + '</div>';
    html += '<div class="talent-row">';

    talentTiers[tier].forEach(function(talent) {
      var count = tierCounts[tier][talent] || 0;
      var pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      var isTop = parseFloat(pct) >= maxPct - 0.05 && maxPct > 0;
      var color = parseFloat(pct) >= 75 ? '#10b981' : (parseFloat(pct) <= 10 ? '#ef4444' : '#f59e0b');
      var spellId = talentSpellIds[talent];
      var url = 'https://www.wowhead.com/mop-classic/spell=' + spellId;

      html +=
        '<a href="' + url + '" target="_blank" rel="noopener" class="talent-icon wowhead ' + (isTop ? 'is-top' : '') + '">' +
          '<img src="' + talentIconUrl(talent) + '" alt="' + talent + '" loading="lazy">' +
          '<div class="talent-percent" style="color:' + color + '">' + pct + '%</div>' +
        '</a>';
    });

    html += '</div></div>';
  });

  html += '</div>';

  var resultsDiv = document.getElementById('talent-results');
  if (resultsDiv) resultsDiv.innerHTML = html;

  if (window.$WowheadPower) setTimeout(function() { window.$WowheadPower.refreshLinks(); }, 100);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  renderBossIcons();

  // Tier toggle buttons
  document.querySelectorAll('.tier-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tier-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTier = btn.dataset.tier;
      renderBossIcons();

      // Auto-load first boss of the new tier
      var first = firstBossOfTier(currentTier);
      if (first) {
        var activeBtn = document.querySelector('.boss-icon-btn[data-boss-id="' + first.id + '"]');
        selectBoss(first.id, first.name, activeBtn);
      }
    });
  });

  // Auto-load first boss of the default tier immediately on page load
  var first = firstBossOfTier(currentTier);
  if (first) {
    // Small delay so the boss icons are painted first, then kick off the fetch
    // (icons render instantly; the fetch/render is independent)
    requestAnimationFrame(function() {
      var activeBtn = document.querySelector('.boss-icon-btn[data-boss-id="' + first.id + '"]');
      selectBoss(first.id, first.name, activeBtn);
    });
  }
});
