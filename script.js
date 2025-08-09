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

function getTalentTierMap() {
  const map = {};
  Object.entries(talentTiers).forEach(([tier, talents]) => {
    talents.forEach(talent => {
      map[talent] = tier;
    });
  });
  return map;
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

  let talentSummary = "<div class='talent-summary'>";
  Object.keys(talentTiers).sort((a, b) => a - b).forEach(tier => {
    talentSummary += `<strong>Tier ${tier}:</strong><br>`;
    talentTiers[tier].forEach(talent => {
      const count = tierCounts[tier][talent];
      const total = totalPerTier[tier];
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      talentSummary += `- ${talent}: ${percent}%<br>`;
    });
  });
  talentSummary += "</div><br>";

  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';     // Gold
    if (rank >= 2 && rank <= 25) return '#e268a8'; // Pink
    return '#ff8000';                     // Orange
  };

  const entries = data.rankings.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    return `<div class="rank-entry" style="color: ${color};">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');

  rankingsDiv.innerHTML = `<h2>${name}</h2>${talentSummary}${entries}`;
}

createBossButtons();
