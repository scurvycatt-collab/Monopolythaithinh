# M3-A QA — foundation, center and dice pad

Approved reference: `docs/references/map-3-ben10-approved.png`

Evidence:

- Contact sheet: `docs/reviews/map34/ben-10/M3-A/contact-sheet.webp`
- Integrated 1600×1000 canvas: `docs/reviews/map34/ben-10/M3-A/integration.png`
- Measured overlay: `docs/reviews/map34/ben-10/M3-A/integration-measured.png`
- Runtime: Map `ben-10`, renderer `2d`, 60 FPS target, `0.16 ms` average dynamic frame,
  `1.2 ms` static build, 1008 ms shared dice animation.

| Asset | 1024² + alpha edge | Camera/material | Budget | Renderer anchor/scale | Independent QA |
|---|---|---|---|---|---|
| `m3-board-base` | PASS | PASS | PASS — 87,910 B | PASS — base layer behind track | PASS |
| `m3-center-omnitrix` | PASS | PASS | PASS — 121,826 B | PASS — 230 / 1,537 px = 14.96% board width | PASS |
| `m3-dice-pad` | PASS | PASS | PASS — 92,328 B | PASS — separate low pad, no Omnitrix mark | PASS |

Implementation checks:

- `spriteMeta.anchor` is validated by `defineSkin`, loaded with the sprite and consumed by
  `Pen.img`; it is no longer dead manifest metadata.
- All three delivery files use fixed 1024×1024 canvases with fully transparent outer edges.
- The board base is composed by the `base` slot before the center slab and 32 track tiles.
- Map 3 declares two map-specific dice positions over the separate dice pad while still using
  the shared dice trajectory module.
- The integration overlay uses one consistent visible-board bbox (x=31…1567, width 1,537 px)
  and center bbox (x=685…914, width 230 px). The measured 14.96% ratio is inside the required
  14–19% range.
- Full ImageGen source PNGs are retained under `assets/v2/source/` and linked by `sourceRef` in
  the manifest.

Reconciliation check: all three current delivery binaries still match their manifest SHA-256 and
byte counts, remain below 180 KiB, keep their 1024×1024 alpha canvases and retain all three
review evidence files listed above. No asset or runtime implementation changed during reconciliation.

Batch status: **PASS — INDEPENDENT QA**.
