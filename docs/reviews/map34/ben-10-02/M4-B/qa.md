# M4-B independent QA

Status: **PASS — INDEPENDENT QA**

Reference: `docs/references/map-4-ben10-02-approved.png`
Manifest: `public/maps/ben-10-02/assets/v2/manifest.json`
Contact sheet: `docs/reviews/map34/ben-10-02/M4-B/contact-sheet.webp`
Live integration: `docs/reviews/map34/ben-10-02/M4-B/integration.png`
Festival/outage state: `docs/reviews/map34/ben-10-02/M4-B/state-overlays.png`

## Gate

- [x] All 10 M4-B files match manifest hash/bytes, alpha/anchor and 180 KiB budget.
- [x] Start, Null Void, Championship and Tour are distinct, readable at runtime scale and do not hide corner labels.
- [x] Three Chance tiles use three different devices at indexes 12, 20 and 28.
- [x] Tax terminal is visually distinct and contains no baked words.
- [x] Festival uses exactly two poles and one blank ribbon; runtime multiplier remains code-rendered.
- [x] Outage shows the runtime remaining-turn number before the lightning badge.
- [x] Festival/outage stay lazy and only load when their states appear.
- [x] Card notification and movement rules remain in shared engine/app code, not the skin.
- [x] Map registry and full test suite pass.

## Independent reviewer notes

### Independent QA result

- All ten delivery files are 1024×1024 RGBA WebP with transparent outer pixels, safe bounds and
  the common `[0.5, 0.9375]` anchor. Hashes, byte counts and sources match the manifest; the
  largest file is the outage overlay at 176,172 bytes, below 180 KiB.
- The four corner silhouettes are distinct and remain outside their labels. Chance devices at
  12/20/28 are respectively a question scanner, DNA roulette and unstable capsule.
- The tax terminal has no baked words. The festival asset has exactly two poles and a blank
  ribbon; `specialFestival` renders the current multiplier at runtime.
- The outage asset leaves its counter plate blank. `specialOutage` renders the remaining turn
  count to the left of the baked lightning badge, confirmed by `state-overlays.png`.
- Festival and outage are marked `lazy: true`, exposed only through state asset resolvers, and
  loaded by the shared board renderer only when those states exist.
- Movement-card staging, notification order, economy and special-square rules remain in shared
  engine/app code. `test/home-screen.test.mjs`, `test/maps.test.mjs` and full `npm test` pass.

All ten M4-B manifest records are signed off as `PASS` by independent QA.
