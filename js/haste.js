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

// ── Sanitise input (works on mobile + desktop) ─────────
// Strips non-digits, enforces 5-char max, and recalculates.
function sanitiseInput() {
  var raw = hasteInput.value;
  var cleaned = raw.replace(/\D/g, '');       // strip non-digits
  if (cleaned.length > 5) cleaned = cleaned.slice(0, 5); // cap at 5 chars
  if (cleaned !== raw) {
    // Preserve cursor position where possible
    var pos = hasteInput.selectionStart - (raw.length - cleaned.length);
    hasteInput.value = cleaned;
    try { hasteInput.setSelectionRange(pos, pos); } catch (_) {}
  }
  calculateHaste();
}

// Handle race selection and Berserking visibility
function handleRaceSelection() {
  var trollRacial = document.getElementById('trollRacial');
  var goblinRacial = document.getElementById('goblinRacial');
  var berserkingToggle = document.getElementById('berserkingToggle');
  var berserkingCheckbox = document.getElementById('berserking');

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
  var rating = Math.min(parseFloat(hasteInput.value) || 0, 20000);
  var isGoblin = document.getElementById('goblinRacial').checked;
  var hasPowerInfusion = document.getElementById('powerInfusion').checked;
  var hasBerserking = document.getElementById('berserking').checked;
  var hasBloodlust = document.getElementById('bloodlust').checked;
  var hasSinisterPrimal = document.getElementById('sinisterPrimal').checked;

  var baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
  if (hasPowerInfusion) baseMultiplier *= 1.20;
  if (hasBerserking) baseMultiplier *= 1.20;
  if (hasBloodlust) baseMultiplier *= 1.30;
  if (hasSinisterPrimal) baseMultiplier *= 1.30;

  var effectiveHaste = ((1 + rating / 42500) * baseMultiplier - 1) * 100;

  document.getElementById('hasteResult').textContent = effectiveHaste.toFixed(2) + '%';

  // GCD Cap warning
  var gcdCap = isGoblin ? 17614 : 18215;
  var warningElement = document.getElementById('gcdWarningInput');

  if (rating >= gcdCap) {
    warningElement.innerHTML = '<div class="gcd-warning">\u26A0\uFE0F GCD Cap Reached (' + gcdCap.toLocaleString() + ' rating)<span class="gcd-tooltip"><div class="gcd-tooltip-body">The GCD cannot go below 1 second. Beyond ' + gcdCap.toLocaleString() + ' rating, Haste won\'t speed up casts but still adds extra DoT ticks. Effects like PI, Bloodlust, and Sinister Primal Diamond remain powerful because they push past the cap to unlock bonus ticks.</div></span></div>';
  } else {
    warningElement.innerHTML = '';
  }

  updateSpellTable(effectiveHaste, isGoblin);
}

function updateSpellTable(effectiveHaste, isGoblin) {
  var baseTicks = {
    "Shadow Word: Pain": 6,
    "Vampiric Touch": 5,
    "Devouring Plague": 6
  };

  var spellsHTML = '';

  for (var spell in breakpoints) {
    var data = breakpoints[spell];
    var extraTicks = 0;
    var nextBP = 'Maxed';
    var nextBPValue = null;

    for (var i = 0; i < data.points.length; i++) {
      if (effectiveHaste >= data.points[i]) {
        extraTicks++;
      } else {
        nextBPValue = data.points[i];
        nextBP = nextBPValue + '% (' + calculateRatingFromPercent(nextBPValue, isGoblin).toLocaleString() + ' rating)';
        break;
      }
    }

    var progressPercent = 100;
    if (nextBPValue !== null) {
      var prevBP = data.points[extraTicks - 1] || 0;
      progressPercent = Math.min(100, Math.max(0, ((effectiveHaste - prevBP) / (nextBPValue - prevBP)) * 100));
    }

    var isMaxed = nextBP === 'Maxed';

    var ticksClass = 'no-ticks';
    if (extraTicks > 3) ticksClass = 'high-ticks';
    else if (extraTicks > 0) ticksClass = 'has-ticks';

    spellsHTML +=
      '<div class="spell-row">' +
        '<div class="spell-info">' +
          '<a href="' + data.url + '" target="_blank" class="spell-name" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            '<img src="' + data.icon + '" alt="' + spell + '" class="spell-icon">' +
          '</a>' +
          '<a href="' + data.url + '" target="_blank" class="spell-name" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            spell +
          '</a>' +
        '</div>' +
        '<div class="base-ticks">' + baseTicks[spell] + ' ticks base</div>' +
        '<div class="ticks-badge ' + ticksClass + '">+' + extraTicks + ' tick' + (extraTicks !== 1 ? 's' : '') + '</div>' +
        '<div class="breakpoint-info">' +
          '<div class="breakpoint-text-container">' +
            '<div class="breakpoint-text ' + (isMaxed ? 'breakpoint-maxed' : '') + '">' +
              nextBP +
            '</div>' +
          '</div>' +
          (!isMaxed
            ? '<div class="progress-container"><div class="progress-bar" style="width: ' + progressPercent + '%"></div></div>'
            : '') +
        '</div>' +
      '</div>';
  }

  spellsHTML +=
    '<div class="breakpoint-explainer">' +
      '<p>In Mists of Pandaria Classic, a <strong>Haste Breakpoint</strong> is a specific amount of Haste rating at which a damage-over-time spell gains an additional tick before it expires. DoTs like Shadow Word: Pain, Vampiric Touch, and Devouring Plague tick at fixed intervals, but Haste shortens those intervals. Once you accumulate enough Haste to hit a breakpoint, that extra tick represents a significant DPS increase.</p>' +
    '</div>';

  document.getElementById('spellsContainer').innerHTML = spellsHTML;

  if (typeof $WowheadPower !== 'undefined') {
    $WowheadPower.refreshLinks();
  }
}

// Calculate rating from percentage
function calculateRatingFromPercent(targetPercent, isGoblin) {
  var targetHasteDecimal = targetPercent / 100;
  var baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
  return Math.max(0, Math.round(42500 * ((1 + targetHasteDecimal) / baseMultiplier - 1)));
}

// ── Event listeners ─────────────────────────────────────

// Primary: `input` fires on every change (keyboard, paste, autofill, mobile)
hasteInput.addEventListener('input', sanitiseInput);

// Fallback: also catch paste explicitly (some browsers fire input, some don't)
hasteInput.addEventListener('paste', function() {
  // Defer so the pasted value is in the field
  setTimeout(sanitiseInput, 0);
});

// Desktop nicety: block non-numeric keys before they land
hasteInput.addEventListener('keydown', function(e) {
  var allow = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (allow.indexOf(e.key) !== -1 || e.ctrlKey || e.metaKey) return;
  if (e.key < '0' || e.key > '9') { e.preventDefault(); }
});

// Select-all on focus for quick overwrite
hasteInput.addEventListener('focus', function() { this.select(); });

// Buff toggles
handleRaceSelection();
document.getElementById('powerInfusion').addEventListener('change', calculateHaste);
document.getElementById('berserking').addEventListener('change', calculateHaste);
document.getElementById('bloodlust').addEventListener('change', calculateHaste);
document.getElementById('sinisterPrimal').addEventListener('change', calculateHaste);

// Init
calculateHaste();
