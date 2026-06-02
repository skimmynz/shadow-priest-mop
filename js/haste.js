const breakpoints = {
  "Shadow Word: Pain": {
    id: 589,
    points: [8.32, 24.97, 41.68, 58.35, 74.98, 91.63, 108.41, 124.97, 141.64, 158.29, 175.10, 191.69],
    ratings: [1345, 8085, 14846, 21596, 28325, 35066, 41855, 48561, 55308, 62045, 68852, 75564],
    goblinPoints: [7.25, 23.74, 40.27, 56.79, 73.25, 89.73, 106.34, 122.74, 139.25, 155.73, 172.38, 188.80],
    goblinRatings: [911, 7584, 14278, 20961, 27624, 34298, 41020, 47659, 54340, 61010, 67749, 74395],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
  },
  "Vampiric Touch": {
    id: 34914,
    points: [9.99, 30.01, 49.96, 70.02, 90.05, 110.01, 129.97, 150.10, 169.91, 190.00, 210.08],
    ratings: [2021, 10124, 18200, 26318, 34427, 42505, 50585, 58733, 66748, 74880, 83008],
    goblinPoints: [8.90, 28.72, 48.48, 68.34, 88.17, 107.93, 127.70, 147.63, 167.23, 187.12, 207.01],
    goblinRatings: [1580, 9603, 17599, 25637, 33665, 41663, 49663, 57731, 65666, 73717, 81765],
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
  },
  "Devouring Plague": {
    id: 2944,
    points: [8.29, 24.92, 41.74, 58.35, 74.98, 91.75, 108.55, 124.97, 141.84, 158.06, 175.10, 191.97, 208.17, 225.20, 241.88, 257.78],
    ratings: [1330, 8064, 14873, 21596, 28325, 35115, 41914, 48561, 55387, 61955, 68852, 75679, 82235, 89130, 95881, 102317],
    goblinPoints: [7.21, 23.69, 40.34, 56.79, 73.25, 89.86, 106.49, 122.74, 139.44, 155.51, 172.38, 189.08, 205.12, 221.98, 238.50, 254.24],
    goblinRatings: [896, 7564, 14305, 20961, 27624, 34347, 41078, 47659, 54418, 60921, 67749, 74509, 81000, 87827, 94511, 100883],
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

    var nextBPRating = null;
    var nextBPDisplayPct = null;
    for (var i = 0; i < data.points.length; i++) {
      if (effectiveHaste >= thresholdPct(data, i, isGoblin)) {
        extraTicks++;
      } else {
        nextBPValue = data.points[i];
        nextBPRating = bpRating(data, i, isGoblin, nextBPValue);
        nextBPDisplayPct = bpDisplayPct(data, i, isGoblin).toFixed(2);
        nextBP = nextBPDisplayPct + '% (' + nextBPRating.toLocaleString() + ' rating)';
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

    var breakpointContent = isMaxed
      ? '<div class="breakpoint-text breakpoint-maxed">Maxed</div>'
      : '<div class="breakpoint-text">' +
          '<span class="bp-pct">' + nextBPDisplayPct + '%</span>' +
          '<span class="bp-rating">' + nextBPRating.toLocaleString() + ' rating</span>' +
        '</div>';

    spellsHTML +=
      '<div class="spell-row">' +
        '<div class="spell-info">' +
          '<a href="' + data.url + '" target="_blank" class="spell-name" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            '<img src="' + data.icon + '" alt="' + spell + '" class="spell-icon">' +
          '</a>' +
          '<a href="' + data.url + '" target="_blank" class="spell-name spell-name-text" data-wowhead="spell=' + data.id + '&domain=mop-classic">' +
            spell +
          '</a>' +
        '</div>' +
        '<div class="base-ticks">' + baseTicks[spell] + ' ticks base</div>' +
        '<div class="ticks-badge ' + ticksClass + '">+' + extraTicks + ' tick' + (extraTicks !== 1 ? 's' : '') + '</div>' +
        '<div class="breakpoint-info">' +
          breakpointContent +
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

// Exact haste% threshold for a breakpoint, derived from its hard-coded base rating at
// full precision (the 2-decimal points value is rounded and triggers ~1 rating early).
// Falls back to the displayed points value when no fixed rating exists (ratings[i] == null).
function thresholdPct(data, i, isGoblin) {
  if (isGoblin) {
    var gbase = data.goblinRatings ? data.goblinRatings[i] : null;
    if (gbase != null) return ((1 + gbase / 42500) * 1.05 * 1.01 - 1) * 100;
    return bpDisplayPct(data, i, true);
  }
  var base = data.ratings ? data.ratings[i] : null;
  if (base == null) return data.points[i];
  return ((1 + base / 42500) * 1.05 - 1) * 100;
}

// Rating for a breakpoint. Goblin: hard-coded goblinRatings table value. Non-goblin:
// hard-coded ratings table value. Falls back to the formula when no fixed value exists.
function bpRating(data, i, isGoblin, pct) {
  if (isGoblin) {
    var gr = data.goblinRatings ? data.goblinRatings[i] : null;
    if (gr != null) return gr;
    return calculateRatingFromPercent(pct, true);
  }
  var base = data.ratings ? data.ratings[i] : null;
  if (base == null) return calculateRatingFromPercent(pct, false);
  return base;
}

// Display haste% for a breakpoint. Goblin: hard-coded goblinPoints (pre-racial gear haste).
// Non-goblin: the listed points value. Falls back to points when no fixed value exists.
function bpDisplayPct(data, i, isGoblin) {
  if (isGoblin) {
    var gp = data.goblinPoints ? data.goblinPoints[i] : null;
    return gp != null ? gp : data.points[i];
  }
  return data.points[i];
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

// Prefill from URL param (?rating=15294)
var params = new URLSearchParams(window.location.search);
var prefill = params.get('rating');
if (prefill && /^\d{1,5}$/.test(prefill)) {
  hasteInput.value = prefill;
}

// Init
calculateHaste();

// Race/buff icons are <a href> so Wowhead Power binds tooltips (power.js only scans
// document.links). An anchor inside a <label> swallows the toggle click, so toggle the
// checkbox manually and suppress navigation to Wowhead.
document.querySelectorAll('.icon-toggle .wh-icon').forEach(function(anchor) {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    var cb = this.closest('.icon-toggle').querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
  });
});

// power.js auto-binds document.links on load; this explicit pass covers the async case.
(function bindStaticTooltips() {
  if (typeof $WowheadPower !== 'undefined') {
    $WowheadPower.refreshLinks();
  } else {
    setTimeout(bindStaticTooltips, 200);
  }
})();
