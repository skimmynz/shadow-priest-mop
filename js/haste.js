// MoP Classic spell data
const breakpoints = {
  normal: {
    "Shadow Word: Pain": {
      id: 589,
      points: [8.32, 24.97, 41.68],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
    },
    "Vampiric Touch": {
      id: 34914,
      points: [9.99, 30.01, 49.95],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
    },
    "Devouring Plague": {
      id: 2944,
      points: [8.28, 24.92, 41.74],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_devouringplague.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=2944/devouring-plague"
    }
  },
  t14: {
    "Shadow Word: Pain": {
      id: 589,
      points: [7.14, 21.43, 35.71],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
    },
    "Vampiric Touch": {
      id: 34914,
      points: [8.32, 24.97, 41.68],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
    },
    "Devouring Plague": {
      id: 2944,
      points: [8.28, 24.92, 41.74],
      icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_devouringplague.jpg",
      url: "https://www.wowhead.com/mop-classic/spell=2944/devouring-plague"
    }
  }
};

let inputMode = 'rating';
const hasteInput = document.getElementById('hasteInput');

// Toggle between input modes
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    inputMode = this.dataset.mode;

    if (inputMode === 'rating') {
      hasteInput.placeholder = '0';
      hasteInput.setAttribute('max', '38450');
      hasteInput.setAttribute('maxlength', '5');
      hasteInput.setAttribute('step', '1');
      hasteInput.type = 'number';
    } else {
      hasteInput.placeholder = '0.00%';
      hasteInput.removeAttribute('max');
      hasteInput.removeAttribute('step');
      hasteInput.removeAttribute('maxlength');
      hasteInput.type = 'text';
      hasteInput.inputMode = 'decimal';
    }

    hasteInput.value = '';
    calculateHaste();
  });
});

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
  let inputValue = parseFloat(hasteInput.value) || 0;
  const isGoblin = document.getElementById('goblinRacial').checked;
  const hasPowerInfusion = document.getElementById('powerInfusion').checked;
  const hasBerserking = document.getElementById('berserking').checked;
  const hasBloodlust = document.getElementById('bloodlust').checked;
  const hasSinisterPrimal = document.getElementById('sinisterPrimal').checked;
  
  let effectiveHaste;
  let rating;
  
  if (inputMode === 'rating') {
    rating = Math.min(inputValue, 20000);
    // Base multiplier: 5% Shadowform + 1% Goblin (if applicable)
    let baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
    
    // Add multiplicative haste buffs
    if (hasPowerInfusion) baseMultiplier *= 1.20;
    if (hasBerserking) baseMultiplier *= 1.20;
    if (hasBloodlust) baseMultiplier *= 1.30;
    if (hasSinisterPrimal) baseMultiplier *= 1.30;
    
    effectiveHaste = ((1 + rating / 42500) * baseMultiplier - 1) * 100;
  } else {
    // Input is percentage, calculate rating
    inputValue = Math.min(inputValue, 99.99);
    effectiveHaste = inputValue;
    rating = calculateRatingFromPercent(inputValue, isGoblin, hasPowerInfusion, hasBerserking, hasBloodlust, hasSinisterPrimal);
  }

  document.getElementById('hasteResult').textContent = `${effectiveHaste.toFixed(2)}%`;
  
  // Show conversion with icons
  const conversionText = document.getElementById('conversionText');
  const baseTextSpan = conversionText.querySelector('span');
  const activeBuffsDisplay = document.getElementById('activeBuffsDisplay');
  
  if (inputMode === 'rating') {
    if (rating > 0 || isGoblin) {
      let basePercent = 5;
      if (isGoblin) basePercent += 1;
      baseTextSpan.textContent = `${basePercent}% base`;
      if (rating > 0) {
        baseTextSpan.textContent += ` + ${Math.round(rating).toLocaleString()} rating`;
      }
    } else {
      baseTextSpan.textContent = '5% base';
    }
    
    // Update active buff icons
    updateActiveBuffsDisplay(hasPowerInfusion, hasBerserking, hasBloodlust, hasSinisterPrimal);
  } else {
    baseTextSpan.textContent = rating > 0 ? `≈ ${Math.round(rating).toLocaleString()} haste rating` : '';
    activeBuffsDisplay.innerHTML = '';
  }

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

