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

function updateLastUpdatedDisplay() {
  const lastUpdated = localStorage.getItem('lastUpdated');
  if (lastUpdated) {
    const date = new Date(lastUpdated);
    document.getElementById('last-updated').textContent = `Last updated: ${date.toUTCString()}`;
  }
}

function getPercentileColor(percentile) {
  if (percentile >= 100) return "100";
  if (percentile >= 99) return "99";
  if (percentile >= 95) return "95";
  return "";
}

function renderRankings(name, rankings) {
  const entries = rankings.map((r, i) => {
    const percentile = getPercentileColor(r.percentile || 0);
    return `<div class="rank-entry" data-percentile="${percentile}">${i + 1}. ${r.name} – ${Math.round(r.total)} DPS</div>`;
  }).join('');
  rankingsDiv.innerHTML = `<h2>${name}</h2>${entries}`;
}

async function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const cache = JSON.parse(localStorage.getItem('rankingsCache') || '{}');
  const lastUpdated = localStorage.getItem('lastUpdated');
  const now = new Date();
  const refreshTime = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0);

  if (!lastUpdated || new Date(lastUpdated) < refreshTime || !cache[name]) {
    const response = await fetch(`/.netlify/functions/getLogs?encounterId=${id}`);
    const data = await response.json();
    cache[name] = data.rankings.slice(0, 100);
    localStorage.setItem('rankingsCache', JSON.stringify(cache));
    localStorage.setItem('lastUpdated', now.toISOString());
    updateLastUpdatedDisplay();
    renderRankings(name, cache[name]);
  } else {
    updateLastUpdatedDisplay();
    renderRankings(name, cache[name]);
  }
}

function createBossButtons() {
  Object.entries(encounters).forEach(([name, id]) => {
    const button = document.createElement('button');
    button.className = 'boss-button';
    button.innerHTML = `<img src="https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2" alt="${name}" loading="lazy"/> ${name}`;
    button.onclick = () => fetchAndDisplayRankings(name, id);
    bossButtonsDiv.appendChild(button);
  });
}

createBossButtons();
updateLastUpdatedDisplay();
