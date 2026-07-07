# T15 Archive + T16 Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the current guide as `guide-t15.html` and rebuild `guide.html` for Siege of Orgrimmar (T16) with a tier pill switcher, per spec `docs/superpowers/specs/2026-07-07-t15-archive-t16-guide-design.md`.

**Architecture:** Static site. `git mv` preserves history for the archive; the new live page is a copy with three sections replaced (Talents, Stats, Tips) and head metadata updated. Both pages get a static two-pill tier switcher (plain links, no JS). All new styles append to `css/guide.css` using existing tokens from `css/base.css`.

**Tech Stack:** Plain HTML/CSS/JS, Netlify redirects, Wowhead tooltip widget (auto-decorates `wowhead.com` links — no extra wiring needed).

**No test framework exists** — verification is grep assertions plus a browser pass (Task 8). Site stays deployable after every task.

---

### Task 1: Rename to archive, recreate live file, add redirect

**Files:**
- Rename: `guide.html` → `guide-t15.html`
- Create: `guide.html` (identical copy for now)
- Modify: `netlify.toml` (append)

- [ ] **Step 1: Rename with history, copy back**

```bash
cd /workspaces/shadow-priest-mop
git mv guide.html guide-t15.html
cp guide-t15.html guide.html
git add guide.html
```

- [ ] **Step 2: Append redirect to `netlify.toml`** (after the existing `/guide` redirect block, same style):

```toml

[[redirects]]
  from = "/guide-t15"
  to = "/guide-t15.html"
  status = 200
```

- [ ] **Step 3: Verify**

Run: `git status --short && grep -A2 'from = "/guide-t15"' netlify.toml`
Expected: `R  guide.html -> guide-t15.html`, `A  guide.html`, `M netlify.toml`; redirect block printed.

- [ ] **Step 4: Commit**

```bash
git commit -am "Archive guide as guide-t15.html, recreate guide.html, add redirect"
```

---

### Task 2: CSS for pills, banner, optional talents, swap chips, compact stats, coming-soon

**Files:**
- Modify: `css/guide.css` (append at end of file)

- [ ] **Step 1: Append this block to the end of `css/guide.css`:**

