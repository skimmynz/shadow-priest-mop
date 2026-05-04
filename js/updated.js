// ─────────────────────────────────────────────────────────
// SPELL DEFINITIONS (TICK-BASED, CSV-ALIGNED)
// ─────────────────────────────────────────────────────────

const spells = {
  "Shadow Word: Pain": {
    id: 589,
    baseTicks: 6,
    maxTicks: 18,
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_shadowwordpain.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=589/shadow-word-pain"
  },
  "Vampiric Touch": {
    id: 34914,
    baseTicks: 5,
    maxTicks: 16,
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_holy_stoicism.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=34914/vampiric-touch"
  },
  "Devouring Plague": {
    id: 2944,
    baseTicks: 6,
    maxTicks: 22,
    icon: "https://wow.zamimg.com/images/wow/icons/large/spell_shadow_devouringplague.jpg",
    url: "https://www.wowhead.com/mop-classic/spell=2944/devouring-plague"
  }
};

const hasteInput = document.getElementById('hasteInput');

// ─────────────────────────────────────────────────────────
// INPUT SANITISATION
// ─────────────────────────────────────────────────────────

function sanitiseInput() {
  const raw = hasteInput.value;
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);

  if (cleaned !== raw) {
    const pos = hasteInput.selectionStart - (raw.length - cleaned.length);
    hasteInput.value = cleaned;
    try { hasteInput.setSelectionRange(pos, pos); } catch (_) {}
  }
  calculateHaste();
}

// ─────────────────────────────────────────────────────────
// BUFF / RACE MULTIPLIER LOGIC (CSV-EXACT)
// ─────────────────────────────────────────────────────────

function getBuffMultiplier() {
  let mult = 1.05; // 5% raid spell haste

  if (document.getElementById('goblinRacial').checked) mult *= 1.01;
  if (document.getElementById('powerInfusion').checked) mult *= 1.20;
  if (document.getElementById('berserking').checked) mult *= 1.20;
  if (document.getElementById('bloodlust').checked) mult *= 1.30;
  if (document.getElementById('sinisterPrimal').checked) mult *= 1.30;

  return mult;
}

function getTotalMultiplier(rating) {
  return getBuffMultiplier() * (1 + rating / 42500);
}

// ─────────────────────────────────────────────────────────
// CORE CALCULATION
// ─────────────────────────────────────────────────────────

function calculateHaste() {
  const rating = Math.min(parseInt(hasteInput.value) || 0, 20000);
  const totalMult = getTotalMultiplier(rating);
  const hastePct = (totalMult - 1) * 100;

  document.getElementById('hasteResult').textContent = hastePct.toFixed(2) + '%';

  // GCD cap warning (unchanged behavior)
  const isGoblin = document.getElementById('goblinRacial').checked;
  const gcdCap = isGoblin ? 17614 : 18215;
  const warningElement = document.getElementById('gcdWarningInput');

  warningElement.innerHTML =
    rating >= gcdCap
      ? `<div class="gcd-warning">⚠️ GCD Cap Reached (${gcdCap.toLocaleString()} rating)
          <span class="gcd-tooltip">
            <div class="gcd-tooltip-body">
              The GCD cannot go below 1 second. Beyond ${gcdCap.toLocaleString()} rating,
              Haste won’t speed up casts but still adds extra DoT ticks.
            </div>
          </span>
        </div>`
      : '';

  updateSpellTable(rating);
}

// ─────────────────────────────────────────────────────────
// TICK & BREAKPOINT MATH (SPREADSHEET-ACCURATE)
// ─────────────────────────────────────────────────────────

function getTickData(spell, rating) {
  const data = spells[spell];
  const totalMult = getTotalMultiplier(rating);
  const buffMult = getBuffMultiplier();

  const rawTicks = data.baseTicks * totalMult;
  const ticks = Math.min(
    data.maxTicks,
    Math.floor(rawTicks + 1e-9)
  );

  const nextTick = ticks + 1 <= data.maxTicks ? ticks + 1 : null;

  let nextRating = null;
  if (nextTick) {
    const requiredMult = nextTick / data.baseTicks;
    nextRating = Math.ceil(
      42500 * (requiredMult / buffMult - 1)
    );
  }

  return {
    extraTicks: ticks - data.baseTicks,
    nextRating,
    ticks
  };
}

function getProgressPercent(spell, rating) {
  const data = spells[spell];

  const totalMult = getTotalMultiplier(rating);
  const buffMult = getBuffMultiplier();
  const effectiveMult = totalMult / buffMult;

  const currentTicks = Math.floor(data.baseTicks * totalMult);
  const prevReq = currentTicks / data.baseTicks;
  const nextReq = (currentTicks + 1) / data.baseTicks;

  return Math.min(
    100,
    Math.max(0, ((effectiveMult - prevReq) / (nextReq - prevReq)) * 100)
  );
}

// ─────────────────────────────────────────────────────────
// UI RENDER
// ─────────────────────────────────────────────────────────

function updateSpellTable(rating) {
  let html = '';

  for (const spell in spells) {
    const data = spells[spell];
    const tickData = getTickData(spell, rating);
    const isMaxed = tickData.nextRating === null;

    let ticksClass = 'no-ticks';
    if (tickData.extraTicks > 3) ticksClass = 'high-ticks';
    else if (tickData.extraTicks > 0) ticksClass = 'has-ticks';

    html += `
      <div class="spell-row">
        <div class="spell-info">
          <a href="${data.url}" target="_blank" data-wowhead="spell=${data.id}&domain=mop-classic">
            <img src="${data.icon}" class="spell-icon" alt="${spell}">
          </a>
          <a href="${data.url}" target="_blank" class="spell-name"
             data-wowhead="spell=${data.id}&domain=mop-classic">${spell}</a>
        </div>

        <div class="base-ticks">${data.baseTicks} ticks base</div>
        <div class="ticks-badge ${ticksClass}">
          +${tickData.extraTicks} tick${tickData.extraTicks !== 1 ? 's' : ''}
        </div>

        <div class="breakpoint-info">
          ${isMaxed
            ? `<div class="breakpoint-text breakpoint-maxed">Maxed</div>`
            : `<div class="breakpoint-text">
                 <span class="bp-rating">${tickData.nextRating.toLocaleString()} rating</span>
               </div>
               <div class="progress-container">
                 <div class="progress-bar" style="width:${getProgressPercent(spell, rating)}%"></div>
               </div>`
          }
        </div>
      </div>
    `;
  }

  document.getElementById('spellsContainer').innerHTML = html;
  if (typeof $WowheadPower !== 'undefined') $WowheadPower.refreshLinks();
}

// ─────────────────────────────────────────────────────────
// EVENT WIRES (UNCHANGED)
// ─────────────────────────────────────────────────────────

hasteInput.addEventListener('input', sanitiseInput);
hasteInput.addEventListener('paste', () => setTimeout(sanitiseInput, 0));
hasteInput.addEventListener('keydown', e => {
  const allow = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (allow.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (e.key < '0' || e.key > '9') e.preventDefault();
});
hasteInput.addEventListener('focus', () => hasteInput.select());

['powerInfusion','berserking','bloodlust','sinisterPrimal','goblinRacial','trollRacial']
  .forEach(id => document.getElementById(id)?.addEventListener('change', calculateHaste));

const params = new URLSearchParams(window.location.search);
if (/^\d{1,5}$/.test(params.get('rating'))) hasteInput.value = params.get('rating');

calculateHaste();
