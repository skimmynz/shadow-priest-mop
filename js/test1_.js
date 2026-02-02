// Boss Tips and Talent Display Script
(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION & DATA
  // ============================================================================
  
  // Icon URL helper for ToT encounters
  function iconUrl(encId) {
    var id = (encId >= 51559 && encId <= 51580) ? encId - 50000 : encId;
    return 'https://assets.rpglogs.com/img/warcraft/bosses/' + id + '-icon.jpg?v=2';
  }

  // Talent data
  var talentTiers = {
    15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
    30: ["Body and Soul", "Angelic Feather", "Phantasm"],
    45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
    60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
    75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
    90: ["Cascade", "Divine Star", "Halo"]
  };

  var talentIcons = {
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

  var talentSpellIds = {
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

  var talentNameMap = {
    "Surge of Light": "From Darkness, Comes Light",
    "Mind Control": "Dominate Mind"
  };

  function talentIconUrl(name) {
    var key = talentIcons[name] || 'inv_misc_questionmark';
    return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
  }

  function getTalentDisplayName(apiName) {
    return talentNameMap[apiName] || apiName;
  }

  // Parsing rules data
  var PARSING_RULES = {
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

  // Boss tips data
  var bosses = [
    {
      id: 'jinrokh', name: "Jin'rokh the Breaker", enc: 51577,
      tips: [
        'Prepot <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=105702/potion-of-the-jade-serpent">Potion of the Jade Serpent</a> at 15s and hold your cooldowns.',
        'With <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2825/bloodlust">Bloodlust</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138002/fluidity?dd=6">Fluidity</a>, use your CDs and 2nd <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=105702/potion-of-the-jade-serpent">Potion of the Jade Serpent</a>. RNG <a class="wowhead" href="https://www.wowhead.com/mop-classic/item=96558/unerring-vision-of-lei-shen">Unerring Vision of Lei Shen</a> procs.',
        'After you clear <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138733/ionization?dd=6">Ionization</a>, get back into <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138002/fluidity?dd=6">Fluidity</a> quickly and reapply your DoTs.',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> during <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=137261/lightning-storm?dd=6">Lightning Storm</a>.'
      ]
    },
    {
      id: 'horridon', name: "Horridon", enc: 51575,
      tips: [
        'Apply <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">Shadow Word: Pain</a> to small adds. Keep <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">Shadow Word: Pain</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch">Vampiric Touch</a> on marked elite adds.',
        'Double DoT the Direhorn Spirit to benefit from the <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=138156/item-priest-t15-shadow-2p-bonus">Tier 15 Shadow Priest 2P bonus</a>.',
        'Spend <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2944/devouring-plague">Devouring Plague</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Mind Flay: Insanity</a> on Horridon.',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> during high <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=136817/bestial-cry">Bestial Cry</a> stacks.'
      ]
    },
    {
      id: 'council', name: "Council of Elders", enc: 51570,
      tips: [
        'Stack in melee so you can hit multiple targets with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> on cooldown.',
        'Keep DoTs rolling on all bosses and fill with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a>.',
        'Recast DoTs when <a class="wowhead" href="https://www.wowhead.com/mop-classic/item=96558/unerring-vision-of-lei-shen">Unerring Vision of Lei Shen</a> procs.'
      ]
    },
    {
      id: 'tortos', name: "Tortos", enc: 51565,
      tips: [
        'Cast <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">Shadow Word: Pain</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a> on adds to trigger <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a> and generate <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
        'Maintain <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">Shadow Word: Pain</a> on a Humming Crystal for the shield.',
        'Stay spread to reduce the chance of being knocked up by the Whirl Turtles.'
      ]
    },
    {
      id: 'megaera', name: "Megaera", enc: 51578,
      tips: [
        'Ignore the Venomous Head.',
        'Cast <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a> on Nether Wyrms to generate <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
        'Swap to <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> if your raid needs extra healing throughput.'
      ]
    },
    {
      id: 'jikun', name: "Ji-Kun", enc: 51573,
      tips: [
        'Use feather charges to intercept Feed Young and gain <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=112879/primal-nutriment">Primal Nutriment</a>.',
        'Cast DoTs on the Nest Guardian. Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a> on Hatchlings.',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> during Quills if raid is low.'
      ]
    },
    {
      id: 'durumu', name: "Durumu the Forgotten", enc: 51572,
      tips: [
        'Snipe Crimson Fog adds with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a> for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a> uptime and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
        'Cast <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=120644/halo">Halo</a> and DoTs on the Ice Walls.'
      ]
    },
    {
      id: 'primordius', name: "Primordius", enc: 51574,
      tips: [
        'Keep DoTs on all Living Fluids (unless your Warlocks know how to play Affliction).',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=127632/cascade">Cascade</a> on cooldown.',
        'Adjust your camera angle to help dodge puddles and avoid unwanted debuffs.'
      ]
    },
    {
      id: 'darkanimus', name: "Dark Animus", enc: 51576,
      tips: [
        'DoT as many Anima Golems as possible to maintain <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=109142/twist-of-fate">Twist of Fate</a>.',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=127632/cascade">Cascade</a> on cooldown for efficient multi-target damage.',
        'Focus your <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2944/devouring-plague">Devouring Plague</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Mind Flay: Insanity</a> into the boss.'
      ]
    },
    {
      id: 'ironqon', name: "Iron Qon", enc: 51559,
      tips: [
        'Recast DoTs on Iron Qon during mount transitions (Ro\'shak → Quet\'zal → Dam\'ren).',
        'Hold your 2nd cooldowns and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=105702/potion-of-the-jade-serpent">Potion of the Jade Serpent</a> for the final phase, when all four targets are active.',
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> during Fist Smash if raid is low.'
      ]
    },
    {
      id: 'consorts', name: "Twin Empyreans", enc: 51560,
      tips: [
        'Precast <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch">Vampiric Touch</a> on Suen then <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain">Shadow Word: Pain</a> before she vanishes.',
        'Refresh DoTs on Suen during Tears of the Sun.',
        'During Nuclear Inferno (boss immune), focus on off-healing. Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=15290/vampiric-embrace">Vampiric Embrace</a> when Blazing Radiance stacks get high.'
      ]
    },
    {
      id: 'leishen', name: "Lei Shen", enc: 51579,
      tips: [
        'Use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=120644/halo">Halo</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=48045/mind-sear">Mind Sear</a> to handle Ball Lightnings.',
        'Snipe low adds with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a> to generate <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=95740/shadow-orbs">Shadow Orbs</a>.',
        'Save your CDs and 2nd <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=105702/potion-of-the-jade-serpent">Potion of the Jade Serpent</a> for <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2825/bloodlust">Bloodlust</a>.'
      ]
    },
    {
      id: 'raden', name: "Ra-den", enc: 51580,
      tips: [
        'DoT the Crackling Stalker, then burst it with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a>.',
        'Snipe the first Essence of Anima with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=32379/shadow-word-death">Shadow Word: Death</a>. Burn the remaining ones with <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=2944/devouring-plague">Devouring Plague</a> and <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=129197/mind-flay-insanity">Mind Flay: Insanity</a>.',
        'Sub 40%, use <a class="wowhead" href="https://www.wowhead.com/mop-classic/spell=122128/divine-star">Divine Star</a> on cooldown to help with the HPS check.'
      ]
    }
  ];

  // ============================================================================
  // TALENT FETCHING & CACHING
  // ============================================================================
  
  var fetchController = null;
  var fetchCache = new Map();

  function selectBoss(bossId, bossName) {
    console.log('Fetching talents for:', bossName, 'ID:', bossId);
    
    if (fetchController) {
      fetchController.abort();
    }
    fetchController = new AbortController();
    
    var resultsDiv = document.getElementById('talent-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading talents...</p></div>';
    
    var CACHE_KEY = 'spriest_rankings_' + bossId;
    var data;
    
    // Check in-memory cache
    if (fetchCache.has(CACHE_KEY)) {
      var cached = fetchCache.get(CACHE_KEY);
      var isRecent = (Date.now() - cached.timestamp) < 3600000;
      
      if (isRecent) {
        console.log('Using in-memory cache for', bossName);
        renderTalents(cached.data, bossName);
        return;
      }
    }
    
    // Check localStorage cache
    var localCached = localStorage.getItem(CACHE_KEY);
    if (localCached) {
      try {
        var parsedCache = JSON.parse(localCached);
        var cachedAt = parsedCache.cachedAt || (parsedCache.data && parsedCache.data.cachedAt);
        var isRecent = cachedAt && (Date.now() - Date.parse(cachedAt)) < 3600000;
        
        if (isRecent && parsedCache.data) {
          console.log('Using localStorage cache for', bossName);
          data = parsedCache.data;
          
          fetchCache.set(CACHE_KEY, {
            data: data,
            timestamp: Date.now()
          });
          
          renderTalents(data, bossName);
          return;
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }
    
    // Fetch from API
    console.log('Fetching from API for', bossName);
    fetch('/.netlify/functions/getLogs?encounterId=' + bossId, {
      signal: fetchController.signal
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': Data not available');
      }
      return response.json();
    })
    .then(function(data) {
      console.log('API data received, rankings count:', data.rankings ? data.rankings.length : 0);
      
      if (!data || !data.rankings || data.rankings.length === 0) {
        console.warn('No rankings in response');
        resultsDiv.innerHTML = '<div class="empty-state">No ranking data available for this boss yet.</div>';
        return;
      }
      
      // Store in both caches
      var cacheData = {
        data: data,
        cachedAt: new Date().toISOString()
      };
      
      fetchCache.set(CACHE_KEY, {
        data: data,
        timestamp: Date.now()
      });
      
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (storageError) {
        console.warn('Failed to cache data:', storageError);
      }
      
      renderTalents(data, bossName);
    })
    .catch(function(error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Error loading talents:', error);
      
      if (error.message.includes('404') || error.message.includes('Data not available')) {
        resultsDiv.innerHTML = '<div class="empty-state">No ranking data available for this boss yet.</div>';
      } else {
        resultsDiv.innerHTML = '<div class="empty-state">Failed to load talent data. Please try again later.</div>';
      }
    });
  }

  // ============================================================================
  // TALENT RENDERING
  // ============================================================================
  
  function renderTalents(data, bossName) {
    var rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
    var sampleSize = rankings.length;
    
    var tierCounts = {};
    var totalPerTier = {};
    
    Object.keys(talentTiers).forEach(function(tier) {
      tierCounts[tier] = {};
      totalPerTier[tier] = 0;
      talentTiers[tier].forEach(function(talent) {
        tierCounts[tier][talent] = 0;
      });
    });
    
    rankings.forEach(function(entry) {
      var seenTiers = new Set();
      var talents = Array.isArray(entry && entry.talents) ? entry.talents : [];
      
      talents.forEach(function(t) {
        var displayName = getTalentDisplayName(t.name);
        var tier = Object.keys(talentTiers).find(function(tier) {
          return talentTiers[tier].includes(displayName);
        });
        
        if (tier && !seenTiers.has(tier)) {
          tierCounts[tier][displayName]++;
          totalPerTier[tier]++;
          seenTiers.add(tier);
        }
      });
    });
    
    var html = '<div class="talent-display">';
    
    Object.keys(talentTiers).sort(function(a, b) { return Number(a) - Number(b); }).forEach(function(tier) {
      var total = totalPerTier[tier] || 0;
      
      html += '<div class="talent-row-container">';
      html += '<div class="talent-row">';
      
      talentTiers[tier].forEach(function(talent) {
        var count = tierCounts[tier][talent] || 0;
        var percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        var iconSrc = talentIconUrl(talent);
        var spellId = talentSpellIds[talent];
        var wowheadUrl = 'https://www.wowhead.com/mop-classic/spell=' + spellId;
        
        var maxPct = Math.max.apply(null, talentTiers[tier].map(function(t) {
          return total > 0 ? ((tierCounts[tier][t] || 0) / total) * 100 : 0;
        }));
        var isTop = parseFloat(percent) >= maxPct - 0.05 && maxPct > 0;
        
        var color = parseFloat(percent) >= 75 ? '#10b981' : 
                   parseFloat(percent) <= 10 ? '#ef4444' : '#f59e0b';
        
        // Use rel="false" to prevent Wowhead from replacing the link content
        html += '<a href="' + wowheadUrl + '" target="_blank" rel="noopener" data-wowhead="spell=' + spellId + '&domain=mop-classic" class="talent-icon ' + (isTop ? 'is-top' : '') + '">';
        html += '<img src="' + iconSrc + '" alt="' + talent + '" loading="lazy">';
        html += '<div class="talent-percent" style="color: ' + color + '">' + percent + '%</div>';
        html += '</a>';
      });
      
      html += '</div>';
      html += '</div>';
    });
    
    html += '</div>';
    
    var resultsDiv = document.getElementById('talent-results');
    if (resultsDiv) {
      resultsDiv.innerHTML = html;
    }
    
    // Refresh Wowhead tooltips after rendering
    if (window.$WowheadPower) {
      setTimeout(function() { 
        window.$WowheadPower.refreshLinks();
      }, 100);
    }
  }

  // ============================================================================
  // UI RENDERING
  // ============================================================================
  
  function parsingBlock(encId) {
    var rules = PARSING_RULES[encId];
    if (!rules) return '';
    
    return '<div class="parsing-rules">' +
      '<div class="parsing-rules-header">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
        '<span class="parsing-rules-title">Parsing Rules</span>' +
      '</div>' +
      '<ul>' + rules.map(function(r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
    '</div>';
  }

  function render() {
    var tabsEl = document.getElementById('bossTabs');
    var contentEl = document.getElementById('tipsContent');
    
    if (!tabsEl || !contentEl) return;

    // Boss tab buttons
    tabsEl.innerHTML = bosses.map(function(b, i) {
      return '<button class="boss-tab' + (i === 0 ? ' active' : '') + '" data-boss="' + b.id + '" data-enc="' + b.enc + '">' +
        '<img src="' + iconUrl(b.enc) + '" alt="' + b.name + '">' +
        '<span class="boss-tab-tooltip">' + b.name + '</span>' +
      '</button>';
    }).join('');

    // Tips sections
    contentEl.innerHTML =
      '<div id="talent-results"></div>' +
      bosses.map(function(b, i) {
        return '<div class="boss-section' + (i === 0 ? ' active' : '') + '" data-boss="' + b.id + '">' +
          '<ul class="tips-list">' + b.tips.map(function(t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
          parsingBlock(b.enc) +
        '</div>';
      }).join('');

    // Tab click handler
    tabsEl.addEventListener('click', function(e) {
      var tab = e.target.closest('.boss-tab');
      if (!tab) return;
      
      var id = tab.dataset.boss;
      var enc = parseInt(tab.dataset.enc, 10);

      tabsEl.querySelectorAll('.boss-tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.boss === id);
      });
      
      contentEl.querySelectorAll('.boss-section').forEach(function(s) {
        s.classList.toggle('active', s.dataset.boss === id);
      });

      // Fetch talents for selected boss
      var bossName = tab.querySelector('img').alt;
      selectBoss(enc, bossName);
    });

    // Load talents for first boss on init
    selectBoss(bosses[0].enc, bosses[0].name);

    // Refresh Wowhead tooltips
    if (window.$WowheadPower) {
      window.$WowheadPower.refreshLinks();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Expose selectBoss globally for external access
  window.selectBoss = selectBoss;
})();
