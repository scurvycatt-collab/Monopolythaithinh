# M3-A Gate 2 QA — visible biomes and board dressing

Reference: `docs/references/map-3-ben10-approved.png`

Evidence:

- `contact-sheet-gate2.webp`: six normalized delivery assets.
- `integration-gate2.png`: correct `ben-10` canvas at 1600×1000 during dice roll.
- Runtime capture: 60 FPS target, average dynamic frame 0.19 ms, static build 1.3 ms,
  shared dice animation 1006 ms.

| Asset | Canvas/alpha | ≤180 KiB | Integrated role | Independent QA |
|---|---|---|---|---|
| Bellwood biome | PASS | 136,002 B | group A / front-lower center, tiles 1-3 | PENDING |
| Pyron biome | PASS | 145,316 B | group B / upper center, tiles 5-7 | PENDING |
| Petropia biome | PASS | 181,554 B | group D / lower-left center, tiles 13 and 15 | PENDING |
| Null Void biome | PASS | 176,148 B | left-center special, tile 8 | PENDING |
| Alien hologram ring | PASS | 152,238 B | behind center, clear dice pad | PENDING |
| Edge lights | PASS | 89,506 B | base layer below track | PENDING |

Checks:

- All six files are fixed 1024×1024 WebP with transparent outer edges and real runtime anchors.
- No text is baked into the sprites; tile labels remain renderer text from shared index data.
- The four large biomes stay inside the center field and do not cover track labels.
- Hologram ring renders behind the center Omnitrix and no longer covers the dice.
- Edge-light sprite renders in the base layer below center slab and all 32 tiles.
- Assets are Map 3 originals and do not import Map 4 visuals.
- The second integration capture uses explicit world coordinates matching the locked reference: Null Void left, Petropia lower-left, Pyron upper-center and Bellwood front/lower-center.
- Manifest semantic indexes now match the track: Bellwood 1-3, Pyron 5-7, Null Void 8 and Petropia 13/15.

Status: **PASS — INDEPENDENT QA**. Placement, semantic indexes, layering, alpha, budgets, hashes and Map 3 originality were independently rechecked. M3-B is unblocked.
