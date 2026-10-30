# M3-B QA — special tiles and state overlays

Locked reference: `docs/references/map-3-ben10-approved.png`

Evidence:

- `contact-sheet.webp`: all 10 normalized delivery assets.
- `integration.png`: live Map 3 canvas with four corners, three Chance variants and Tax.
- `integration-state-assets.png`: live canvas after injecting festival and outage state.
- Browser request list for state assets: `before: []`; `after:` exactly
  `m3-special-festival.webp` and `m3-special-outage.webp`.

| Asset | Runtime role/index | Size | Initial result |
|---|---:|---:|---|
| Hero Start gate | Start 0 | 116,162 B | PASS |
| Null Void prison | Island 8 | 161,314 B | PASS |
| Galactic Cup arena | Championship 16 | 145,406 B | PASS |
| Plumber Tour ship | World Tour 24 | 127,950 B | PASS |
| Chance discovery orb | Chance 12 | 112,224 B | PASS |
| Chance DNA roulette | Chance 20 | 111,992 B | PASS |
| Chance transformation capsule | Chance 28 | 118,830 B | PASS |
| Plumber Tax kiosk | Tax 30 | 123,730 B | PASS |
| Two-pole festival banner | conditional city overlay | 127,728 B | PASS |
| Power-outage relay | conditional city overlay | 122,198 B | PASS |

Checks performed:

- All files are distinct 1024×1024 alpha WebP assets with a fixed `[0.5, 0.9375]` runtime anchor.
- No asset exceeds the 180 KiB binary budget; hashes and source references match the manifest.
- The three Chance tiles use three different silhouettes selected by shared tile index.
- Corner labels and city names remain readable; Start, Null Void, Championship and Tour do not alter shared tile logic.
- Festival uses exactly two poles and one banner. Outage keeps a blank count area; the shared tile renderer remains authoritative for the `rounds ⚡` text.
- Festival/outage are genuinely state-lazy: they are absent before state activation and requested only during `board.sync` for matching state.
- `test/map-parity-engine.test.js` passes for all four maps, including the two-step Chance → popup → confirmed movement flow for World Tour and Championship.
- Shared dice animation remains 60 FPS with a measured ~1006 ms roll; no new per-frame asset generation was introduced.

Status: **PASS — INDEPENDENT QA**. All 10 assets, mappings, lazy requests, visual envelopes and shared-rule parity passed. M3-C is unblocked.
