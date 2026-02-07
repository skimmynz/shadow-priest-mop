/* ═══════════════════════════════════════════════════════
   Home Page — js/home.js
   Throne of Thunder boss tips + lazy stream loading
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

  /* ── Throne of Thunder Data ────────────────────────── */
  var bosses = [
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
    },
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
    },
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
    },
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
  ];

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

    /* Tabs */
    tabsEl.innerHTML = bosses.map(function (b, i) {
      return (
        '<button class="boss-tab' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '" type="button">' +
          '<img src="' + iconUrl(b.enc) + '" alt="' + b.name + '" loading="lazy">' +
          '<span class="boss-tab-tip">' + b.name + '</span>' +
        '</button>'
      );
    }).join('');

    /* Panels */
    contentEl.innerHTML = bosses.map(function (b, i) {
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

    /* Tab switching */
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
      }, { rootMargin: '200px' });

      targets.forEach(function (el) { observer.observe(el); });
    } else {
      /* Fallback: load all immediately */
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

    /* Remove placeholder */
    var placeholder = container.querySelector('.stream-placeholder');
    if (placeholder) placeholder.remove();

    container.appendChild(iframe);
    container.removeAttribute('data-src');
  }

  /* ── Init ──────────────────────────────────────────── */

  function init() {
    render();
    initLazyStreams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
