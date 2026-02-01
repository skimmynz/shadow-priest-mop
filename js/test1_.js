/* --------------------------------------------------------------------------------
   Shared talent & boss data (mirrors script.js)
   -------------------------------------------------------------------------------- */
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

// Precomputed helpers
const TIER_ORDER = Object.keys(talentTiers).map(Number).sort((a, b) => a - b);
const TIER_BY_TALENT = (() => {
  const m = new Map();
  for (const tierStr in talentTiers) {
    const tier = Number(tierStr);
    for (const t of talentTiers[tier]) m.set(t, tier);
  }
  return m;
})();

function getTalentDisplayName(apiName) {
  return talentNameMap[apiName] || apiName;
}

function talentIconUrl(name) {
  const key = (name && talentIcons[name]) ? talentIcons[name] : 'inv_misc_questionmark';
  return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
}

/* --------------------------------------------------------------------------------
   Boss data
   -------------------------------------------------------------------------------- */
function getBossIconId(encId) {
  return (encId >= 51559 && encId <= 51580) ? encId - 50000 : encId;
}

function bossIconUrl(encId) {
  return 'https://assets.rpglogs.com/img/warcraft/bosses/' + getBossIconId(encId) + '-icon.jpg?v=2';
}

const PARSING_RULES = {
  51577: ["No rules."],
  51575: ["Horridon is removed from Damage All Star Points."],
  51570: ["Damage done to Living Sand is removed."],
  51565: ["Damage done to Humming Crystal is removed.","Heroic Only: Damage done to Vampiric Cave Bat is removed.","Only damage done to Whirl Turtles that cast Shell Concussion (which they do when kicked) counts."],
  51578: ["Damage done to heads that don't die is removed.","25m Heroic: Damage done to Nether Wyrm is removed."],
  51573: ["Ji-Kun is removed from Damage All Star Points."],
  51572: ["Damage done to Wandering Eye is removed."],
  51574: ["Primordius is removed from Damage and Healing All Star Points."],
  51576: ["Heroic: Damage to Large Anima Golem and Massive Anima Golem is removed.","Only count damage done to Anima Golems that die."],
  51559: ["Damage done to Ice Tomb is removed."],
  51560: ["Damage done to Lurker in the Night is removed."],
  51579: ["Damage done to Unharnessed Power, Lesser Diffused Lightning, Greater Diffused Lightning, and Diffused Lightning is removed."],
  51580: ["Damage done to Sanguine Horror, Corrupted Anima, Corrupted Vita, and Essence of Vita is removed."]
};

