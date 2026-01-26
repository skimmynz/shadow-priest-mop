const breakpoints = {
  "Shadow Word: Pain": {
    id: 589,
    points: [8.32, 24.97, 41.68, 58.35, 74.98, 91.63, 108.41, 124.97, 141.64, 158.29, 175.10, 191.69, 208.48],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
  },
  "Vampiric Touch": {
    id: 34914,
    points: [9.99, 30.01, 49.95, 70.02, 90.05, 110.01, 129.97, 150.10, 169.91, 190.00, 210.08],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
  },
  "Devouring Plague": {
    id: 2944,
    points: [8.28, 24.92, 41.74, 58.35, 74.98, 91.75, 108.55, 124.97, 141.84, 158.06, 175.10, 191.97, 208.17, 225.20, 241.88, 257.78],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_devouringplague.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=2944/devouring-plague"
  }
};

const hasteInput = document.getElementById('hasteInput');

// Handle race selection and Berserking visibility
function handleRaceSelection() {
  const trollRacial = document.getElementById('trollRacial');
  const goblinRacial = document.getElementById('goblinRacial');
  const berserkingToggle = document.getElementById('berserkingToggle');
  const berserkingCheckbox = document.getElementById('berserking');
  
  // Make races mutually exclusive
  trollRacial.addEventListener('change', function() {
    if (this.checked) {
      goblinRacial.checked = false;
      berserkingToggle.style.display = 'flex';
    } else {
      berserkingToggle.style.display = 'none';
      berserkingCheckbox.checked = false;
    }
    calculateHaste();
  });
  
  goblinRacial.addEventListener('change', function() {
    if (this.checked) {
      trollRacial.checked = false;
      berserkingToggle.style.display = 'none';
      berserkingCheckbox.checked = false;
    }
    calculateHaste();
  });
}

function calculateHaste() {
  let rating = Math.min(parseFloat(hasteInput.value) || 0, 20000);
  const isGoblin = document.getElementById('goblinRacial').checked;
  const hasPowerInfusion = document.getElementById('powerInfusion').checked;
  const hasBerserking = document.getElementById('berserking').checked;
  const hasBloodlust = document.getElementById('bloodlust').checked;
  const hasSinisterPrimal = document.getElementById('sinisterPrimal').checked;
  
  // Base multiplier: 5% Shadowform + 1% Goblin (if applicable)
  let baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
  
  // Add multiplicative haste buffs
  if (hasPowerInfusion) baseMultiplier *= 1.20;
  if (hasBerserking) baseMultiplier *= 1.20;
  if (hasBloodlust) baseMultiplier *= 1.30;
  if (hasSinisterPrimal) baseMultiplier *= 1.30;
  
  let effectiveHaste = ((1 + rating / 42500) * baseMultiplier - 1) * 100;

  document.getElementById('hasteResult').textContent = `${effectiveHaste.toFixed(2)}%`;

  // GCD Cap warning
  const gcdCap = isGoblin ? 17614 : 18215;
  const warningElement = document.getElementById('gcdWarning');
  
  if (rating >= gcdCap) {
    warningElement.innerHTML = `<div class="gcd-warning">⚠️ GCD Cap Reached (${gcdCap.toLocaleString()} rating)</div>`;
  } else {
    warningElement.innerHTML = '';
  }

  updateSpellTable(effectiveHaste, isGoblin);
}

function handleInput(e) {
  calculateHaste();
}