```css

/* ═══════════════════════════════════════════════════════
   T16 additions — tier pills, archive banner, talent swaps,
   compact BiS list, coming-soon card
   ═══════════════════════════════════════════════════════ */

/* ── Tier pills (live ↔ archive switcher) ─────────────── */
.tier-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.tier-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.2s ease, color 0.2s ease;
}

a.tier-pill:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.tier-pill--active {
  background: rgba(124, 58, 237, 0.15);
  border-color: var(--accent-color);
  color: var(--text-accent);
}

/* ── Archive banner (guide-t15 only) ──────────────────── */
.archive-banner {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.archive-banner strong {
  color: var(--warning-color);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.archive-banner a {
  margin-left: auto;
  color: var(--text-accent);
  font-weight: 600;
  text-decoration: none;
}

.archive-banner a:hover {
  text-decoration: underline;
}

/* ── Optional talent pick (amber, vs green default) ───── */
.talent-cell.optional {
  opacity: 1;
  border-color: var(--warning-color);
  box-shadow: 0 0 0 2px var(--warning-color), 0 4px 12px var(--warning-glow);
}

/* ── Boss-swap chips under a talent tier ──────────────── */
.talent-swaps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.talent-swaps-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warning-color);
}

.talent-swap-chip {
  display: inline-block;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card-bg);
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

/* ── Compact BiS extras list ──────────────────────────── */
.stats-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.stats-compact strong {
  color: var(--text-secondary);
  font-weight: 600;
}

/* ── EP block note ────────────────────────────────────── */
.stats-ep-note {
  margin: -0.4rem 0 0.6rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── Coming Soon card (T16 Tips) ──────────────────────── */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  border: 1px dashed var(--border-hover);
  border-radius: 14px;
  background: var(--card-bg);
  text-align: center;
}

.coming-soon svg {
  width: 34px;
  height: 34px;
  stroke: var(--text-accent);
}

.coming-soon-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.coming-soon-text {
  max-width: 46ch;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.coming-soon-text a {
  color: var(--text-accent);
  font-weight: 600;
  text-decoration: none;
}

.coming-soon-text a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 2: Verify**

Run: `grep -c "tier-pill\|archive-banner\|talent-swap\|stats-compact\|coming-soon" css/guide.css`
Expected: count ≥ 20 (selectors present).

- [ ] **Step 3: Commit**

```bash
git commit -am "Add CSS for tier pills, archive banner, talent swaps, compact stats, coming-soon"
```

---

### Task 3: Archive page — metadata, banner, pills

**Files:**
- Modify: `guide-t15.html` (head lines ~7–31, and just after `<main class="guide-content">` ~line 154)

- [ ] **Step 1: Replace head metadata.** Exact replacements (old → new):

`<meta name="description" ...>`:
```html
<meta name="description" content="Archived Shadow Priest guide for Throne of Thunder (T15) in MoP Classic — Talents, Rotation, Macros, Stats and boss-by-boss raid tips.">
```

`<title>`:
```html
<title>Shadow Priest T15 Guide (Archive) | Throne of Thunder | skimmynz</title>
```

`<link rel="canonical" ...>`:
```html
<link rel="canonical" href="https://skimmynz.com/guide-t15">
```

`<meta property="og:title" ...>`:
```html
<meta property="og:title" content="Shadow Priest T15 Guide (Archive) | Throne of Thunder">
```

`<meta property="og:description" ...>`:
```html
<meta property="og:description" content="Archived Shadow Priest guide for Throne of Thunder (T15) in MoP Classic — Talents, Rotation, Macros, Stats and boss-by-boss raid tips.">
```

`<meta property="og:url" ...>`:
```html
<meta property="og:url" content="https://skimmynz.com/guide-t15">
```

`<meta name="twitter:title" ...>`:
```html
<meta name="twitter:title" content="Shadow Priest T15 Guide (Archive) | Throne of Thunder">
```

`<meta name="twitter:description" ...>`:
```html
<meta name="twitter:description" content="Archived Shadow Priest guide for Throne of Thunder (T15) in MoP Classic — Talents, Rotation, Macros, Stats and boss-by-boss raid tips.">
```

- [ ] **Step 2: Insert banner + pills** immediately after the line `<main class="guide-content">`:

```html

    <div class="archive-banner">
      <strong>Archived</strong>
      <span>Throne of Thunder (T15) era guide — frozen for reference.</span>
      <a href="/guide">Go to the live T16 guide →</a>
    </div>

    <div class="tier-pills" aria-label="Guide version">
      <a class="tier-pill" href="/guide">T16 · Siege of Orgrimmar</a>
      <span class="tier-pill tier-pill--active">T15 · Throne of Thunder — Archive</span>
    </div>
```

- [ ] **Step 3: Verify**

Run: `grep -c "archive-banner\|tier-pill" guide-t15.html && grep -c "skimmynz.com/guide-t15" guide-t15.html`
Expected: 5 (1 banner + 4 pill occurrences) and 2 (canonical + og:url).

- [ ] **Step 4: Commit**

```bash
git commit -am "Mark guide-t15 as archive: metadata, banner, tier pills"
```

---

### Task 4: Live page — metadata + pills (T16 active)

**Files:**
- Modify: `guide.html` (head + after `<main class="guide-content">`)

- [ ] **Step 1: Replace head metadata.** Only the three description strings change (title/canonical/og:url stay):

`<meta name="description" ...>`, `<meta property="og:description" ...>`, `<meta name="twitter:description" ...>` all become:
```html
content="Master Shadow Priest in MoP Classic with a complete PvE guide covering Talents, Rotation, Macros, Stats and Siege of Orgrimmar raid tips."
```

- [ ] **Step 2: Insert pills** immediately after the line `<main class="guide-content">`:

```html

    <div class="tier-pills" aria-label="Guide version">
      <span class="tier-pill tier-pill--active">T16 · Siege of Orgrimmar</span>
      <a class="tier-pill" href="/guide-t15">T15 · Throne of Thunder — Archive</a>
    </div>
```

- [ ] **Step 3: Verify**

Run: `grep -c "tier-pill" guide.html && grep -c "Siege of Orgrimmar raid tips" guide.html`
Expected: 4 and 3.

- [ ] **Step 4: Commit**

```bash
git commit -am "guide.html: SoO metadata and tier pills"
```

---

### Task 5: Live page — T16 Talents section

**Files:**
- Modify: `guide.html` — inside `<section class="guide-section" id="talents">`: add a subheading after the panel title, replace the whole `<div class="talent-build">…</div>` block.

- [ ] **Step 1: Add subheading.** Directly after the closing `</h2>` of the Talents panel title, insert:

```html
        <h3 class="rot-section-heading">Default Raid Build</h3>
