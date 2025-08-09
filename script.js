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
    button.innerHTML = `<img src="https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2" alt="${name}" style="height:20px; vertical-align:middle; margin-right:8px;"> ${name}`;
    button.onclick = () => fetchAndDisplayRankings(name, id);
    bossButtonsDiv.appendChild(button);
  });
}

async function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const url = `/.netlify/functions/getLogs?encounterId=${id}`;
  const response = await fetch(url);
  const data = await response.json();

  const entries = data.rankings.slice(0, 100).map((r, i) => {
    return `<div class="rank-entry">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');

  rankingsDiv.innerHTML = `<h2>${name}</h2>${entries}`;
}

createBossButtons();
