# M4-D Resort QA evidence

- Contact sheet: `resort-contact-sheet.webp`.
- Runtime integration: `integration.png`.
- Level-4 runtime state: `resort-level-4.png`.
- Five distinct states are registered: unowned landing pad, gateway, relay station, orbital station and Plumber fortress.
- Runtime resolver loads level 0 initially and levels 1–4 lazily from the shared resort state.
- Every sprite keeps a transparent background, fixed isometric camera and bottom-center foot anchor.
- Exact canvas, alpha bounds, checksum and byte size are recorded in `public/maps/ben-10-02/assets/v2/manifest.json`.

Final status: **PASS** — independent agent review completed on 2026-10-30.