```

- [ ] **Step 2: Replace the whole `<div class="talent-build">…</div>` block with:**

```html
        <div class="talent-build">
          <div class="talent-tier-row">
            <span class="talent-tier-label">15</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=108920" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_voidtendrils.jpg" alt="Void Tendrils"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=108921" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_psyfiend.jpg" alt="Psyfiend"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=605" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_shadow_shadowworddominate.jpg" alt="Dominate Mind"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=108920">Void Tendrils</a></strong>
              <p>Useful for dealing with adds.</p>
            </div>
          </div>

          <div class="talent-tier-row">
            <span class="talent-tier-label">30</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=64129" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_holy_symbolofhope.jpg" alt="Body and Soul"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=121536" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_angelicfeather.jpg" alt="Angelic Feather"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=108942" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_phantasm.jpg" alt="Phantasm"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=121536">Angelic Feather</a></strong>
              <p>No longer a wheelchair class. Far stronger than the <a href="https://www.wowhead.com/spell=121536">Retail</a> version.</p>
            </div>
          </div>

          <div class="talent-tier-row">
            <span class="talent-tier-label">45</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=109186" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_holy_surgeoflight.jpg" alt="From Darkness, Comes Light"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=123040" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_shadow_soulleech_3.jpg" alt="Mindbender"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=129250" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_flashoflight.jpg" alt="Solace and Insanity"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=129250">Solace and Insanity</a></strong>
              <p>Strongest single-target option.</p>
            </div>
          </div>

          <div class="talent-tier-row">
            <span class="talent-tier-label">60</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=19236" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_holy_testoffaith.jpg" alt="Desperate Prayer"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=112833" class="talent-cell optional"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_spectralguise.jpg" alt="Spectral Guise"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=108945" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_angelicbulwark.jpg" alt="Angelic Bulwark"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=108945">Angelic Bulwark</a></strong>
              <p>Passive shield that procs at low health.</p>
              <div class="talent-swaps">
                <span class="talent-swaps-label">Swap</span>
                <span class="talent-swap-chip"><a href="https://www.wowhead.com/mop-classic/spell=112833">Spectral Guise</a> on Siegecrafter Blackfuse — cancels <a href="https://www.wowhead.com/mop-classic/spell=143291">Launch Sawblade</a></span>
                <span class="talent-swap-chip"><a href="https://www.wowhead.com/mop-classic/spell=112833">Spectral Guise</a> on Paragons of the Klaxxi — cancels <a href="https://www.wowhead.com/mop-classic/spell=142948">Aim</a> and <a href="https://www.wowhead.com/mop-classic/spell=142671">Mesmerize</a></span>
              </div>
            </div>
          </div>

          <div class="talent-tier-row">
            <span class="talent-tier-label">75</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=109142" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_shadow_mindtwisting.jpg" alt="Twist of Fate"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=10060" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_holy_powerinfusion.jpg" alt="Power Infusion"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=109175" class="talent-cell optional"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_burningwill.jpg" alt="Divine Insight"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=109142">Twist of Fate</a></strong>
              <p>Snipe low-health adds with <a href="https://www.wowhead.com/mop-classic/spell=589">Shadow Word: Pain</a> and <a href="https://www.wowhead.com/mop-classic/spell=32379">Shadow Word: Death</a> to maintain high uptime.</p>
              <div class="talent-swaps">
                <span class="talent-swaps-label">Swap</span>
                <span class="talent-swap-chip"><a href="https://www.wowhead.com/mop-classic/spell=109175">Divine Insight</a> on Iron Juggernaut, Thok the Bloodthirsty and Paragons of the Klaxxi</span>
              </div>
            </div>
          </div>

          <div class="talent-tier-row">
            <span class="talent-tier-label">90</span>
            <div class="talent-tier-icons">
              <a href="https://www.wowhead.com/mop-classic/spell=121135" class="talent-cell"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_cascade.jpg" alt="Cascade"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=110744" class="talent-cell optional"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/spell_priest_divinestar.jpg" alt="Divine Star"></a>
              <a href="https://www.wowhead.com/mop-classic/spell=120517" class="talent-cell active"><img loading="lazy" src="https://assets.rpglogs.com/img/warcraft/abilities/ability_priest_halo.jpg" alt="Halo"></a>
            </div>
            <div class="talent-tier-text">
              <strong class="talent-explain-name"><a href="https://www.wowhead.com/mop-classic/spell=120517">Halo</a></strong>
              <p>Default at 20+ yards.</p>
              <div class="talent-swaps">
                <span class="talent-swaps-label">Swap</span>
                <span class="talent-swap-chip"><a href="https://www.wowhead.com/mop-classic/spell=110744">Divine Star</a> on Norushen, Thok and Garrosh</span>
              </div>
            </div>
          </div>

        </div>