const bosses = [
  {
    id: 'jinrokh', name: "Jin'rokh the Breaker", enc: 51577,
    tips: [
      '<b>Pre-pot:</b> <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=105702/potion-of-the-jade-serpent">Pot</a> at 15s pull timer.',
      '<b>Burst:</b> Use CDs, Lust, and 2nd Pot while standing in <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138002/fluidity?dd=6">Fluidity</a>.',
      '<b>Snapshot:</b> After clearing <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138733/ionization?dd=6">Ionization</a>, briefly re-enter <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138002/fluidity?dd=6">Fluidity</a> to recast DoTs.',
      '<b>Utility:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> during <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=137261/lightning-storm?dd=6">Lightning Storm</a>; use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=47585/dispersion">Dispersion</a> if health is low.',
      'Pray for an <a class="wowhead" href="https://www.wowhead.com/mop-classic/item=96558/unerring-vision-of-lei-shen">UVLS</a> proc.'
    ]
  },
  {
    id: 'horridon', name: "Horridon", enc: 51575,
    tips: [
      '<b>Add Priority:</b> <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> small adds; <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch">VT</a> marked elite adds.',
      '<b>T15 Bonus:</b> DoT the Direhorn Spirit for the <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138156/item-priest-t15-shadow-2p-bonus">T15 2pc knockback</a>.',
      '<b>Resource Gen:</b> Multi-dot for high uptime on <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
      '<b>Cleave:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a> when adds are stacked.',
      '<b>Boss Burn:</b> Spend <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2944/devouring-plague">Devouring Plague</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Insanity</a> on Horridon.',
      '<b>Defensive:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">VE</a> during dangerous <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=136817/bestial-cry">Bestial Cry</a> casts.'
    ]
  },
  {
    id: 'council', name: "Council of Elders", enc: 51570,
    tips: [
      '<b>Positioning:</b> Stack in melee to use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> on cooldown.',
      '<b>Cleave:</b> Maintain DoTs on all bosses and use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a>.'
    ]
  },
  {
    id: 'tortos', name: "Tortos", enc: 51565,
    tips: [
      '<b>Sniping:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a> on adds to proc <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a> and Orbs.',
      '<b>Uptime:</b> Keep <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> active on a Humming Crystal.',
      '<b>Movement:</b> Stay spread to avoid Whirl Turtles.'
    ]
  },
  {
    id: 'megaera', name: "Megaera", enc: 51578,
    tips: [
      '<b>Efficiency:</b> Ignore the Venomous Head.',
      '<b>Orbs:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a> on Nether Wyrms to generate <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
      '<b>Healing:</b> Switch to <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> if raid healing is required.'
    ]
  },
  {
    id: 'jikun', name: "Ji-Kun", enc: 51573,
    tips: [
      '<b>Buffs:</b> Use feather charges to intercept Feed Young for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=112879/primal-nutriment">Primal Nutriment</a>.',
      '<b>Adds:</b> DoT the Nest Guardian; use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a> on Hatchlings.',
      '<b>Recovery:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">VE</a> during Quills.'
    ]
  },
  {
    id: 'durumu', name: "Durumu the Forgotten", enc: 51572,
    tips: [
      '<b>Fog Phase:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a> on fog adds for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a>.',
      '<b>Walls:</b> Time your <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=120644/halo">Halo</a> and DoT the Ice Walls.',
      '<b>Burst:</b> Sync your 2nd Pot with your 2nd <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=26297/berserking">Berserking</a>.'
    ]
  },
  {
    id: 'primordius', name: "Primordius", enc: 51574,
    tips: [
      '<b>Multi-Dot:</b> Maintain DoTs on all Living Fluids (unless Warlocks are handling them).',
      '<b>Talents:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=127632/cascade">Cascade</a> on cooldown.',
      '<b>Positioning:</b> Watch camera angle to dodge puddles and debuffs.'
    ]
  },
  {
    id: 'darkanimus', name: "Dark Animus", enc: 51576,
    tips: [
      '<b>Orb Gen:</b> DoT all Anima Golems for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
      '<b>Efficiency:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=127632/cascade">Cascade</a> on cooldown.',
      '<b>ST Burn:</b> Direct <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2944/devouring-plague">DP</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Insanity</a> into the boss.'
    ]
  },
  {
    id: 'ironqon', name: "Iron Qon", enc: 51559,
    tips: [
      '<b>Phasing:</b> DoT Iron Qon during mount transitions (Ro\'shak → Quet\'zal → Dam\'ren).',
      '<b>Final Phase:</b> Save CDs and 2nd Pot for when all 4 targets are active.',
      '<b>Utility:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">VE</a> during Fist Smash.'
    ]
  },
  {
    id: 'consorts', name: "Twin Empyreans", enc: 51560,
    tips: [
      '<b>Pre-DoT:</b> Cast <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch">VT</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">SW:P</a> on Suen before she vanishes.',
      '<b>Burn:</b> Recast DoTs on Suen during Tears of the Sun.',
      '<b>Support:</b> Off-heal during Nuclear Inferno (Boss is immune); use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">VE</a> during high Blazing Radiance.'
    ]
  },
  {
    id: 'leishen', name: "Lei Shen", enc: 51579,
    tips: [
      '<b>Adds:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=120644/halo">Halo</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a> on Ball Lightnings.',
      '<b>Sniping:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a> on adds for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
      '<b>Execution:</b> Sync your 3rd <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=26297/berserking">Berserking</a> and 2nd Pot with Bloodlust.'
    ]
  },
  {
    id: 'raden', name: "Ra-den", enc: 51580,
    tips: [
      '<b>Add Priority:</b> DoT the Crackling Stalker, then burst with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a>.',
      '<b>Essences:</b> Snip the first Essence with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">SW:D</a>; burn others with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Insanity</a>.',
      '<b>Sub-40%:</b> Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> on CD to assist healers.'
    ]
  }
];

