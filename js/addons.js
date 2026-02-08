// Addon & WeakAura data
const addons = [
  { name: "Plater Nameplates", url: "https://www.curseforge.com/wow/addons/plater-nameplates", profileUrl: "https://wago.io/pfxpBonVW", preview: "https://media.wago.io/screenshots/pfxpBonVW/674874e2db2a2863b9d60ecd.png" },
  {
    name: "Shadowed Unit Frames",
    url: "https://www.curseforge.com/wow/addons/shadowed-unit-frames",
    profileUrl: "https://wago.io/3K-eb06qt",
    preview: "https://media.wago.io/screenshots/3K-eb06qt/688e04f139d99bcfd0194af7.gif",
    hasInstructions: true
  },
];

const weakauras = [
  { name: "Fojji - Shadow Priest UI [MoP] | skimmy edit", url: "https://wago.io/ri2lfOS8b", preview: "https://media.wago.io/screenshots/ri2lfOS8b/688dc81ab1debd7388acf2da.gif" },
  { name: "DragonKarsh CastBars | skimmy edit", url: "https://wago.io/dnDdk1mhh", preview: "https://media.wago.io/screenshots/dnDdk1mhh/688483a02acbf36327ec9c9e.gif" },
  { name: "Shadow Word: Death on Nameplates", url: "https://wago.io/UWa_HeEta", preview: "https://media.wago.io/screenshots/UWa_HeEta/68846df1a40570447822e19e.gif" },
  { name: "Haste Breakpoints (T14, T15)", url: "https://wago.io/7m5gdIAts", preview: "https://media.wago.io/screenshots/7m5gdIAts/6967395d359f134f4939ccd7.gif" },
  { name: "UVLS Tracker", url: "https://wago.io/8Xgm0DEZW", preview: "https://media.wago.io/screenshots/8Xgm0DEZW/69672ac8309543a4f7f46443.gif" },
];

// Hotspot data (single source of truth)
const HOTSPOTS = [
  {
    name: "Fojji - Shadow Priest UI [MoP] | skimmy edit",
    url: "https://wago.io/ri2lfOS8b",
    coords: { x1: 857, y1: 598, x2: 1064, y2: 773 }
  },
  {
    name: "DragonKarsh CastBars | skimmy edit",
    url: "https://wago.io/dnDdk1mhh",
    coords: { x1: 841, y1: 795, x2: 1078, y2: 827 }
  },
  {
    name: "TrufiGCD",
    url: "https://www.curseforge.com/wow/addons/trufigcd",
    coords: { x1: 870, y1: 856, x2: 1013, y2: 891 }
  },
  {
    name: "Shadowed Unit Frames",
    url: "https://www.curseforge.com/wow/addons/shadowed-unit-frames",
    coords: { x1: 1210, y1: 479, x2: 1593, y2: 522 }
  },
  {
    name: "Plater Nameplates",
    url: "https://www.curseforge.com/wow/addons/plater-nameplates",
    coords: { x1: 876, y1: 361, x2: 1059, y2: 450 }
  },
  {
    name: "[Merfin] Equipped Items (MoP)",
    url: "https://wago.io/equippeditemsmop/",
    coords: { x1: 736, y1: 638, x2: 819, y2: 692 }
  },
  {
    name: "Fojji - Easy Talents & Glyphs",
    url: "https://wago.io/FojjiEasyTalents-MoP",
    coords: { x1: 5, y1: 0, x2: 196, y2: 207 }
  },
  {
    name: "Fojji - Time to Kill",
    url: "https://wago.io/6HpAByX3d",
    coords: { x1: 1118, y1: 676, x2: 1172, y2: 700 }
  },
  {
    name: "Details! Damage Meter",
    url: "https://www.curseforge.com/wow/addons/details",
    coords: { x1: 2, y1: 409, x2: 264, y2: 811 }
  }
];

// Base dimensions of the original UI screenshot
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

// DOM refs
const wrapper = document.getElementById('uiMapWrapper');
const image = document.getElementById('uiImage');

/* --------------------------------------------------------------------------------
   Item rendering
   -------------------------------------------------------------------------------- */
