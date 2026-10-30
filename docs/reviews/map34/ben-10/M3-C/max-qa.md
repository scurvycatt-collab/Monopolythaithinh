# M3-C Max building-set QA

Evidence:

- `max-contact-sheet.webp`: five normalized levels in progression order.
- `max-integration.png`: live Map 3 board with levels 0–4 on city tiles 1, 2, 3, 5 and 6.
- Browser request list: before `[]`; after sync exactly the five Max WebP assets.

Checks:

- Level 0 is a Plumber claim pad. Levels 1–4 progress through outpost, bunker, command post and Plumber HQ.
- Every silhouette changes while ivory armor, charcoal base, olive panels, amber owner lights and cyan tactical displays remain consistent.
- Progressive content bounds are 520×376, 567×520, 662×600, 669×700 and 729×780 on a common alpha canvas.
- Anchor `[0.5,0.9375]`, world scale `1.6` and common `PROPERTY_LEVEL_SCALE` remain authoritative.
- The live board keeps labels, rent strips and neighboring tiles readable.
- All five assets are lazy and each normalized file remains below the binary 180 KiB budget.
- Hashes, byte sizes and source references match the manifest.

Status: **PASS — INDEPENDENT QA**.
