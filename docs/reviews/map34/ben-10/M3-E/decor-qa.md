# M3-E décor A–H QA

Status: **PASS — INDEPENDENT QA**.

## Evidence

- `decor-contact-sheet.webp`: eight normalized transparent décor clusters, ordered A through H.
- `decor-integration.png`: live Map 3 canvas using all eight groups.
- Runtime capture: renderer `2d`, map `ben-10`, 60 FPS target, 33 sprites, 40 cached draw assets.
- Automated suite: `npm test` passed after integration.

## Acceptance checklist

- [x] Eight groups A–H are visually distinct and match their assigned palettes/themes.
- [x] No baked text, accidental frame or opaque rectangular background.
- [x] Every asset has alpha, a 1024×1024 delivery canvas and a common foot anchor `[0.5, 0.9375]`.
- [x] Each WebP is below 180 KiB and its hash/byte count matches `assets/v2/manifest.json`.
- [x] Live placement does not hide city names, group color bands, price strips, tokens or special tiles.
- [x] Décor assets load only with the Map 3 board; the home screen remains map-renderer lazy.
- [x] No game rule, movement, card, notification or economy behavior is implemented inside the skin.

## Independent QA result

- A: Bellwood/Plumber urban greenery; B: Pyronite forge/lava; C: Null Void energy gate; D: Petropia crystal/scanner.
- E: silver-cyan metropolis; F: red desert monolith/relay; G: bioluminescent jungle; H: brown industrial tank/turbine.
- All eight delivery files are 1024×1024 RGBA WebP with safe transparent bounds. The largest file is 110,060 bytes.
- Manifest byte counts, SHA-256 values and source references were verified against the files on disk.
- `decor-integration.png` confirms the shared offset/scale preserves labels, bands, prices, special tiles and token lanes.
- `node test/home-screen.test.mjs`, `node test/maps.test.mjs` and the complete `npm test` suite pass.

The eight manifest records are signed off as `PASS` by independent QA.
