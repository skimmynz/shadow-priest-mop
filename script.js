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

function setBackgroundImage(bossName) {
  const backgrounds = {
    "The Stone Guard": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/the-stone-guard-custom.png?v=9",
    "Feng the Accursed": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/feng-the-accursed-custom.png?v=9",
    "Gara'jal the Spiritbinder": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/garajal-the-spiritbinder-custom.png?v=9",
    "The Spirit Kings": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/the-spirit-kings-custom.png?v=9",
    "Elegon": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/elegon-custom.png?v=9",
    "Will of the Emperor": "https://assets2.mythictrap.com/msv-hof-toes/background_finals/will-of-the-emperor-custom.png?v=9"
  };
  const container = document.getElementById("boss-background");
  container.innerHTML = `<img src="${backgrounds[bossName]}" alt="${bossName}">`;
}

function createBossButtons() {
  Object.entries(encounters).forEach(([name, id]) => {
    const button = document.createElement('button');
    button.innerHTML = `
      <img src="https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2" alt="${name}">
      ${name}
    `;
    button.onclick = () => {
      setBackgroundImage(name);
      fetchAndDisplayRankings(name, id);
    };
    bossButtonsDiv.appendChild(button);
  });
}

function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const url = `/.netlify/functions/getLogs?encounterId=${id}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const entries = data.rankings.slice(0, 100).map((r, i) => {
        return {
          name: r.name,
          dps: Math.round(r.total)
        };
      });

      const labels = entries.map(e => e.name);
      const dpsValues = entries.map(e => e.dps);

      const ctx = document.getElementById('dpsChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'DPS',
            data: dpsValues,
            backgroundColor: '#9482C9'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${context.raw} DPS`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#fff',
                autoSkip: true,
                maxRotation: 90,
                minRotation: 45
              }
            },
            y: {
              ticks: {
                color: '#fff'
              }
            }
          }
        }
      });

      const getColor = (rank) => {
        if (rank === 1) return '#e5cc80';
        if (rank >= 2 && rank <= 25) return '#e268a8';
        return '#ff8000';
      };

      const htmlEntries = entries.map((r, i) => {
        const color = getColor(i + 1);
        return `<div class="rank-entry" style="color: ${color};">${i + 1}. ${r.name} – ${r.dps} DPS</div>`;
      }).join('');

      rankingsDiv.innerHTML = `<h2>${name}</h2>${htmlEntries}`;
    })
    .catch(error => {
      console.error("Error fetching logs:", error);
      rankingsDiv.innerHTML = `<p style="color: red;">Failed to load logs.</p>`;
    });
}

createBossButtons();
