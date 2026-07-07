# T15 Archive + T16 Guide Design

**Date:** 2026-07-07
**Status:** Approved v2 (supersedes v1 — archive is now a full-page rename, not
tier-sections-only; Way 2 presentation chosen)

## Goal

Archive the Throne of Thunder (T15) guide as its own page and rebuild the live
guide for Siege of Orgrimmar (T16), with first-class cross-navigation so users
always find the live guide and can still read the T15 material. SoO is the
final MoP raid — one-time archive, no generalized tier system.

## Decisions

- **Full-page rename:** `git mv guide.html guide-t15.html` (preserves history).
  Archive keeps all five sections including Rotation and Macros as a faithful
  snapshot. New `guide.html` is created fresh, carrying over Rotation and
  Macros verbatim.
- **Way 2 presentation:** static tier pill switcher on both pages, boss-tagged
  swap chips in Talents, BiS with featured secondaries + compact list.
- **T16 Tips:** "Coming Soon" placeholder card.
- **Owner-supplied content only** — talent text, EP values, and BiS numbers
  below are the owner's data, no invented numbers.

## Deliverables

### 1. Tier pill switcher (both pages)

Static link pills at the top of the guide content column, zero JS:

```
[ ◉ T16 · Siege of Orgrimmar ]  [ ○ T15 · Throne of Thunder — Archive ]
```

- Active pill styled per page; inactive pill is a plain `<a>` to the other page.
- On `guide-t15.html`, pair with a slim archive banner: "Archived — Throne of
  Thunder (T15) era guide" + link to live guide.

### 2. `guide-t15.html` (renamed archive)

- Content unchanged except: pills + archive banner added; `<title>` →
  "Shadow Priest T15 Guide (Archive) | Throne of Thunder | skimmynz";
  description/OG updated to say archived T15 guide; canonical
  `https://skimmynz.com/guide-t15`; nav "Guide" link still points to `/guide`
  (not self-active).
- Video column, TOC, scrollspy, boss rail all stay as-is.

### 3. New `guide.html` (T16)

Same layout skeleton (video column, TOC rail, mobile Jump-to, FAB, inline JS).

**Talents** — subheading "Default Raid Build". Six tier rows, same
`talent-tier-row` markup; default cell `.active`; swap talents get an
`.optional` cell state plus boss-tagged swap chips under the tier text:

| Tier | Default | Text | Swaps (chips) |
|---|---|---|---|
| 15 | Void Tendrils | Useful for dealing with adds. | — |
| 30 | Angelic Feather | No longer a wheelchair class. Far stronger than the Retail version. | — |
| 45 | Solace and Insanity | Strongest single-target option. | — |
| 60 | Angelic Bulwark | Passive shield that procs at low health. | Spectral Guise ([spell=112833]) on Siegecrafter Blackfuse to cancel Launch Sawblade ([spell=143291]); on Paragons of the Klaxxi to cancel Aim ([spell=142948]) and Mesmerize ([spell=142671]) |
| 75 | Twist of Fate | Snipe low-health adds with Shadow Word: Pain and Shadow Word: Death to maintain high uptime. | Divine Insight ([spell=109175]) on Iron Juggernaut, Thok the Bloodthirsty, Paragons of the Klaxxi |
| 90 | Halo | Default at 20+ yards. | Divine Star on Norushen, Thok, Garrosh |

All talent/boss names link to `wowhead.com/mop-classic/...` per existing
convention.

**Rotation & Macros** — copied verbatim from the current guide (owner's
instruction; the Unerring Vision of Lei Shen note is retained as-is).

**Stats** — priority chain row and WowSims CTA retained. Two blocks:

- *T16 Preset BiS* (featured secondaries as bars, same `stat-bar-row` style):
  - Haste 17,232 (47.57%) — hero row, links `/haste?rating=17232`
  - Mastery 15,210 (60.03%)
  - Crit 8,694 (32.88%)
  - Hit 3,363 (15.07%)
  - Compact key-value list beneath: Health 694,699 · Mana 300,000 ·
    Stamina 39,164 · Intellect 30,774 · Spirit 3,520 · Spell Power 55,763 ·
    Expertise 1,760 (5.18%)
- *Stat Weights (EP)* — note "Item Level ≥ 560"; bars sorted descending:
  Spirit 1.51, Hit 1.45, Intellect 1.00, Haste 1.00, Mastery 0.75, Crit 0.74,
  Spell Power 0.73.

**T16 Tips** — section id `soo-tips`, heading "T16 Tips". Coming Soon card:
SoO-flavored empty state + line linking to the T15 tips on the archive page
("Boss tips are being written — read the T15 tips in the meantime"). TOC,
mobile menu, and scrollspy label map use `soo-tips` / "T16 Tips".

**Metadata** — description/OG updated to mention Siege of Orgrimmar; canonical
stays `https://skimmynz.com/guide`.

### 4. CSS (`guide.css` additions)

`.tier-pills`, `.tier-pill(--active)`, `.archive-banner`, `.talent-cell.optional`,
`.talent-swaps` chip row, `.stats-compact` key-value list, `.coming-soon` card.
Match existing dark theme tokens; no new CSS file.

### 5. Routing

`/guide-t15` served extensionless like other pages; verify against
`netlify.toml` during build, add redirect only if needed.

## Risks

- Anchor `#tot-tips` no longer on live page (now `#soo-tips`) — acceptable,
  fragment traffic negligible; archive page still has `#tot-tips`.
- Rotation retains a T15 trinket note (UVLS) by explicit owner instruction —
  revisit when owner supplies T16 rotation updates.

## Testing

- Both pages: pills navigate correctly, active states right; Wowhead tooltips
  fire on new talent/swap links; scrollspy + mobile Jump-to track sections;
  archive page boss rail/accordions still work; macro copy buttons work on both.
- Haste breakpoint link carries `?rating=17232`.
- No console errors; mobile layout for pills/chips/compact list wraps cleanly.

## Out of scope

- T16 boss tips content (future task once written).
- T14 archive, tier tabs, data-driven refactor, Broadcast Overlay redesign.