function updateSpellTable(effectiveHaste, isGoblin) {
  // Define base ticks for each spell
  const baseTicks = {
    "Shadow Word: Pain": 6,
    "Vampiric Touch": 5,
    "Devouring Plague": 6
  };
  
  let spellsHTML = '';
  
  for (const [spell, data] of Object.entries(breakpoints)) {
    let extraTicks = 0;
    let nextBP = 'Maxed';
    let nextBPValue = null;

    for (let i = 0; i < data.points.length; i++) {
      if (effectiveHaste >= data.points[i]) {
        extraTicks++;
      } else {
        nextBPValue = data.points[i];
        nextBP = `${nextBPValue}% (${calculateRatingFromPercent(nextBPValue, isGoblin).toLocaleString()} rating)`;
        break;
      }
    }

    let progressPercent = 100;
    if (nextBPValue !== null) {
      const prevBP = data.points[extraTicks - 1] ?? 0;
      progressPercent = Math.min(
        100,
        Math.max(0, ((effectiveHaste - prevBP) / (nextBPValue - prevBP)) * 100)
      );
    }

    const isMaxed = nextBP === 'Maxed';
    const ticksClass = extraTicks > 0 ? 'has-ticks' : 'no-ticks';

    spellsHTML += `
      <div class="spell-row">
        <div class="spell-info">
          <a href="${data.url}"
              target="_blank"
              class="spell-name"
              data-wowhead="spell=${data.id}&domain=mop-classic">
            <img src="${data.icon}" alt="${spell}" class="spell-icon">
          </a>
          <a href="${data.url}"
              target="_blank"
              class="spell-name"
              data-wowhead="spell=${data.id}&domain=mop-classic">
            ${spell}
          </a>
        </div>
        
        <div class="base-ticks">${baseTicks[spell]} ticks base</div>
        
        <div class="ticks-badge ${ticksClass}">+${extraTicks} tick${extraTicks !== 1 ? 's' : ''}</div>
        
        <div class="breakpoint-info">
          <div class="breakpoint-text-container">
            <div class="breakpoint-text ${isMaxed ? 'breakpoint-maxed' : ''}">
              ${nextBP}
            </div>
          </div>
          ${!isMaxed ? `
            <div class="progress-container">
              <div class="progress-bar" style="width: ${progressPercent}%"></div>
            </div>
          ` : ''}
        </div>
      </div>`;
  }
  
  document.getElementById('spellsContainer').innerHTML = spellsHTML;

  // Refresh Wowhead tooltips
  if (typeof $WowheadPower !== 'undefined') {
    $WowheadPower.refreshLinks();
  }
}

// Calculate rating from percentage
function calculateRatingFromPercent(targetPercent, isGoblin = false, hasPowerInfusion = false, hasBerserking = false, hasBloodlust = false, hasSinisterPrimal = false) {
  const targetHasteDecimal = targetPercent / 100;
  let baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
  
  if (hasPowerInfusion) baseMultiplier *= 1.20;
  if (hasBerserking) baseMultiplier *= 1.20;
  if (hasBloodlust) baseMultiplier *= 1.30;
  if (hasSinisterPrimal) baseMultiplier *= 1.30;
  
  return Math.max(0, Math.round(42500 * ((1 + targetHasteDecimal) / baseMultiplier - 1)));
}

// Event listeners
hasteInput.addEventListener('input', handleInput);
hasteInput.addEventListener('paste', handleInput);
hasteInput.addEventListener('keydown', function(e) {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  const isNumericKey = e.key >= '0' && e.key <= '9';
  const isControlKey = e.ctrlKey || e.metaKey;
  
  if (allowedKeys.includes(e.key) || isControlKey) {
    return;
  }
  
  if (!isNumericKey) {
    e.preventDefault();
    return;
  }
  
  const hasSelection = this.selectionStart !== this.selectionEnd;
  const selectionLength = this.selectionEnd - this.selectionStart;
  const valueLength = this.value.length;
  
  // Calculate what the length would be after this key press
  const futureLength = valueLength - selectionLength + 1;
  
  // Only prevent if we'd exceed 5 digits
  if (futureLength > 5) {
    e.preventDefault();
  }
});

// Initialize race selection handler
handleRaceSelection();

document.getElementById('powerInfusion').addEventListener('change', calculateHaste);
document.getElementById('berserking').addEventListener('change', calculateHaste);
document.getElementById('bloodlust').addEventListener('change', calculateHaste);
document.getElementById('sinisterPrimal').addEventListener('change', calculateHaste);

hasteInput.addEventListener('focus', function() {
  this.select();
});

// Initialize on load
calculateHaste();
