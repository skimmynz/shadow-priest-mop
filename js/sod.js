/* ═══════════════════════════════════════════════════════
   Haste Calculator — js/haste.js
   ═══════════════════════════════════════════════════════ */

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

var baseTicks = {
  "Shadow Word: Pain": 6,
  "Vampiric Touch": 5,
  "Devouring Plague": 6
};

var hasteInput = document.getElementById('hasteInput');

// ── Sanitise input ──────────────────────────────────────
function sanitiseInput() {
  var raw = hasteInput.value;
  var cleaned = raw.replace(/\D/g, '');
  if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
  if (cleaned !== raw) {
    var pos = hasteInput.selectionStart - (raw.length - cleaned.length);
    hasteInput.value = cleaned;
    try { hasteInput.setSelectionRange(pos, pos); } catch (_) {}
  }
  calculateHaste();
}

// ── Race selection ──────────────────────────────────────
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

// ── Core calculation ────────────────────────────────────
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

  // GCD warning
  var gcdCap = isGoblin ? 17614 : 18215;
  var warningEl = document.getElementById('gcdWarningInput');
  warningEl.innerHTML = rating >= gcdCap
    ? '<div class="gcd-warning">' +
        '<span class="gcd-warning-icon">\u26A0</span>' +
        '<span class="gcd-warning-text">GCD Capped at ' + gcdCap.toLocaleString() + ' rating</span>' +
        '<div class="gcd-tooltip">' +
          '<div class="gcd-tooltip-title">Global Cooldown Cap</div>' +
          '<div class="gcd-tooltip-body">The Global Cooldown (GCD) cannot be reduced below 1 second. Any Haste rating beyond ' + gcdCap.toLocaleString() + ' will still benefit your DoT tick speed and breakpoints, but will no longer reduce the time between ability casts.</div>' +
        '</div>' +
      '</div>'
    : '';

  updateSpellTable(effectiveHaste, isGoblin);
}

// ── Rating from percentage ──────────────────────────────
function calculateRatingFromPercent(targetPercent, isGoblin) {
  var targetDecimal = targetPercent / 100;
  var baseMultiplier = 1.05 * (isGoblin ? 1.01 : 1);
  return Math.max(0, Math.round(42500 * ((1 + targetDecimal) / baseMultiplier - 1)));
}

// ═══════════════════════════════════════════════════════
// Spell table rendering
// ═══════════════════════════════════════════════════════
function updateSpellTable(effectiveHaste, isGoblin) {
  var spellsHTML = '';

  for (var spell in breakpoints) {
    var data = breakpoints[spell];
    var base = baseTicks[spell];
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
          '<a href="' + data.url + '" target="_blank" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            '<img src="' + data.icon + '" alt="' + spell + '" class="spell-icon">' +
          '</a>' +
          '<a href="' + data.url + '" target="_blank" class="spell-name" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            spell +
          '</a>' +
        '</div>' +
        '<div class="base-ticks">' + base + ' ticks base</div>' +
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

  document.getElementById('spellsContainer').innerHTML = spellsHTML;

  if (typeof $WowheadPower !== 'undefined') {
    $WowheadPower.refreshLinks();
  }
}

// ── Event listeners ─────────────────────────────────────
hasteInput.addEventListener('input', sanitiseInput);
hasteInput.addEventListener('paste', function() { setTimeout(sanitiseInput, 0); });
hasteInput.addEventListener('keydown', function(e) {
  var allow = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (allow.indexOf(e.key) !== -1 || e.ctrlKey || e.metaKey) return;
  if (e.key < '0' || e.key > '9') e.preventDefault();
});
hasteInput.addEventListener('focus', function() { this.select(); });

handleRaceSelection();
document.getElementById('powerInfusion').addEventListener('change', calculateHaste);
document.getElementById('berserking').addEventListener('change', calculateHaste);
document.getElementById('bloodlust').addEventListener('change', calculateHaste);
document.getElementById('sinisterPrimal').addEventListener('change', calculateHaste);

// Init
calculateHaste();
