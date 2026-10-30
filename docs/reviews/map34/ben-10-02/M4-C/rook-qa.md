# M4-C-Rook QA

Status: PASS — independent QA, 2026-10-30

## Scope

- Five distinct Rook property levels: Proto-tool marker, Revonnah outpost, Plumber station, Galactic fortress, and Galactic Plumber citadel.
- Fixed isometric camera, transparent canvas, foot anchor `[0.5, 0.9375]`.
- Shared runtime scale `1.6`; common per-level property scaling remains active.
- Lazy runtime loading and prebuilt purchase-popup thumbnails derived from the same master assets.

## Evidence

- Contact sheet: `rook-contact-sheet.webp`
- Live Map 4 integration: `rook-integration.png`
- Runtime source: `public/maps/ben-10-02/skin.js`
- Asset manifest: `public/maps/ben-10-02/assets/v2/manifest.json`

## Required checks

- [x] All five silhouettes are immediately distinguishable in increasing order.
- [x] Rook/Plumber identity is consistent and unique to Map 4.
- [x] No labels, baked numbers, unwanted background, crop, halo bleed, or floating foot.
- [x] Assets fit the property tile and do not obscure city labels or adjacent tiles.
- [x] Every file remains below the 180 KiB binary budget.
- [x] Runtime maps the matching owner and level lazily.
- [x] Purchase popup uses thumbnails generated from these exact masters.
- [x] Automated tests pass.

Independent QA found no blocker. The smallest remaining budget margin is 45,158 B.
