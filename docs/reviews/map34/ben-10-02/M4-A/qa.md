# M4-A independent QA

Status: **PASS — INDEPENDENT QA**

Reference: `docs/references/map-4-ben10-02-approved.png`
Manifest: `public/maps/ben-10-02/assets/v2/manifest.json`
Contact sheet: `docs/reviews/map34/ben-10-02/M4-A/contact-sheet.webp`
Live integration: `docs/reviews/map34/ben-10-02/M4-A/integration.png`

## Gate

- [x] All 16 M4-A assets exist, match manifest hashes and remain below 180 KiB.
- [x] Alpha, common camera and foot anchors are clean; no clipped silhouette or watermark.
- [x] Board base, eight distinct biomes and center composition follow the approved Map 4 hierarchy.
- [x] Biomes sit beside their corresponding track groups rather than forming two center rows.
- [x] Omnitrix, alien ring, left/right card pads, dice pad and props remain readable without covering labels or tiles.
- [x] No Map 3 visual is imported or reused by the Map 4 skin.
- [x] Runtime rules, tile prices, movement and card resolution remain in shared modules outside the skin.
- [x] Home screen does not eagerly load board/landmark assets.
- [x] Map tests and full test suite pass.

## Independent reviewer notes

### Technical checks that pass

- All 16 files are 1024×1024 RGBA WebP with transparent outer pixels, safe declared
  `contentBounds` and the common `[0.5, 0.9375]` anchor.
- Binary SHA-256, byte count and source reference checks pass for every record. The largest file
  is `m4-alien-ring` at 153,660 bytes, below the binary 180 KiB limit.
- No delivery hash is shared with Map 3. `skin.js` imports only the shared board-skin contract and
  does not import Map 3 assets or contain price, rent, movement or card-resolution rules.
- The room gate exits before `prepareBoard()`, so board/landmark sprites are not requested on the
  home screen. `test/home-screen.test.mjs`, `test/maps.test.mjs` and the complete `npm test` suite pass.

### Re-review result

- The new `integration.png` resolves the original visual blockers: the landmarks are moved
  outward, no longer form two center rows, and now follow the locked perimeter sequence. Neon,
  lava and crystal read along the left; tech and desert along the upper/right; blue and purple
  along the right/lower-right; jungle occupies the front arc. Rushmore is again the clear
  upper-center monument behind the alien ring.
- The center Omnitrix, alien ring, two card pads, dice pad and center props remain unobstructed.
  Track labels, prices and special squares remain readable. Capture reports a 0.8 ms build.

### Final focused re-review

- `m4-tech-metropolis` now maps to Revonnah/Aldabra `[17,19]` and
  `m4-desert-fortress` maps to Encephalonus IV/Turrawuste/Xenon `[21,22,23]`.
- `m4-blue-domes` remains locked to `[29,31]`. `test/maps.test.mjs` now asserts all three semantic
  mappings and passes.
- No visual code or capture changed after the accepted placement review. All 16 delivery hashes
  and byte counts still match the manifest.

All 16 M4-A manifest records are signed off as `PASS` by independent QA.
