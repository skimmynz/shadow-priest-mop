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

// Talent data (matching script.js)
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

function getBossIconId(encounterId) {
  if (encounterId >= 51559 && encounterId <= 51580) {
    return encounterId - 50000;
  }
  return encounterId;
}

function bossIconUrl(encounterId) {
  const iconId = getBossIconId(encounterId);
  return `https://assets.rpglogs.com/img/warcraft/bosses/${iconId}-icon.jpg?v=2`;
}

function talentIconUrl(name) {
  const key = talentIcons[name] || 'inv_misc_questionmark';
  return `https://assets.rpglogs.com/img/warcraft/abilities/${key}.jpg`;
}

function getTalentDisplayName(apiName) {
  return talentNameMap[apiName] || apiName;
}

function renderBossIcons() {
  const container = document.getElementById('boss-selection');
  if (!container) return;
  
  const tierData = TIERS[currentTier];
  
  let html = '';
  for (const raid in tierData) {
    for (const [name, id] of Object.entries(tierData[raid])) {
      html += `
        <button class="boss-icon-btn" data-boss-id="${id}" data-boss-name="${name}">
          <img src="${bossIconUrl(id)}" alt="${name}" loading="lazy" 
               onerror="this.src='https://assets.rpglogs.com/img/warcraft/abilities/inv_misc_questionmark.jpg'">
          <div class="boss-name-tooltip">${name}</div>
        </button>
      `;
    }
  }
  
  container.innerHTML = html;
  
  // Add click handlers
  container.querySelectorAll('.boss-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bossId = parseInt(btn.dataset.bossId);
      const bossName = btn.dataset.bossName;
      selectBoss(bossId, bossName, btn);
    });
  });
}

async function selectBoss(bossId, bossName, btnElement) {
  console.log('Selecting boss:', bossName, 'ID:', bossId);
  
  // Update active state
  document.querySelectorAll('.boss-icon-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  
  // Hide boss grid and tier toggle
  const bossGrid = document.getElementById('boss-selection');
  const tierToggle = document.querySelector('.tier-toggle');
  if (bossGrid) bossGrid.classList.add('hidden');
  if (tierToggle) tierToggle.classList.add('hidden');
  
  const resultsDiv = document.getElementById('talent-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<div class="loading-state"><div style="margin: 0 auto 0.5rem; border: 3px solid var(--border-color); border-top: 3px solid var(--accent-color); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div><p>Loading...</p></div>';
  
  try {
    const CACHE_KEY = `spriest_rankings_${bossId}`;
    const cached = localStorage.getItem(CACHE_KEY);
    let data;
    
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        const cachedAt = parsedCache.cachedAt || parsedCache.data?.cachedAt;
        const isRecent = cachedAt && (Date.now() - Date.parse(cachedAt)) < 3600000;
        
        console.log('Cache found for', bossName, '- Recent:', isRecent);
        
        if (isRecent && parsedCache.data) {
          data = parsedCache.data;
          console.log('Using cached data, rankings count:', data.rankings?.length);
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }
    
    if (!data) {
      console.log('Fetching from API for', bossName);
      const response = await fetch(`/.netlify/functions/getLogs?encounterId=${bossId}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Data not available`);
      }
      
      data = await response.json();
      console.log('API data received, rankings count:', data.rankings?.length);
      
      // Validate we have rankings
      if (!data || !data.rankings || data.rankings.length === 0) {
        console.warn('No rankings in response');
        resultsDiv.innerHTML = '<div class="empty-state">No ranking data available for this boss yet.</div>';
        return;
      }
      
      // Try to cache, but don't fail if quota exceeded
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data,
          cachedAt: new Date().toISOString()
        }));
      } catch (storageError) {
        console.warn('Failed to cache data (quota exceeded):', storageError);
        // Clear some old cache entries to make room
        try {
          const keys = Object.keys(localStorage);
          const cacheKeys = keys.filter(k => k.startsWith('spriest_rankings_'));
          
          // Sort by age and remove oldest entries
          const entries = cacheKeys.map(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              return { key, time: Date.parse(data.cachedAt) || 0 };
            } catch {
              return { key, time: 0 };
            }
          }).sort((a, b) => a.time - b.time);
          
          // Remove oldest 5 entries
          for (let i = 0; i < Math.min(5, entries.length); i++) {
            localStorage.removeItem(entries[i].key);
            console.log('Removed old cache:', entries[i].key);
          }
          
          // Try to save again
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            cachedAt: new Date().toISOString()
          }));
        } catch (cleanupError) {
          console.warn('Cache cleanup also failed, continuing without cache');
        }
      }
    }
    
    console.log('Rendering talents for', bossName);
    renderTalents(data, bossName);
  } catch (error) {
    console.error('Error loading talents for', bossName, ':', error);
    
    // More user-friendly error messages
    if (error.message.includes('404')) {
      resultsDiv.innerHTML = '<div class="empty-state">No ranking data available for this boss yet.</div>';
    } else if (error.message.includes('Data not available')) {
      resultsDiv.innerHTML = '<div class="empty-state">Ranking data not yet available for this boss.</div>';
    } else {
      resultsDiv.innerHTML = '<div class="empty-state">Failed to load talent data. Please try again later.</div>';
    }
  }
}