/* --------------------------------------------------------------------------------
   Cache (shared key format with script.js)
   -------------------------------------------------------------------------------- */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = (encId) => 'spriest_rankings_' + encId;
const API_URL = (encId) => '/.netlify/functions/getLogs?encounterId=' + encId;

function readCache(encId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(encId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function isFresh(cachedAt) {
  try {
    const ts = typeof cachedAt === 'number' ? cachedAt : Date.parse(cachedAt);
    return (Date.now() - ts) < CACHE_TTL_MS;
  } catch { return false; }
}

/* --------------------------------------------------------------------------------
   Talent analysis — picks the top talent per tier from rankings data
   -------------------------------------------------------------------------------- */
function analyzeTalents(rankings) {
  // tierCounts[tier][talentName] = count
  const tierCounts = {};
  const totalPerTier = {};

  for (const tier of TIER_ORDER) {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    for (const talent of talentTiers[tier]) {
      tierCounts[tier][talent] = 0;
    }
  }

  for (const entry of rankings) {
    const seenTiers = new Set();
    const talents = Array.isArray(entry && entry.talents) ? entry.talents : [];
    for (const t of talents) {
      const name = getTalentDisplayName(t.name);
      const tier = TIER_BY_TALENT.get(name);
      if (tier && !seenTiers.has(tier)) {
        tierCounts[tier][name]++;
        totalPerTier[tier]++;
        seenTiers.add(tier);
      }
    }
  }

  // Resolve to the single best pick + its percentage per tier
  const picks = []; // [{ tier, name, percent }]
  for (const tier of TIER_ORDER) {
    const total = totalPerTier[tier] || 0;
    let bestName = null, bestCount = 0;
    for (const talent of talentTiers[tier]) {
      const count = tierCounts[tier][talent] || 0;
      if (count > bestCount) { bestCount = count; bestName = talent; }
    }
    picks.push({
      tier,
      name: bestName,
      percent: total > 0 ? ((bestCount / total) * 100).toFixed(1) : '0.0'
    });
  }

  return picks;
}

/* --------------------------------------------------------------------------------
   Fetcher — reads cache first, falls back to API, stores on success
   -------------------------------------------------------------------------------- */
// In-memory store so repeated tab switches don't re-parse localStorage
const talentCache = new Map(); // encId -> picks[]

async function fetchTalentsForBoss(encId) {
  // Already analysed this session?
  if (talentCache.has(encId)) return talentCache.get(encId);

  // Try localStorage (shared with rankings page)
  const cached = readCache(encId);
  if (cached) {
    const cachedAt = cached.cachedAt || (cached.data && cached.data.cachedAt);
    if (isFresh(cachedAt) && cached.data && Array.isArray(cached.data.rankings)) {
      const picks = analyzeTalents(cached.data.rankings);
      talentCache.set(encId, picks);
      return picks;
    }
  }

  // Fetch from API
  try {
    const res = await fetch(API_URL(encId));
    if (!res.ok) return null;
    const data = await res.json();

    // Write to localStorage for sharing with rankings page
    try {
      localStorage.setItem(CACHE_KEY(encId), JSON.stringify({
        data: data,
        cachedAt: data.cachedAt || new Date().toISOString()
      }));
    } catch {}

    if (data && Array.isArray(data.rankings)) {
      const picks = analyzeTalents(data.rankings);
      talentCache.set(encId, picks);
      return picks;
    }
  } catch (e) {
    console.warn('Failed to fetch talents for encounter', encId, e);
  }

  return null;
}

/* --------------------------------------------------------------------------------
   Prefetch all 13 bosses in parallel on page load
   -------------------------------------------------------------------------------- */
async function prefetchAll() {
  await Promise.allSettled(bosses.map(b => fetchTalentsForBoss(b.enc)));
  // Refresh the currently visible boss in case it loaded after initial render
  renderActiveTalents();
  if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
}

/* --------------------------------------------------------------------------------
   Talent column rendering
   -------------------------------------------------------------------------------- */
function buildTalentColumn(picks) {
  if (!picks) {
    return '<div class="talent-column"><div class="talent-column-loading">Loading…</div></div>';
  }

  let html = '<div class="talent-column"><div class="talent-column-label">Popular Talents</div>';
  for (const pick of picks) {
    const iconUrl = talentIconUrl(pick.name);
    const spellId = pick.name ? talentSpellIds[pick.name] : null;
    const href = spellId ? 'https://www.wowhead.com/mop-classic/spell=' + spellId : null;

    html += '<div class="talent-tier-row">';
    html += '<div class="talent-tier-label">' + pick.tier + '</div>';

    const tag = href ? 'a' : 'div';
    const attrs = href
      ? ' href="' + href + '" target="_blank" rel="noopener" class="talent-pick wowhead" data-wowhead="spell=' + spellId + '&domain=mop-classic"'
      : ' class="talent-pick"';

    html += '<' + tag + attrs + '>';
    html += '<img src="' + iconUrl + '" alt="' + (pick.name || 'Unknown') + '" loading="lazy">';
    html += '<div class="talent-pick-pct">' + pick.percent + '%</div>';
    html += '</' + tag + '>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/* --------------------------------------------------------------------------------
   Parsing rules block
   -------------------------------------------------------------------------------- */
function parsingBlock(encId) {
  const rules = PARSING_RULES[encId];
  if (!rules) return '';
  return '<div class="parsing-rules">' +
    '<div class="parsing-rules-header">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
      '<span class="parsing-rules-title">Parsing Rules</span>' +
    '</div>' +
    '<ul>' + rules.map(r => '<li>' + r + '</li>').join('') + '</ul>' +
  '</div>';
}

/* --------------------------------------------------------------------------------
   Render & tab switching
   -------------------------------------------------------------------------------- */
function getActiveBossId() {
  const active = document.querySelector('.boss-tab.active');
  return active ? Number(active.dataset.enc) : null;
}

function renderActiveTalents() {
  const encId = getActiveBossId();
  if (encId == null) return;

  const picks = talentCache.get(encId) || null;
  const talentEl = document.getElementById('talentColumn-' + encId);
  if (talentEl) talentEl.innerHTML = buildTalentColumn(picks);
}

function render() {
  const tabsEl = document.getElementById('bossTabs');
  const contentEl = document.getElementById('tipsContent');

  // Tabs
  tabsEl.innerHTML = bosses.map((b, i) =>
    '<button class="boss-tab' + (i === 0 ? ' active' : '') + '" data-boss="' + b.id + '" data-enc="' + b.enc + '">' +
      '<img src="' + bossIconUrl(b.enc) + '" alt="' + b.name + '">' +
      '<span class="boss-tab-tooltip">' + b.name + '</span>' +
    '</button>'
  ).join('');

  // Content panels — each has a talent column div + tips column
  contentEl.innerHTML = bosses.map((b, i) =>
    '<div class="boss-section' + (i === 0 ? ' active' : '') + '" data-boss="' + b.id + '">' +
      '<div class="tips-layout">' +
        '<div id="talentColumn-' + b.enc + '" class="talent-column">' +
          '<div class="talent-column-loading">Loading…</div>' +
        '</div>' +
        '<div class="tips-column">' +
          '<ul class="tips-list">' + b.tips.map(t => '<li>' + t + '</li>').join('') + '</ul>' +
          parsingBlock(b.enc) +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');

  // Tab click handler
  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.boss-tab');
    if (!tab) return;
    const id = tab.dataset.boss;

    tabsEl.querySelectorAll('.boss-tab').forEach(t => t.classList.toggle('active', t.dataset.boss === id));
    contentEl.querySelectorAll('.boss-section').forEach(s => s.classList.toggle('active', s.dataset.boss === id));

    // Refresh talents for the newly active boss (may have arrived from prefetch)
    renderActiveTalents();
  });

  // Initial talent render for the first boss
  renderActiveTalents();

  if (window.$WowheadPower) window.$WowheadPower.refreshLinks();
}

/* --------------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  render();
  prefetchAll();
});
