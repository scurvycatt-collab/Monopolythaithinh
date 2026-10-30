# M3-E UI/output QA

Status: **PASS — INDEPENDENT QA**.

## Evidence

- `ui-contact-sheet.webp`: home background, map preview, player-card master, property-popup master and result-state review.
- Runtime source master: `decor-integration.png`, already independently accepted with the full M3-E décor batch.
- Reproducible derivation: `scripts/derive-map3-ui-assets.mjs`.
- Registry/runtime integration: Map 3 exposes a dedicated `background` and `preview`; the gate uses `background || preview`.
- `node test/home-screen.test.mjs` and `node test/maps.test.mjs` pass.

## Acceptance checklist

- [x] Background is 1920×1080, shows the accepted live Map 3 board on the left and leaves a clean, dark, readable form-safe area on the right.
- [x] Preview is 640×360 and shows the complete board without stretching, clipping or stale pre-M3-E assets.
- [x] Player card uses the independently accepted Ben avatar and Map 3 palette; text remains UI-owned, not part of gameplay rules.
- [x] Popup master uses a prebuilt property thumbnail and does not add a second thumbnail-generation path at runtime.
- [x] Result review keeps both `Chơi ván mới` and `Thoát phòng`, and does not change shared win logic.
- [x] All five outputs are reproducible from accepted sources, match manifest hashes/bytes and stay below 180 KiB.
- [x] Selecting Map 3 may load its preview/background, but no renderer, board décor, building or gameplay asset loads on the home screen.
- [x] Other maps keep their own independent visual style and existing preview/background behavior.

## Independent QA result

- Running `node scripts/derive-map3-ui-assets.mjs` reproduces all five binaries byte-for-byte;
  their SHA-256 values and byte counts remain identical to the manifest.
- Canvas sizes are 1920×1080, 640×360, 720×240, 900×700 and 1100×760 as specified.
  The largest output is 106,228 bytes, below the 180 KiB per-output budget.
- The home background keeps the complete board on the left and a dark, low-detail form-safe
  field on the right. The selection preview contains the current accepted M3-E board and décor.
- The card uses the accepted Ben avatar. The popup derives from the prebuilt
  `ben10-ben-2.png` thumbnail; runtime property dialogs continue to use static map-specific
  thumbnails and do not generate a second image path.
- The result review contains both required actions. Runtime keeps both handlers and the shared
  winner/reset/exit logic unchanged.
- The room gate returns before `prepareBoard()`. Selecting Map 3 requests only its registered
  preview/background; the renderer and board/building/décor assets load only after room entry.
- `npm test` passes, including four-map rule parity, home-screen lazy-map and map registry tests.

The five manifest records are signed off as `PASS` by independent QA.
