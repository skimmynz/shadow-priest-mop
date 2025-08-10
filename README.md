# Shadow Priest Top 100 – Fixes

This package fixes the missing HTML structure and the malformed CSS header so your page loads and styles apply. It also includes a **minimal stub JS** you can use locally to verify rendering while your Netlify Function is offline.

## Files

- `index.html` — Proper HTML skeleton that links `style.css`, loads Wowhead tooltips, and includes containers your app expects (`#raid-menu`, `#boss-buttons`, `#rankings`).
- `style.css` — Your stylesheet with the first line corrected to start with `body {`.
- `app-stub.js` — Tiny script to populate placeholder content. **Not required** for production; delete once your real script works.

> Your existing app script is named with a space: `script 6.js`. The `index.html` in this package references that exact name. If you rename it to `script-6.js`, update the `<script src>` accordingly.

## How to use

1. Drop these files at your site root (same folder as your real `script 6.js`).
2. Open a terminal in that folder and run:
   ```bash
   # Quick local server (UI only)
   python3 -m http.server 8080
   # visit http://localhost:8080
   ```
   You should see the dark theme and some placeholder content (from `app-stub.js`).
3. To test with your Netlify Function endpoints (`/.netlify/functions/*`):
   ```bash
   npm i -g netlify-cli
   netlify dev
   ```
   This proxies `/.netlify/functions/` so your fetches work during development.
4. When ready, remove `app-stub.js` (or simply don’t include it) and ensure your real `script 6.js` exists alongside `index.html`.

## Notes
- The Wowhead tooltip script is loaded via:
  ```html
  <script>window.whTooltips = { colorLinks: true, iconizeLinks: true, renameLinks: true };</script>
  <script defer src="https://wow.zamimg.com/widgets/power.js"></script>
  ```
- If the rankings still appear empty in production, open the browser console (F12) and check for errors from your Netlify function (`getLogs`).
