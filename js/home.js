/* ═══════════════════════════════════════════════════════
   Home Page — js/home.js  v2
   Throne of Thunder boss tips (wing-grouped) + lazy streams
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Wowhead link helpers ──────────────────────────── */
  function sp(id, name) {
    return '<a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=' + id + '">' + name + '</a>';
  }
  function it(id, name) {
    return '<a class="wowhead" href="https://www.wowhead.com/mop-classic/item=' + id + '">' + name + '</a>';
  }

  /* Reusable spell/item references */
  var SWP  = sp(589,    'Shadow Word: Pain');
  var VT   = sp(34914,  'Vampiric Touch');
  var SWD  = sp(32379,  'Shadow Word: Death');
  var DP   = sp(2944,   'Devouring Plague');
  var MFI  = sp(129197, 'Mind Flay: Insanity');
  var MS   = sp(48045,  'Mind Sear');
  var TOF  = sp(109142, 'Twist of Fate');
  var HALO = sp(120644, 'Halo');
  var CASC = sp(127632, 'Cascade');
  var DS   = sp(122128, 'Divine Star');
  var VE   = sp(15290,  'Vampiric Embrace');
  var ORBS = sp(95740,  'Shadow Orbs');
  var BL   = sp(2825,   'Bloodlust');
  var POT  = sp(105702, 'Potion of the Jade Serpent');
  var UVLS = it(96558,  'Unerring Vision of Lei Shen');
  var T15  = sp(138156, 'Tier 15 Shadow Priest 2P bonus');

  /* ── Boss icon URL (ToT 515xx → 15xx) ─────────────── */
  function iconUrl(enc) {
    var id = (enc >= 51559 && enc <= 51580) ? enc - 50000 : enc;
    return 'https://assets.rpglogs.com/img/warcraft/bosses/' + id + '-icon.jpg?v=2';
  }

  /* ── Wing-grouped ToT Data ─────────────────────────── */
  var wings = [
    {
      label: 'Last Stand of the Zandalari',
      bosses: [
        {
          id: 'jinrokh', name: "Jin'rokh the Breaker", enc: 51577,
          tips: [
            'Prepot ' + POT + ' at 15s and hold your cooldowns.',
            'With ' + BL + ' and Fluidity, use your CDs and 2nd ' + POT + '. RNG ' + UVLS + ' procs.',
            'After you clear Ionization, get back into the Fluidity pool quickly and reapply DoTs.',
            'Use ' + VE + ' during Lightning Storm.'
          ],
          rules: ['No rules.']
        },
        {
          id: 'horridon', name: 'Horridon', enc: 51575,
          tips: [
            'Apply ' + SWP + ' to small adds. Keep ' + SWP + ' and ' + VT + ' on marked elite adds.',
            'Double DoT the Direhorn Spirit to benefit from the ' + T15 + '.',
            'Spend ' + DP + ' and ' + MFI + ' on Horridon.',
            'Use ' + VE + ' during high Bestial Cry stacks.'
          ],
          rules: ['Horridon is removed from Damage All Star Points.']
        },
        {
          id: 'council', name: 'Council of Elders', enc: 51570,
          tips: [
            'Stack in melee so you can hit multiple targets with ' + DS + ' on cooldown.',
            'Keep DoTs rolling on all bosses and fill with ' + MS + '.',
            'Recast DoTs when ' + UVLS + ' procs.'
          ],
          rules: ['Damage done to Living Sand is removed.']
        }
      ]
    },
    {
      label: 'Forgotten Depths',
      bosses: [
        {
          id: 'tortos', name: 'Tortos', enc: 51565,
          tips: [
            'Cast ' + SWP + ' and ' + SWD + ' on adds to trigger ' + TOF + ' and generate ' + ORBS + '.',
            'Maintain ' + SWP + ' on a Humming Crystal for the shield.',
            'Stay spread to reduce the chance of being knocked up by the Whirl Turtles.'
          ],
          rules: [
            'Damage done to Humming Crystal is removed.',
            'Heroic Only: Damage done to Vampiric Cave Bat is removed.',
            'Only damage done to Whirl Turtles that cast Shell Concussion (which they do when kicked) counts.'
          ]
        },
        {
          id: 'megaera', name: 'Megaera', enc: 51578,
          tips: [
            'Ignore the Venomous Head.',
            'Cast ' + SWD + ' on Nether Wyrms to generate ' + ORBS + '.',
            'Swap to ' + DS + ' if your raid needs extra healing throughput.'
          ],
          rules: [
            "Damage done to heads that don't die is removed.",
            '25m Heroic: Damage done to Nether Wyrm is removed.'
          ]
        },
        {
          id: 'jikun', name: 'Ji-Kun', enc: 51573,
          tips: [
            'Use feather charges to intercept Feed Young and gain Primal Nutriment.',
            'Cast DoTs on the Nest Guardian. Use ' + MS + ' and ' + SWD + ' on Hatchlings.',
            'Use ' + VE + ' during Quills if raid is low.'
          ],
          rules: ['Ji-Kun is removed from Damage All Star Points.']
        }
      ]
    },
    {
      label: 'Halls of Flesh-Shaping',
      bosses: [
        {
          id: 'durumu', name: 'Durumu the Forgotten', enc: 51572,
          tips: [
            'Snipe Crimson Fog adds with ' + SWD + ' for ' + TOF + ' uptime and ' + ORBS + '.',
            'Cast ' + HALO + ' and DoTs on the Ice Walls.'
          ],
          rules: ['Damage done to Wandering Eye is removed.']
        },
        {
          id: 'primordius', name: 'Primordius', enc: 51574,
          tips: [
            'Keep DoTs on all Living Fluids (unless your Warlocks know how to play Affliction).',
            'Use ' + CASC + ' on cooldown.',
            'Adjust your camera angle to help dodge puddles and avoid unwanted debuffs.'
          ],
          rules: ['Primordius is removed from Damage and Healing All Star Points.']
        },
        {
          id: 'darkanimus', name: 'Dark Animus', enc: 51576,
          tips: [
            'DoT as many Anima Golems as possible to maintain ' + TOF + '.',
            'Use ' + CASC + ' on cooldown for efficient multi-target damage.',
            'Focus your ' + DP + ' and ' + MFI + ' into the boss.'
          ],
          rules: [
            'Heroic: Damage to Large Anima Golem and Massive Anima Golem is removed.',
            'Only count damage done to Anima Golems that die.'
          ]
        }
      ]
    },
    {
      label: 'Pinnacle of Storms',
      bosses: [
        {
          id: 'ironqon', name: 'Iron Qon', enc: 51559,
          tips: [
            "Recast DoTs on Iron Qon during mount transitions (Ro'shak \u2192 Quet'zal \u2192 Dam'ren).",
            'Hold your 2nd cooldowns and ' + POT + ' for the final phase, when all four targets are active.',
            'Use ' + VE + ' during Fist Smash if raid is low.'
          ],
          rules: ['Damage done to Ice Tomb is removed.']
        },
        {
          id: 'consorts', name: 'Twin Empyreans', enc: 51560,
          tips: [
            'Precast ' + VT + ' on Suen then ' + SWP + ' before she vanishes.',
            'Refresh DoTs on Suen during Tears of the Sun.',
            'During Nuclear Inferno (boss immune), focus on off-healing. Use ' + VE + ' when Blazing Radiance stacks get high.'
          ],
          rules: ['Damage done to Lurker in the Night is removed.']
        },
        {
          id: 'leishen', name: 'Lei Shen', enc: 51579,
          tips: [
            'Use ' + HALO + ' and ' + MS + ' to handle Ball Lightnings.',
            'Snipe low adds with ' + SWD + ' to generate ' + ORBS + '.',
            'Save your CDs and 2nd ' + POT + ' for ' + BL + '.'
          ],
          rules: [
            'Damage done to Unharnessed Power, Lesser Diffused Lightning, Greater Diffused Lightning, and Diffused Lightning is removed.'
          ]
        },
        {
          id: 'raden', name: 'Ra-den', enc: 51580,
          tips: [
            'DoT the Crackling Stalker, then burst it with ' + DS + ' and ' + SWD + '.',
            'Snipe the first Essence of Anima with ' + SWD + '. Burn the remaining ones with ' + DP + ' and ' + MFI + '.',
            'Sub 40%, use ' + DS + ' on cooldown to help with the HPS check.'
          ],
          rules: [
            'Damage done to Sanguine Horror, Corrupted Anima, Corrupted Vita, and Essence of Vita is removed.'
          ]
        }
      ]
    }
  ];

  /* Flat list for panel indexing */
  var allBosses = [];
  wings.forEach(function (w) {
    w.bosses.forEach(function (b) { allBosses.push(b); });
  });

  /* ── Rendering ─────────────────────────────────────── */

  function buildParsingRules(rules) {
    if (!rules || !rules.length) return '';
    var items = rules.map(function (r) { return '<li>' + r + '</li>'; }).join('');
    return (
      '<div class="parsing-box">' +
        '<div class="parsing-hdr">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
          '<span class="parsing-lbl">Parsing Rules</span>' +
        '</div>' +
        '<ul>' + items + '</ul>' +
      '</div>'
    );
  }

  function render() {
    var tabsEl = document.getElementById('bossTabs');
    var contentEl = document.getElementById('tipsContent');
    if (!tabsEl || !contentEl) return;

    /* Build wing-grouped tabs */
    var globalIdx = 0;
    var tabsHtml = wings.map(function (wing) {
      var iconsHtml = wing.bosses.map(function (b) {
        var idx = globalIdx++;
        return (
          '<button class="boss-tab' + (idx === 0 ? ' active' : '') + '" data-idx="' + idx + '" type="button">' +
            '<img src="' + iconUrl(b.enc) + '" alt="' + b.name + '" loading="lazy">' +
            '<span class="boss-tab-tip">' + b.name + '</span>' +
          '</button>'
        );
      }).join('');

      return (
        '<div class="boss-wing">' +
          '<span class="wing-label">' + wing.label + '</span>' +
          '<div class="wing-icons">' + iconsHtml + '</div>' +
        '</div>'
      );
    }).join('');

    tabsEl.innerHTML = tabsHtml;

    /* Build panels */
    contentEl.innerHTML = allBosses.map(function (b, i) {
      var tipsHtml = b.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      return (
        '<div class="boss-panel' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
          '<div class="boss-panel-name">' +
            '<img src="' + iconUrl(b.enc) + '" alt="">' +
            b.name +
          '</div>' +
          '<ul class="tips-list">' + tipsHtml + '</ul>' +
          buildParsingRules(b.rules) +
        '</div>'
      );
    }).join('');

    /* Tab switching (delegated) */
    tabsEl.addEventListener('click', function (e) {
      var tab = e.target.closest('.boss-tab');
      if (!tab) return;
      var idx = tab.dataset.idx;

      tabsEl.querySelectorAll('.boss-tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.idx === idx);
      });
      contentEl.querySelectorAll('.boss-panel').forEach(function (p) {
        p.classList.toggle('active', p.dataset.idx === idx);
      });
    });

    /* Refresh Wowhead tooltips */
    if (window.$WowheadPower) {
      window.$WowheadPower.refreshLinks();
    }
  }

  /* ── Lazy stream loading ───────────────────────────── */

  function initLazyStreams() {
    var targets = document.querySelectorAll('.stream-embed[data-src]');
    if (!targets.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadStream(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '300px' });

      targets.forEach(function (el) { observer.observe(el); });
    } else {
      targets.forEach(loadStream);
    }
  }

  function loadStream(container) {
    var src = container.getAttribute('data-src');
    var title = container.getAttribute('data-title') || '';
    if (!src) return;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    if (title) iframe.setAttribute('title', title);

    var placeholder = container.querySelector('.stream-placeholder');
    if (placeholder) placeholder.remove();

    container.appendChild(iframe);
    container.removeAttribute('data-src');
  }

  /* ── 3D character model viewer ─────────────────────── */

  /*
   * Uses Wowhead's ZamModelViewer (the same engine classicwowarmory.com uses).
   * Assets are loaded via bypass-cors-policies.onrender.com to satisfy CORS.
   *
   * Character appearance values for Skimmyxo (Troll Priest):
   *   race 8 = Troll, gender 1 = female
   *   Adjust skin/face/hair/facialStyle to match the actual character.
   *   items[] accepts { slot, displayId } pairs — leave empty for a base model.
   */
  var CHAR_MODEL = {
    race: 8, gender: 1,
    skin: 2, face: 1, hairStyle: 5, hairColor: 3, facialStyle: 0,
    items: []
  };

  function initCharacterModel() {
    var container = document.getElementById('charModelContainer');
    if (!container) return;

    var contentPath =
      'https://bypass-cors-policies.onrender.com/' +
      'https://wow.zamimg.com/modelviewer/live/';

    function showFallback() {
      container.innerHTML =
        '<div class="model-fallback">' +
          '<a href="https://classicwowarmory.com/character/US/arugal-au/skimmyxo' +
             '?game_version=classic" target="_blank" rel="noopener">' +
            'View on Classic WoW Armory →' +
          '</a>' +
        '</div>';
    }

    function loadScript(src, onload) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = onload;
      s.onerror = showFallback;
      document.head.appendChild(s);
    }

    function startViewer() {
      loadScript(
        'https://wow.zamimg.com/modelviewer/live/viewer/viewer.min.js',
        function() {
          if (typeof ZamModelViewer === 'undefined') { showFallback(); return; }

          var loading = container.querySelector('.model-loading');
          if (loading) loading.remove();

          try {
            new ZamModelViewer({
              parent: container,
              contentPath: contentPath,
              type: 1,              // 1 = player character
              id: CHAR_MODEL,
              width: container.offsetWidth  || 340,
              height: container.offsetHeight || 560
            });
          } catch (e) { showFallback(); }
        }
      );
    }

    // ZamModelViewer requires jQuery
    if (window.jQuery) {
      startViewer();
    } else {
      loadScript(
        'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js',
        startViewer
      );
    }
  }

  /* ── Character parse loader ────────────────────────── */

  var CHAR_CACHE_KEY = 'character-rankings-v1';
  var CHAR_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /* Boss order matches wing order above; short names for compact table */
  var BOSS_ORDER = [
    { enc: 51577, name: "Jin'rokh" },
    { enc: 51575, name: 'Horridon' },
    { enc: 51570, name: 'Council' },
    { enc: 51565, name: 'Tortos' },
    { enc: 51578, name: 'Megaera' },
    { enc: 51573, name: 'Ji-Kun' },
    { enc: 51572, name: 'Durumu' },
    { enc: 51574, name: 'Primordius' },
    { enc: 51576, name: 'Dark Animus' },
    { enc: 51559, name: 'Iron Qon' },
    { enc: 51560, name: 'Twins' },
    { enc: 51579, name: 'Lei Shen' },
    { enc: 51580, name: 'Ra-den' }
  ];

  function parsePctClass(pct) {
    if (pct >= 100) return 'parse-legendary';
    if (pct >= 95)  return 'parse-epic';
    if (pct >= 75)  return 'parse-rare';
    if (pct >= 50)  return 'parse-uncommon';
    return 'parse-poor';
  }

  function renderParseTable(rankings) {
    var map = {};
    rankings.forEach(function(r) {
      // API may return encounterID or encounter_id
      var id = r.encounterID || r.encounter_id;
      if (id) map[id] = r;
    });

    var headerHtml =
      '<div class="parse-table-header">' +
        '<span>Boss</span><span>Parse</span><span>Rank</span>' +
      '</div>';

    var rowsHtml = BOSS_ORDER.map(function(b) {
      var r = map[b.enc];
      if (!r) {
        return (
          '<div class="parse-row">' +
            '<span class="parse-boss">' + b.name + '</span>' +
            '<span class="parse-pct parse-poor">—</span>' +
            '<span class="parse-rank">—</span>' +
          '</div>'
        );
      }
      var pct = Math.round(r.percentile || r.rankPercent || 0);
      var cls = parsePctClass(pct);
      var wclUrl =
        'https://classic.warcraftlogs.com/character/us/arugal-au/skimmyxo' +
        '#zone=29&boss=' + b.enc;
      return (
        '<div class="parse-row">' +
          '<a class="parse-boss" href="' + wclUrl + '" target="_blank" rel="noopener">' +
            b.name +
          '</a>' +
          '<span class="parse-pct ' + cls + '">' + pct + '</span>' +
          '<span class="parse-rank">#' + r.rank + '</span>' +
        '</div>'
      );
    }).join('');

    return headerHtml + rowsHtml;
  }

  function showParseError(el) {
    el.innerHTML =
      '<div class="parse-error">' +
        'Could not load parse data. ' +
        '<a href="https://classic.warcraftlogs.com/character/us/arugal-au/skimmyxo"' +
           ' target="_blank" rel="noopener">View on WarcraftLogs →</a>' +
      '</div>';
  }

  function loadCharacterParses() {
    var el = document.getElementById('aboutParses');
    if (!el) return;

    // Try localStorage cache first
    try {
      var cached = JSON.parse(localStorage.getItem(CHAR_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.cachedAt < CHAR_CACHE_TTL) {
        el.innerHTML = renderParseTable(cached.rankings || []);
        return;
      }
    } catch (e) { /* ignore */ }

    // Fetch from Netlify function
    fetch('/.netlify/functions/getCharacter')
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (!data.rankings) throw new Error('No rankings in response');
        try {
          localStorage.setItem(CHAR_CACHE_KEY, JSON.stringify(data));
        } catch (e) { /* quota exceeded — skip caching */ }
        el.innerHTML = renderParseTable(data.rankings);
      })
      .catch(function() {
        showParseError(el);
      });
  }

  /* ── Init ──────────────────────────────────────────── */

  function init() {
    render();
    initLazyStreams();
    initCharacterModel();
    loadCharacterParses();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
