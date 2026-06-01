# Haste Calculator Redesign — Alternative A: Unified Panel with Sticky Result

**Date:** 2026-06-01
**Status:** Proposal (for review)
**Scope:** Layout/UX redesign of `haste.html` + `css/haste.css`. No changes to `js/haste.js` calculation logic.

---

## Problem

The current Haste Calculator is three visually detached containers stacked vertically:

1. **Controls section** — Haste Rating input, Race selection, Active Buffs (4-group grid)
2. **Result card** — Effective Haste %, Shadowform note, WeakAura GIF + Wago import button
3. **Breakpoint table** — DoT Breakpoint Analysis rows

On **mobile**, this flow breaks down (see reference screenshot):

- Each spell row stacks tall and center-aligned: `icon → "6 ticks base" → "+0 ticks" → "8.32% / 1,345 rating" → progress bar`. One row is ~250px tall → three rows force heavy scrolling.
- The headline **Effective Haste %** — the value the user changes the input to watch — scrolls **off-screen** before the breakpoints are visible. Input and feedback are decoupled.
- The large WeakAura GIF card consumes vertical space between the result and the breakpoints, widening the gap.
- Three separate card surfaces read as three unrelated widgets, not one tool.

**Goal:** a single, unified, responsive surface that reflows from multi-column (desktop) to single-column (mobile) using the **same DOM order and same components** (CSS grid/flex only). Keep input and result coupled. Kill the tall-row scroll.

---

## Solution Summary

One unified panel. The Haste Rating input and the live Effective Haste % are **fused into a single result bar** at the top of the panel. On mobile this bar is **`position: sticky`** so the result is always on screen while the user scrolls the breakpoints. Controls sit inline. Breakpoint rows are compressed to a **single horizontal line each**. The WeakAura GIF is demoted to a compact import button.

### Layout (ASCII)

```
DESKTOP                                              MOBILE
┌──────────────────────────────────────────┐   ┌──────────────────────┐
│ ┌──────────┐  Rating[ 12562 ]  Race ◑    │   │╔════════════════════╗│ ← sticky
│ │  36.04%  │  Buffs ○PI ○BL ○SPD         │   │║ 36.04%  [12562]    ║│
│ │ EFFECTIVE│                              │   │║ EFFECTIVE HASTE    ║│
│ └──────────┘                              │   │╚════════════════════╝│
├──────────────────────────────────────────┤   │ Race ◑ Gob  ○ Troll  │
│ DOT BREAKPOINTS                           │   │ ○PI ○BL ○SPD         │
│ 🔥 SW:Pain   6+0  → 7.25% (911) ▓▓▓░░░░  │   ├──────────────────────┤
│ ✦ VTouch     5+0  → 8.90% (1580)▓▓▓▓░░░  │   │🔥 SWP  6+0 →7.25% ▓▓░│
│ ☠ DPlague   6+0  → 7.21% (896) ▓▓▓░░░░  │   │✦ VT   5+0 →8.90% ▓▓▓░│
├──────────────────────────────────────────┤   │☠ DP   6+0 →7.21% ▓▓░│
│ 📥 Import WeakAura from Wago.io           │   ├──────────────────────┤
└──────────────────────────────────────────┘   │ 📥 Import Wago WA    │
                                                └──────────────────────┘
```

---

## Components & Responsibilities

One outer surface: `.haste-panel`. Four internal zones, in this DOM order (order is the same desktop and mobile — CSS only reflows):

### 1. Result Bar — `.haste-resultbar`
- **Purpose:** fuse the input and the headline result so the feedback loop is one unit.
- **Contains:** the big `#hasteResult` value + "EFFECTIVE HASTE" label (left), the `#hasteInput` Rating field, race toggles, and buff toggles (right, wrapping).
- **Desktop:** horizontal — result block pinned left, controls fill remaining width, wrapping as needed.
- **Mobile:** result value + input on the first line; race + buffs wrap below. The whole bar is `position: sticky; top: <nav height>` so it stays visible while breakpoints scroll.
- **Depends on:** existing `#hasteInput`, `#hasteResult`, all existing checkbox IDs (`goblinRacial`, `trollRacial`, `powerInfusion`, `berserking`, `bloodlust`, `sinisterPrimal`) — unchanged, so `js/haste.js` keeps working untouched.
- Keeps the Shadowform note and the GCD-cap warning (`#gcdWarningInput`) — placed under the result value, compact.

