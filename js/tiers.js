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
