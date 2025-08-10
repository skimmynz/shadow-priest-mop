// app-stub.js
// Minimal stub to prove CSS & DOM wiring without hitting your Netlify function.
// Safe to delete once your real "script 6.js" is working.

document.addEventListener('DOMContentLoaded', () => {
  // Update last updated
  const stamp = new Date().toLocaleString();
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) lastUpdatedEl.textContent = `Last updated: ${stamp}`;

  // Add placeholder raid tabs
  const raidMenu = document.getElementById('raid-menu');
  if (raidMenu) {
    ['MSV', 'HoF', 'ToES'].forEach((label, i) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (i === 0) b.classList.add('active');
      raidMenu.appendChild(b);
    });
  }

  // Add a couple of placeholder boss buttons
  const bossButtons = document.getElementById('boss-buttons');
  if (bossButtons) {
    const bosses = [
      { id: 1395, name: 'The Stone Guard' },
      { id: 1390, name: 'Feng the Accursed' },
      { id: 1434, name: "Gara'jal the Spiritbinder" },
    ];
    for (const {id, name} of bosses) {
      const btn = document.createElement('button');
      btn.dataset.encounterId = String(id);
      const img = document.createElement('img');
      img.src = `https://assets.rpglogs.com/img/warcraft/bosses/${id}-icon.jpg?v=2`;
      img.alt = name;
      img.className = 'boss-icon';
      const span = document.createElement('span');
      span.textContent = name;
      btn.append(img, span);
      bossButtons.appendChild(btn);
    }
    if (bossButtons.firstElementChild) {
      bossButtons.firstElementChild.classList.add('active');
    }
  }

  // Add a simple talent-summary row (icons + percents)
  const summary = document.querySelector('.talent-summary');
  if (summary) {
    const row = document.createElement('div');
    row.className = 'talent-row';
    row.innerHTML = `
      <a class="talent-link is-top" href="https://www.wowhead.com/mop-classic/spell=109142" target="_blank" rel="noopener" title="Twist of Fate">
        <img class="talent-icon-img" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_shadow_mindtwisting.jpg" alt="Twist of Fate"/>
        <span class="talent-percent">62%</span>
      </a>
      <a class="talent-link" href="https://www.wowhead.com/mop-classic/spell=10060" target="_blank" rel="noopener" title="Power Infusion">
        <img class="talent-icon-img" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_holy_powerinfusion.jpg" alt="Power Infusion"/>
        <span class="talent-percent">31%</span>
      </a>
      <a class="talent-link" href="https://www.wowhead.com/mop-classic/spell=109175" target="_blank" rel="noopener" title="Divine Insight">
        <img class="talent-icon-img" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_burningwill.jpg" alt="Divine Insight"/>
        <span class="talent-percent">7%</span>
      </a>`;
    summary.appendChild(row);
  }

  // Trigger Wowhead tooltip refresh if available
  if (window.$WowheadPower && typeof window.$WowheadPower.refreshLinks === 'function') {
    window.$WowheadPower.refreshLinks();
  }
});
