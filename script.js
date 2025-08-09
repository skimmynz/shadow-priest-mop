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
    const img = document.createElement('img');
    const span = document.createElement('span');

    img.src = `https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2`;
    img.alt = name;
    img.className = 'boss-icon';

    span.textContent = name;

    button.appendChild(img);
    button.appendChild(span);
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
  "Spectral Guise": 119898,
  "Angelic Bulwark": 108945,
  "Twist of Fate": 109142,
  "Power Infusion": 10060,
  "Divine Insight": 109175,
  "Cascade": 121135,
  "Divine Star": 110744,
  "Halo": 120517
};

// Map API talent names to talentTiers names
const talentNameMap = {
  "Surge of Light": "From Darkness, Comes Light",
  "Mind Control": "Dominate Mind"
};

function getSpellId(talentName) {
  return talentSpellIds[talentName] || 0;
}

function fetchAndDisplayRankings(name, id) {
  rankingsDiv.innerHTML = `<h2>${name}</h2><p>Loading...</p>`;
  const url = `/.netlify/functions/getLogs?encounterId=${id}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const tierCounts = {};
      const totalPerTier = {};

      // Initialize counts for each talent in each tier
      Object.keys(talentTiers).forEach(tier => {
        tierCounts[tier] = {};
        totalPerTier[tier] = 0;
        talentTiers[tier].forEach(talent => {
          tierCounts[tier][talent] = 0;
        });
      });

      // Count talents, ensuring one talent per tier per player and only valid talents
      data.rankings.forEach(entry => {
        const talentsSelected = new Set(); // Track tiers processed for this player
        entry.talents.forEach(talent => {
          let talentName = talent.name;
          // Map API talent name to talentTiers name if applicable
          talentName = talentNameMap[talentName] || talentName;
          // Check if talent is in talentTiers
          const tier = Object.entries(talentTiers).find(([_, talents]) => talents.includes(talentName))?.[0];
          if (tier && !talentsSelected.has(tier)) {
            tierCounts[tier][talentName]++;
            totalPerTier[tier]++;
            talentsSelected.add(tier); // Mark tier as processed
          }
        });
      });

      let talentSummary = `<div class='talent-summary'>`;
      Object.keys(talentTiers).sort((a, b) => a - b).forEach(tier => {
        talentSummary += `<div class="talent-row">`;
        talentTiers[tier].forEach(talent => {
          const count = tierCounts[tier][talent];
          const total = totalPerTier[tier];
          const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          const color = percent >= 75 ? 'limegreen' : percent <= 10 ? 'red' : 'orange';
          const iconKey = talentIcons[talent] || "inv_misc_questionmark";
          const iconUrl = `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
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
        const talentIconsHTML = r.talents
          .map(talent => {
            // Map API talent name to talentTiers name for display
            const displayName = talentNameMap[talent.name] || talent.name;
            return { ...talent, name: displayName };
          })
          .filter(talent => {
            // Only include valid talents in the rankings display
            return Object.values(talentTiers).flat().includes(talent.name);
          })
          .map(talent => {
            const iconKey = talentIcons[talent.name] || "inv_misc_questionmark";
            const iconUrl = `https://assets.rpglogs.com/img/warcraft/abilities/${iconKey}.jpg`;
            const wowheadUrl = `https://www.wowhead.com/mop-classic/spell=${getSpellId(talent.name)}`;
            return `
              <a target="_blank" href="${wowheadUrl}" class="talent-link">
                <img src="${iconUrl}" class="talent-icon-img" alt="${talent.name}" title="${talent.name}">
              </a>
            `;
          }).join('');

        const reportUrl = `https://classic.warcraftlogs.com/reports/${r.reportID}?fight=${r.fightID}&type=damage-done`;

        return `
          <div class="rank-entry" style="color: ${color};">
            <div class="name-wrapper">
              <a target="_blank" href="${reportUrl}" class="player-link">
                ${i + 1}. ${r.name} – ${Math.round(r.total)} DPS
              </a>
            </div>
            <div class="talent-row">${talentIconsHTML}</div>
          </div>
        `;
      }).join('');

      rankingsDiv.innerHTML = `<h2>${name}</h2>${talentSummary}${entries}`;
    })
    .catch(error => {
      console.error("Error fetching logs:", error);
      rankingsDiv.innerHTML = `<p style="color: red;">Failed to load logs.</p>`;
    });
}

createBossButtons();