function renderItems(items, containerId) {
  const container = document.getElementById(containerId);
  const isWeakAura = containerId === 'weakauras-grid';
  const normalItems = items.filter(item => !item.hasInstructions);
  const instructionItems = items.filter(item => item.hasInstructions);

  function cardHTML(item) {
    const previewHTML = item.preview
      ? `<img src="${item.preview}" alt="${item.name} preview" class="item-preview" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="item-preview-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </div>`;

    const profileBtn = item.profileUrl
      ? `<a href="${item.profileUrl}" target="_blank" rel="noopener" class="item-link secondary">
          Profile
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </a>`
      : '';

    return `<div class="item-card ${item.hasInstructions ? 'has-instructions' : ''}">
      ${previewHTML}
      <div class="item-name">${item.name}</div>
      <div class="item-links">
        ${isWeakAura
          ? `<a href="${item.url}" target="_blank" rel="noopener" class="wago-import-btn">
              <img src="https://media.wago.io/favicon/favicon-32x32.png" alt="" class="wago-icon">
              Import from Wago.io
            </a>`
          : `<a href="${item.url}" target="_blank" rel="noopener" class="item-link">
              Download
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>`}
        ${profileBtn}
      </div>
    </div>`;
  }

  let html = normalItems.map(cardHTML).join('');
  
  instructionItems.forEach(item => {
    html += cardHTML(item);
    html += `<div class="item-card instructions-card">
      <div class="item-name">Shadowed Unit Frames FAQ</div>
      <div class="tab-buttons">
        <button class="tab-btn active" data-tab="install">How to Install</button>
        <button class="tab-btn" data-tab="spells">Add Spells</button>
      </div>
      <div class="tab-content active" data-tab="install">
        <ol>
          <li><code>/suf</code></li>
          <li>Go to <strong>General → Advanced</strong></li>
          <li>Open <strong>Layout Manager</strong></li>
          <li>Click <strong>Import</strong></li>
          <li>Paste code → Accept</li>
          <li><code>/reload</code></li>
        </ol>
      </div>
      <div class="tab-content" data-tab="spells">
        <ol>
          <li><code>/suf</code></li>
          <li>Go to <strong>Aura Filters</strong></li>
          <li>Click <strong>Manage Aura Filters</strong></li>
          <li>Go to <strong>Whitelists → MOP → View</strong></li>
          <li>Add spell ID</li>
          <li><code>/reload</code></li>
        </ol>
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

/* --------------------------------------------------------------------------------
   Tab switching
   -------------------------------------------------------------------------------- */
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('tab-btn')) return;
  const card = e.target.closest('.instructions-card');
  const targetTab = e.target.dataset.tab;

  card.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');

  card.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  card.querySelector(`.tab-content[data-tab="${targetTab}"]`).classList.add('active');
});

/* --------------------------------------------------------------------------------
   Interactive UI map hotspots
   -------------------------------------------------------------------------------- */
function getScaleAndPosition(hotspot, coords) {
  const rect = image.getBoundingClientRect();
  const scaleX = rect.width / BASE_WIDTH;
  const scaleY = rect.height / BASE_HEIGHT;

  return {
    left: coords.x1 * scaleX,
    top: coords.y1 * scaleY,
    width: (coords.x2 - coords.x1) * scaleX,
    height: (coords.y2 - coords.y1) * scaleY
  };
}

function applyHotspotPosition(el, coords) {
  const pos = getScaleAndPosition(el, coords);
  el.style.left = `${pos.left}px`;
  el.style.top = `${pos.top}px`;
  el.style.width = `${pos.width}px`;
  el.style.height = `${pos.height}px`;
}

function positionTooltip(tooltip, hotspot, mouseEvent) {
  const hotspotRect = hotspot.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 10;

  let left = mouseEvent.clientX - (tooltipRect.width / 2);
  let top = hotspotRect.bottom + 10;

  if (left < padding) left = padding;
  if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }
  if (top + tooltipRect.height > window.innerHeight - padding) {
    top = hotspotRect.top - tooltipRect.height - 10;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function createHotspots() {
  // Clear existing
  wrapper.querySelectorAll('.hotspot').forEach(el => el.remove());
  document.querySelectorAll('.tooltip').forEach(el => el.remove());

  HOTSPOTS.forEach((spot, index) => {
    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot';
    hotspot.dataset.index = index;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.dataset.index = index;
    tooltip.innerHTML = `
      <span class="tooltip-text">${spot.name}</span>
      <span class="tooltip-hint">Click to open</span>
    `;

    document.body.appendChild(tooltip);
    wrapper.appendChild(hotspot);
    applyHotspotPosition(hotspot, spot.coords);

    hotspot.addEventListener('mouseenter', (e) => {
      document.querySelectorAll('.tooltip').forEach(t => t.classList.remove('show'));
      tooltip.classList.add('show');
      positionTooltip(tooltip, hotspot, e);
    });

    hotspot.addEventListener('mousemove', (e) => {
      if (tooltip.classList.contains('show')) {
        positionTooltip(tooltip, hotspot, e);
      }
    });

    hotspot.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });

    hotspot.addEventListener('click', () => {
      window.open(spot.url, '_blank', 'noopener');
    });
  });
}

function updateAllHotspots() {
  const hotspotElements = wrapper.querySelectorAll('.hotspot');
  hotspotElements.forEach((el, index) => {
    applyHotspotPosition(el, HOTSPOTS[index].coords);
  });
}

/* --------------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------------- */
renderItems(addons, 'addons-grid');
renderItems(weakauras, 'weakauras-grid');

image.addEventListener('load', createHotspots);
if (image.complete) createHotspots();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateAllHotspots, 100);
});