```

- [ ] **Step 3: Verify**

Run: `grep -c "talent-swap-chip" guide.html && grep -c "talent-cell optional" guide.html && grep -c "Blessed Loa Spirit" guide.html`
Expected: 4, 3, 0 (no leftover ToT references in Talents).

- [ ] **Step 4: Commit**

```bash
git commit -am "guide.html: T16 talents with default build and boss swap chips"
```

---

### Task 6: Live page — T16 Stats section

**Files:**
- Modify: `guide.html` — inside `<section class="guide-section" id="stats">`, replace the two `<div class="stats-block">…</div>` blocks inside `<div class="stats-grid">`. The priority chain row and WowSims CTA above them stay unchanged.

- [ ] **Step 1: Replace both stats blocks with:**

```html
            <!-- T16 BiS -->
            <div class="stats-block">
              <h3 class="stats-block-heading">T16 Preset BiS</h3>
              <div class="stats-bars">
                <div class="stat-bar-row stat-bar-row--hero">
                  <div class="stat-bar-header">
                    <span class="stat-bar-name">Haste</span>
                    <a href="/haste?rating=17232" class="stat-bar-link" title="Check haste breakpoints at 17,232">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Haste Breakpoints
                    </a>
                  </div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:100%"></div></div>
                  <div class="stat-bar-meta">
                    <span class="stat-bar-pct">47.57%</span>
                    <span class="stat-bar-val">17,232</span>
                  </div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Mastery</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:88.3%"></div></div>
                  <div class="stat-bar-meta">
                    <span class="stat-bar-pct">60.03%</span>
                    <span class="stat-bar-val">15,210</span>
                  </div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Crit</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:50.5%"></div></div>
                  <div class="stat-bar-meta">
                    <span class="stat-bar-pct">32.88%</span>
                    <span class="stat-bar-val">8,694</span>
                  </div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Hit</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:19.5%"></div></div>
                  <div class="stat-bar-meta">
                    <span class="stat-bar-pct">15.07%</span>
                    <span class="stat-bar-val">3,363</span>
                  </div>
                </div>
              </div>
              <div class="stats-compact">
                <span><strong>Health</strong> 694,699</span>
                <span><strong>Mana</strong> 300,000</span>
                <span><strong>Stamina</strong> 39,164</span>
                <span><strong>Intellect</strong> 30,774</span>
                <span><strong>Spirit</strong> 3,520</span>
                <span><strong>Spell Power</strong> 55,763</span>
                <span><strong>Expertise</strong> 1,760 (5.18%)</span>
              </div>
            </div>

            <!-- Stat Weights -->
            <div class="stats-block">
              <h3 class="stats-block-heading">Stat Weights (EP)</h3>
              <p class="stats-ep-note">Item Level ≥ 560</p>
              <div class="stats-bars">
                <div class="stat-bar-row stat-bar-row--highlight">
                  <div class="stat-bar-header"><span class="stat-bar-name">Spirit</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:100%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">1.51</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Hit</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:96%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">1.45</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Intellect</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:66%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">1.00</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Haste</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:66%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">1.00</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Mastery</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:50%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">0.75</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Crit</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:49%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">0.74</span></div>
                </div>
                <div class="stat-bar-row">
                  <div class="stat-bar-header"><span class="stat-bar-name">Spell Power</span></div>
                  <div class="stat-bar-track"><div class="stat-bar-fill" style="width:48%"></div></div>
                  <div class="stat-bar-meta"><span class="stat-bar-val">0.73</span></div>
                </div>
              </div>
            </div>
