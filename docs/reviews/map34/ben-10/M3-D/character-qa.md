# M3-D character token/avatar QA

Evidence:

- `token-contact-sheet.webp`: four full-body board tokens (Ben, Gwen, Kevin, Grandpa Max).
- `avatar-contact-sheet.webp`: four separate 512×512 UI avatars.
- `token-integration.png`: live Map 3 capture with all four tokens placed at separate corners.
- Resource Timing evidence: the room initially loaded only Ben's token; synthetic four-player state then loaded exactly Gwen, Kevin and Max token files.

Checks:

- Tokens and avatars are separate delivery assets; the renderer prioritizes `tokenImg` while lobby/cards continue to use `img`.
- All token masters use equal 900 px content height, a common 1024² alpha canvas and shared runtime `TOKEN_HEIGHT = 1.08`.
- Token silhouettes and owner-color bases remain legible at real board scale without covering tile labels or adjacent spaces.
- Ben, Gwen, Kevin and Max have distinct outfits, poses and accent colors matching their building sets.
- Avatars are prebuilt 512² alpha PNGs; no runtime Canvas/WebGL snapshot path is introduced.
- Token assets load only for players present in state; home screen continues to avoid map token files.
- Manifest hashes, byte sizes and source references match; each file remains below its relevant budget.

Status: **PASS — INDEPENDENT QA**.
