const encounters = {
  "The Stone Guard": 1395,
  "Feng the Accursed": 1390,
  "Gara'jal the Spiritbinder": 1434,
  "The Spirit Kings": 1436,
  "Elegon": 1500,
  "Will of the Emperor": 1407
};

const bossButtonsDiv = document.getElementById('boss-buttons');
const rankingsDiv = document.getElementById('rankings');

function createBossButtons() {
  Object.entries(encounters).forEach(([name, id]) => {
    const button = document.createElement('button');
    button.innerHTML = `
      <img src="https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2" alt="${name}">
      ${name}
    `;
    button.onclick = () => fetchAndDisplayRankings(name, id);
    bossButtonsDiv.appendChild(button);
  });
}

const talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"]
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
  "Spectral Guise": 119898,
  "Angelic Bulwark": 108945,
  "Twist of Fate": 109142,
  "Power Infusion": 10060,
  "Divine Insight": 109175,
  "Cascade": 121135,
  "Divine Star": 110744,
  "Halo": 120517
};

function getTalentTierMap() {
  const map = {};
  Object.entries(talentTiers).forEach(([tier, talents]) => {
    talents.forEach(talent => {
      map[talent] = tier;
    });
  });
  return map;
}

function getSpellId(talentName) {
  return talentSpellIds[talentName] || 0;
}

async function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const url = `/.netlify/functions/getLogs?encounterId=${id}`;
  const response = await fetch(url);
  const data = await response.json();

  const talentToTier = getTalentTierMap();
  const tierCounts = {};
  const totalPerTier = {};

  Object.keys(talentTiers).forEach(tier => {
    tierCounts[tier] = {};
    totalPerTier[tier] = 0;
    talentTiers[tier].forEach(talent => {
      tierCounts[tier][talent] = 0;
    });
  });

  data.rankings.forEach(entry => {
    entry.talents.forEach(talent => {
      const name = talent.name;
      const tier = talentToTier[name];
      if (tier) {
        tierCounts[tier][name]++;
        totalPerTier[tier]++;
      }
    });
  });

  let talentSummary = `<div class='talent-summary'>`;

  Object.keys(talentTiers).sort((a, b) => a - b).forEach(tier => {
    talentSummary += `<div class="talent-tier"><strong>Tier ${tier}</strong></div><div class="talent-row">`;

    talentTiers[tier].forEach(talent => {
      const count = tierCounts[tier][talent];
      const total = totalPerTier[tier];
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

      const color = percent >= 75 ? 'limegreen' : percent <= 10 ? 'red' : 'orange';
      const iconName = talent.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
      const iconUrl = `https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_${iconName}.jpg`;
      const wowheadUrl = `https://www.wowhead.com/mop-classic/spell=${getSpellId(talent)}`;

      talentSummary += `
        <a target="_blank" href="${wowheadUrl}" class="talent-link">
          <img src="${iconUrl}" class="talent-icon-img" alt="${talent}" title="${talent}">
          <div class="talent-percent" style="color: ${color};">${percent}%</div>
        </a>
      `;
    });

    talentSummary += `</div>`;
  });

  talentSummary += `</div><br>`;

  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';
    if (rank >= 2 && rank <= 25) return '#e268a8';
    return '#ff8000';
  };

  const entries = data.rankings.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    return `<div class="rank-entry" style="color: ${color};">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');

  rankingsDiv.innerHTML = `<h2>${name}</h2>${talentSummary}${entries}`;
}

createBossButtons();
