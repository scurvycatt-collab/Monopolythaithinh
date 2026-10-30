# M4-C-Ben QA

Status: PASS — independent QA, 2026-10-30

## Scope

- Five distinct Ben property levels: claim marker, levels 1–3, and hotel/command citadel.
- Fixed isometric camera, transparent canvas, foot anchor `[0.5, 0.9375]`.
- Shared runtime scale `1.6`; the common renderer still applies the shared per-level scale policy.
- Lazy runtime loading and prebuilt purchase-popup thumbnails derived from the same master assets.

## Evidence

- Contact sheet: `ben-contact-sheet.webp`
- Live Map 4 integration: `ben-integration.png`
- Runtime source: `public/maps/ben-10-02/skin.js`
- Asset manifest: `public/maps/ben-10-02/assets/v2/manifest.json`

## Required checks

- [x] All five silhouettes are immediately distinguishable in increasing order.
- [x] Ben/Omnitrix identity is consistent across all levels.
- [x] No labels, baked numbers, unwanted background, crop, halo, or floating foot.
- [x] Assets fit the property tile and do not obscure city labels or adjacent tiles.
- [x] Level 4 remains below the 180 KiB asset budget (182,038 B < 184,320 B).
- [x] Runtime uses the raster assets and only loads the matching owner/level lazily.
- [x] Purchase popup uses thumbnails generated from these exact masters.
- [x] Automated tests pass.

Independent QA found no blocker. The unrelated Node ESM warning from Four Seasons remains outside this batch.