function updateActiveBuffsDisplay(hasPowerInfusion, hasBerserking, hasBloodlust, hasSinisterPrimal) {
  const activeBuffsDisplay = document.getElementById('activeBuffsDisplay');
  const buffs = [];
  
  if (hasPowerInfusion) {
    buffs.push({
      name: 'Power Infusion',
      icon: 'https://wow.zamimg.com/images/wow/icons/large/spell_holy_powerinfusion.jpg'
    });
  }
  
  if (hasBerserking) {
    buffs.push({
      name: 'Berserking',
      icon: 'https://wow.zamimg.com/images/wow/icons/large/racial_troll_berserk.jpg'
    });
  }
  
  if (hasBloodlust) {
    buffs.push({
      name: 'Bloodlust / Heroism',
      icon: 'https://wow.zamimg.com/images/wow/icons/large/spell_nature_bloodlust.jpg'
    });
  }
  
  if (hasSinisterPrimal) {
    buffs.push({
      name: 'Sinister Primal Diamond',
      icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_legendary_chimeraoffear.jpg'
    });
  }
  
  if (buffs.length > 0) {
    activeBuffsDisplay.innerHTML = buffs.map(buff => 
      `<img src="${buff.icon}" 
            alt="${buff.name}" 
            title="${buff.name}"
            class="buff-icon-small">`
    ).join('');
  } else {
    activeBuffsDisplay.innerHTML = '';
  }
}

function handleInput(e) {
  if (inputMode === 'percentage') {
    let value = e.target.value;
    // Remove all non-digit characters
    let digits = value.replace(/\D/g, '');
    
    // Limit to 4 digits
    digits = digits.substring(0, 4);

    // Insert decimal point after the second digit
    if (digits.length > 2) {
      e.target.value = digits.slice(0, 2) + '.' + digits.slice(2);
    } else {
      e.target.value = digits;
    }
  }
  calculateHaste();
}

function updateSpellTable(effectiveHaste, isGoblin) {
  const hasT14 = document.getElementById('t14Bonus').checked;
  const activeBreakpoints = hasT14 ? breakpoints.t14 : breakpoints.normal;
  
  let spellsHTML = '';
  
  for (const [spell, data] of Object.entries(activeBreakpoints)) {
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
  // For rating mode, prevent non-numeric keys (except allowed keys)
  if (inputMode === 'rating') {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const isNumericKey = e.key >= '0' && e.key <= '9';
    const isControlKey = e.ctrlKey || e.metaKey;
    
    // Allow control keys and allowed keys
    if (allowedKeys.includes(e.key) || isControlKey) {
      return;
    }
    
    // Prevent non-numeric keys
    if (!isNumericKey) {
      e.preventDefault();
      return;
    }
    
    // Check if text is selected
    const hasSelection = this.selectionStart !== this.selectionEnd;
    
    // Prevent input if already at 5 digits and no text is selected
    if (this.value.length >= 5 && !hasSelection) {
      e.preventDefault();
    }
  }
});

// Initialize race selection handler
handleRaceSelection();

document.getElementById('powerInfusion').addEventListener('change', calculateHaste);
document.getElementById('berserking').addEventListener('change', calculateHaste);
document.getElementById('bloodlust').addEventListener('change', calculateHaste);
document.getElementById('sinisterPrimal').addEventListener('change', calculateHaste);
document.getElementById('t14Bonus').addEventListener('change', calculateHaste);

hasteInput.addEventListener('focus', function() {
  this.select();
});

// Initialize on load
calculateHaste();
