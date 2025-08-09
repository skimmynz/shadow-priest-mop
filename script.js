
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
      <img src="https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2" alt="${name}" style="height:20px; vertical-align:middle; margin-right:8px;">
      ${name}
    `;
    button.onclick = () => fetchAndDisplayRankings(name, id);
    bossButtonsDiv.appendChild(button);
  });
}

async function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const url = `/.netlify/functions/getLogs?encounterId=${id}`;
  const response = await fetch(url);
  const data = await response.json();

  const getColor = (rank) => {
    if (rank === 1) return '#e5cc80';     // Gold
    if (rank >= 2 && rank <= 25) return '#e268a8'; // Pink
    return '#ff8000';                     // Orange
  };

  const entries = data.rankings.slice(0, 100).map((r, i) => {
    const color = getColor(i + 1);
    return `<div class="rank-entry" style="color: ${color};">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');

  rankingsDiv.innerHTML = `<h2>${name}</h2>${entries}`;
}

createBossButtons();
