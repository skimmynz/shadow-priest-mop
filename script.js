
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
  document.body.style.backgroundImage = `url(${backgrounds[bossName]})`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

function createBossButtons() {
  bossButtonsDiv.innerHTML = ""; // Ensure buttons are cleared before re-rendering
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

createBossButtons();
