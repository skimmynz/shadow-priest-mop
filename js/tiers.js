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
  },
  t16: {
    name: 'T16',
    raids: {
      soo: { short: 'SoO', name: 'Siege of Orgrimmar', encounters: { "Immerseus": 51602, "Fallen Protectors": 51598, "Norushen": 51624, "Sha of Pride": 51604, "Galakras": 51622, "Iron Juggernaut": 51600, "Kor'kron Dark Shaman": 51606, "General Nazgrim": 51603, "Malkorok": 51595, "Spoils of Pandaria": 51594, "Thok the Bloodthirsty": 51599, "Siegecrafter Blackfuse": 51601, "Paragons of the Klaxxi": 51593, "Garrosh Hellscream": 51623 } }
    }
  }
};
var currentTierKey = 't15';
var currentRaidKey = 'tot';
var currentEncounterId = null;
var lastBossPerRaid = {};

// DOM refs — raid navigation sidebar
var raidNavEl = document.getElementById('raid-nav');

// Existing DOM refs
var rankingsDiv = document.getElementById('rankings');
var searchInput = document.getElementById('search-input');
var searchClear = document.getElementById('search-clear');
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
var API_URL = function(id) { return '/api/logs?encounterId=' + id; };
