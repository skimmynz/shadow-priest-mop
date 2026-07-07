# T15 Archive + T16 Guide Design

**Date:** 2026-07-07
**Status:** Approved (approach B, tier-sections-only scope)

## Goal

Archive the Throne of Thunder (T15) tier-specific guide content and convert the live
guide page to Siege of Orgrimmar (T16). SoO is the final MoP raid, so this is a
one-time archive — no generalized multi-tier system needed.

## Decisions

- **Approach B — separate archive page.** Chosen over in-page tier tabs (SEO: two
  URLs rank two search intents; `/guide` keeps its URL and backlinks) and over a
  data-driven refactor (overkill for the final tier).
- **Archive scope: tier sections only.** Talents, Stats, T15 Tips. Rotation and
  Macros live only on the current guide and get updated for T16.
- **T16 content supplied by the site owner.** Structure is built first; each
  section's content (talent picks, BiS stats, boss tips) is filled in from
  owner-provided data. No invented numbers.

## Deliverables

### 1. New page: `guide-t15.html`

- Copied nav/head/footer from `guide.html`, then only three sections:
  **Talents**, **Stats**, **T15 Tips** — content byte-identical to the current
  live sections (frozen).
- Archive banner at top: labels the page as the archived Throne of Thunder (T15)
  guide, links back to the live guide (`/guide`).
- Own metadata: title "Shadow Priest T15 Guide (Archive) | Throne of Thunder",
  matching description/OG tags, canonical `https://skimmynz.com/guide-t15`.
- No video column (video targets the current guide). Trimmed TOC: Talents,
  Stats, T15 Tips only. Scrollspy/mobile-TOC labels updated to match.
- Keeps Wowhead tooltip script and existing `guide.css` classes — no new CSS
  file; archive banner styles added to `guide.css`.

### 2. `guide.html` becomes T16

- **Talents section:** same tier-row structure; boss callouts in explanations
  swap from ToT bosses to SoO bosses (owner content).
- **Stats section:** "T15 BiS" block becomes "T16 BiS" with new values (owner
  content); stat weights updated if owner supplies new EP values, otherwise
  kept.
- **Tips section:** id `tot-tips` → `soo-tips`; heading "T15 Tips" → "T16 Tips";
  boss rail + accordions rebuilt for the 14 SoO encounters in `js/tiers.js`
  (Immerseus → Garrosh Hellscream). Boss icons follow the existing pattern
  `https://assets.rpglogs.com/img/warcraft/bosses/<id>-icon.jpg` where `<id>` is
  the tiers.js encounter id minus the leading 5 (51602 → 1602); verify one URL
  during build. Tip text per boss is owner content; until provided, accordion
  bodies ship with structure and owner fills them.
- **Rotation & Macros:** remain on the live page. T15-specific references
  (Unerring Vision of Lei Shen prepull note) replaced with T16 equivalents
  (owner content).
- **TOC/scrollspy:** anchors and label maps updated (`tot-tips` → `soo-tips`,
  "T15 Tips" → "T16 Tips") in the mobile menu, desktop TOC, and inline script.
- **Archive link:** small link to `/guide-t15` placed at the bottom of the
  desktop TOC rail and at the end of the T16 Tips section (so both desktop and
  mobile users can find it).
- Metadata description updated to mention Siege of Orgrimmar.

### 3. Routing

- Netlify serves extensionless URLs already (`/guide` → `guide.html`);
  `/guide-t15` resolves the same way. Add a redirect only if verification shows
  extensionless resolution is not automatic (check `netlify.toml` during build).

## Error handling / risks

- Broken boss icon IDs: verify one SoO icon URL before building all 14.
- Anchor rename (`#tot-tips`): inbound links to `/guide#tot-tips` would silently
  scroll to top. Acceptable — anchor traffic negligible; no redirect mechanism
  exists for fragments.

## Testing

- Open both pages locally; verify scrollspy, mobile Jump-to, boss rail/accordion
  switching, macro copy buttons (live page), Wowhead tooltips on both pages.
- Check all 14 SoO boss icons render.
- Lighthouse/manual check: no console errors, nav active states correct.

## Out of scope

- T14 archive, tier switcher UI, data-driven guide refactor.
- Home page / rankings changes (already on T16).
- Broadcast Overlay redesign (separate design track).