function renderTalents(data, bossName) {
  const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
  const sampleSize = rankings.length;
  
  // Analyze talents (same logic as script.js)
  const tierCounts = {};
  const totalPerTier = {};
  
  Object.keys(talentTiers).forEach(tier => {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    talentTiers[tier].forEach(talent => {
      tierCounts[tier][talent] = 0;
    });
  });
  
  rankings.forEach(entry => {
    const seenTiers = new Set();
    const talents = Array.isArray(entry?.talents) ? entry.talents : [];
    
    talents.forEach(t => {
      const displayName = getTalentDisplayName(t.name);
      const tier = Object.keys(talentTiers).find(tier => 
        talentTiers[tier].includes(displayName)
      );
      
      if (tier && !seenTiers.has(tier)) {
        tierCounts[tier][displayName]++;
        totalPerTier[tier]++;
        seenTiers.add(tier);
      }
    });
  });
  
  // Render with header
  let html = '<div class="talent-display">';
  
  // Add header
  html += `
    <div class="talent-display-header">
      <div class="talent-display-boss">${bossName || 'Unknown Boss'}</div>
      <div class="talent-display-sample">Based on Top ${sampleSize} Global Log${sampleSize !== 1 ? 's' : ''}</div>
      <button class="back-button" onclick="goBackToBossSelection()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Boss Selection
      </button>
    </div>
  `;
  
  Object.keys(talentTiers).sort((a, b) => Number(a) - Number(b)).forEach(tier => {
    const total = totalPerTier[tier] || 0;
    
    html += '<div class="talent-row-container">';
    html += `<div class="talent-tier-label">${tier}</div>`;
    html += '<div class="talent-row">';
    
    talentTiers[tier].forEach(talent => {
      const count = tierCounts[tier][talent] || 0;
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      const iconUrl = talentIconUrl(talent);
      const spellId = talentSpellIds[talent];
      const wowheadUrl = `https://www.wowhead.com/mop-classic/spell=${spellId}`;
      
      const maxPct = Math.max(...talentTiers[tier].map(t => 
        total > 0 ? ((tierCounts[tier][t] || 0) / total) * 100 : 0
      ));
      const isTop = parseFloat(percent) >= maxPct - 0.05 && maxPct > 0;
      
      const color = parseFloat(percent) >= 75 ? '#10b981' : 
                   parseFloat(percent) <= 10 ? '#ef4444' : '#f59e0b';
      
      html += `
        <a href="${wowheadUrl}" target="_blank" rel="noopener" 
           class="talent-icon wowhead ${isTop ? 'is-top' : ''}">
          <img src="${iconUrl}" alt="${talent}" loading="lazy">
          <div class="talent-percent" style="color: ${color}">${percent}%</div>
        </a>
      `;
    });
    
    html += '</div>'; // close talent-row
    html += '</div>'; // close talent-row-container
  });
  
  html += '</div>';
  
  const resultsDiv = document.getElementById('talent-results');
  if (resultsDiv) {
    resultsDiv.innerHTML = html;
  }
  
  // Refresh Wowhead tooltips
  if (window.$WowheadPower) {
    setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
  }
}

// Back button function
function goBackToBossSelection() {
  const bossGrid = document.getElementById('boss-selection');
  const tierToggle = document.querySelector('.tier-toggle');
  const resultsDiv = document.getElementById('talent-results');
  
  if (bossGrid) bossGrid.classList.remove('hidden');
  if (tierToggle) tierToggle.classList.remove('hidden');
  if (resultsDiv) {
    resultsDiv.innerHTML = '';
  }
  
  // Clear active boss
  document.querySelectorAll('.boss-icon-btn').forEach(b => b.classList.remove('active'));
}

// Tier toggle
document.addEventListener('DOMContentLoaded', () => {
  // Initial render
  renderBossIcons();
  
  // Setup tier toggle buttons
  document.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentTier = btn.dataset.tier;
      
      // Show boss selection, clear talents
      const bossGrid = document.getElementById('boss-selection');
      const tierToggle = document.querySelector('.tier-toggle');
      const resultsDiv = document.getElementById('talent-results');
      
      if (bossGrid) bossGrid.classList.remove('hidden');
      if (tierToggle) tierToggle.classList.remove('hidden');
      if (resultsDiv) {
        resultsDiv.innerHTML = '';
      }
      
      // Re-render boss icons
      renderBossIcons();
    });
  });
});