### 2. Breakpoints header — `.haste-bp-header`
- Static "DOT BREAKPOINT ANALYSIS" title. Visual divider between zones (the unified panel uses internal dividers, not separate cards).

### 3. Breakpoint rows — `#spellsContainer` (existing)
- **Purpose:** one scannable line per DoT.
- **Row becomes a horizontal flex/grid line** at all breakpoints: `icon + name | base ticks | +N badge | next-BP % (rating) | progress bar`.
- **Mobile compaction:** abbreviate where space-constrained (name can truncate or use short form), keep the `+N` badge and progress bar inline. Target ≤ ~64px row height on mobile (down from ~250px).
- The existing breakpoint **explainer paragraph** stays at the bottom of this container.

### 4. WeakAura import — `.haste-wa`
- **Purpose:** offer the Wago import without consuming a full result-card-sized GIF block.
- Demote the large animated GIF to a single **"Import WeakAura from Wago.io"** button (the Wago icon + label that already exists). Optionally keep the GIF as a small thumbnail or behind the link — the GIF is not load-bearing for the calculator.

---

## Reflow Mechanics (same DOM, CSS only)

- Outer `.haste-panel`: CSS grid, one column. Internal zones are grid rows separated by `border-top` dividers (the "one surface" look).
- `.haste-resultbar`: `display: flex; flex-wrap: wrap; align-items: center; gap`. Desktop the result block has a fixed min-width and controls flex to fill; mobile the flex items wrap to stacked lines.
- Sticky behavior is **mobile-only** via media query (`@media (max-width: 768px)`): `position: sticky; top: 64px;` (matches `.top-nav` height of 64px) with the panel background + a subtle bottom shadow so rows scroll under it cleanly.
- Spell rows: switch from the current vertical-stack to `display: grid` with named/fractional columns; collapse column count and font sizes at the mobile breakpoint. No JS change — `updateSpellTable()` already emits the row markup; we restyle the existing class hooks (`.spell-row`, `.spell-info`, `.base-ticks`, `.ticks-badge`, `.breakpoint-info`, `.progress-container`).

---

## Constraints / Non-Goals

- **No JS logic changes.** `js/haste.js` computes haste and emits row HTML; this redesign only restyles and re-containers. All element IDs and class names the JS reads/writes are preserved. (If a wrapper element must be renamed, the JS reference is updated 1:1 — but the goal is zero JS edits.)
- **Same components, reflow only** (per decision). No mobile-only tabs/accordions/distinct widgets.
- Reuse existing design tokens from `css/base.css` (`--card-bg`, `--accent-color`, `--glass-bg`, etc.). No new color system.
- Preserve all Wowhead tooltip hooks (`data-wowhead`) and `$WowheadPower.refreshLinks()` compatibility.
- Preserve accessibility: `aria-live="polite"` on the result, `aria-label`s, focus-visible, reduced-motion.

---

## Acceptance Criteria

1. Desktop: input, result, and breakpoints read as **one panel** (single surface, internal dividers — not three detached cards).
2. Mobile: the **Effective Haste % stays visible** (sticky) while scrolling the breakpoint rows.
3. Mobile: each spell row is a **single horizontal line** (≤ ~64px tall), no center-stacked towers.
4. DOM order unchanged; the reflow is **pure CSS**. `js/haste.js` runs unmodified (or with at most a 1:1 selector rename).
5. WeakAura is reachable via a compact button; it no longer pushes the breakpoints down with a large GIF block.
6. Existing tokens, fonts, tooltips, and a11y behavior preserved.

---

## Out of Scope (other alternatives, for reference)

- **Alternative B** — Two-pane workbench (left input rail / right table) → stacked cockpit on mobile. More spreadsheet-like.
- **Alternative C** — Full-width hero result + inline control strip + breakpoint card grid (`auto-fit`).

These were presented during brainstorming and are not part of this proposal.