```

Notes: BiS bar widths are rating ÷ 17,232 (haste), matching the old page's convention; EP widths are value ÷ 1.51. The old crit caption about Unerring Vision of Lei Shen (T15 trinket) is intentionally dropped from Stats.

- [ ] **Step 2: Verify**

Run: `grep -c "17,232\|15,210\|8,694\|3,363" guide.html && grep -c "rating=17232" guide.html`
Expected: ≥ 4 and 1. Also `grep -c "Unerring Vision" guide.html` = 2 (both in Rotation — retained per spec).

- [ ] **Step 3: Commit**

```bash
git commit -am "guide.html: T16 preset BiS and EP stat weights"
```

---

### Task 7: Live page — T16 Tips (Coming Soon) + TOC/scrollspy

**Files:**
- Modify: `guide.html` — replace `<section class="guide-section" id="tot-tips">…</section>` entirely; update mobile TOC, desktop TOC, scrollspy labels.

- [ ] **Step 1: Replace the whole `tot-tips` section with:**

```html
    <!-- T16 Tips -->
    <section class="guide-section" id="soo-tips">
      <div class="guide-panel-body">
        <h2 class="guide-panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          T16 Tips
        </h2>
        <div class="coming-soon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h12M6 22h12M8 2v4l4 4 4-4V2M8 22v-4l4-4 4 4v4"/></svg>
          <p class="coming-soon-title">Boss tips coming soon</p>
          <p class="coming-soon-text">Siege of Orgrimmar boss-by-boss tips are being written. In the meantime, read the <a href="/guide-t15#tot-tips">T15 boss tips</a> in the archive.</p>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: Update mobile TOC.** In `<ul class="guide-toc-mobile-menu">`, replace:

```html
<li><a href="#tot-tips">T15 Tips</a></li>
```
with:
```html
<li><a href="#soo-tips">T16 Tips</a></li>
```

- [ ] **Step 3: Update desktop TOC.** Replace the `tot-tips` link with:

```html
        <a href="#soo-tips" class="guide-toc-link" data-toc="soo-tips">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          T16 Tips
        </a>
```

- [ ] **Step 4: Update scrollspy label map.** In the inline script, replace:

```js
var labels = { talents: 'Talents', rotation: 'Rotation', macros: 'Macros', stats: 'Stats', 'tot-tips': 'T15 Tips' };
```
with:
```js
var labels = { talents: 'Talents', rotation: 'Rotation', macros: 'Macros', stats: 'Stats', 'soo-tips': 'T16 Tips' };
```

Leave the boss-rail click handler script in place — it no-ops when no `.boss-rail-item` elements exist, and keeping it identical to the archive page minimizes diff noise.

- [ ] **Step 5: Verify**

Run: `grep -c "tot-tips" guide.html && grep -c "soo-tips" guide.html && grep -c "boss-accordion" guide.html`
Expected: 1 (only the `/guide-t15#tot-tips` cross-link), 4, 0.

- [ ] **Step 6: Commit**

```bash
git commit -am "guide.html: T16 Tips coming-soon section, TOC and scrollspy updates"
```

---

### Task 8: Browser verification

**Files:** none (verification only)

- [ ] **Step 1: Serve locally**

```bash
cd /workspaces/shadow-priest-mop && python3 -m http.server 8080
```

- [ ] **Step 2: Check `http://localhost:8080/guide.html`**
- Pills render, T16 active; T15 pill href is `/guide-t15` (extensionless path only resolves on Netlify — check the href, not the click, locally)
- Talents: green default per tier, amber optional cells on tiers 60/75/90, swap chips wrap cleanly at narrow width
- Stats: Haste hero bar links to `/haste?rating=17232`; compact list renders under BiS bars
- T16 Tips: coming-soon card with archive link
- TOC + mobile Jump-to show "T16 Tips"; scrollspy highlights sections while scrolling
- Wowhead tooltips fire on new talent/swap links; zero console errors

- [ ] **Step 3: Check `http://localhost:8080/guide-t15.html`**
- Archive banner + pills render, T15 active, T16 pill href `/guide`
- All five sections intact; boss rail/accordion switching works; macro copy buttons work
- Title shows "(Archive)"; zero console errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "Fix browser verification findings" # only if fixes were needed
```

---

## Self-Review

- **Spec coverage:** pills both pages (T3/T4), archive metadata + banner (T3), talents framework incl. tier-15 Void Tendrils default (T5), stats featured secondaries + compact list + EP note (T6), coming-soon + `soo-tips` TOC/scrollspy (T7), redirect (T1), CSS (T2), testing (T8). Rotation/Macros carried over verbatim via the Task 1 copy. ✓
- **Placeholders:** none — every step has complete code/commands. ✓
- **Consistency:** class names in T5–T7 HTML match T2 CSS (`talent-cell optional`, `talent-swaps`, `talent-swap-chip`, `stats-compact`, `stats-ep-note`, `coming-soon*`, `tier-pill*`, `archive-banner`). ✓
