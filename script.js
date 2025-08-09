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

function updateLastUpdatedDisplay(timestamp) {
  document.getElementById('last-updated').textContent = `Last updated: ${timestamp}`;
}

function createBossButtons() {
  Object.entries(encounters).forEach(([name, id]) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.className = 'boss-button';
    button.onclick = () => fetchAndDisplayRankings(name, id);
    bossButtonsDiv.appendChild(button);
  });
}

async function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const response = await fetch(`/.netlify/functions/getLogs?encounterId=${id}`);
  const data = await response.json();
  updateLastUpdatedDisplay(data.lastUpdated);
  renderRankings(name, data.rankings.slice(0, 100));
}

function renderRankings(name, rankings) {
  const entries = rankings.map((r, i) => {
    const percentile = r.percentile ? Math.floor(r.percentile) : 0;
    let colorClass = "";
    if (percentile >= 100) colorClass = "100";
    else if (percentile >= 99) colorClass = "99";
    else if (percentile >= 95) colorClass = "95";

    return `<div class="rank-entry" data-percentile="${colorClass}">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');
  rankingsDiv.innerHTML = `<h2>${name}</h2>${entries}`;
}

createBossButtons();
