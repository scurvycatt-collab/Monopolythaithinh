# M3-C Ben building-set QA

Evidence:

- `ben-contact-sheet.webp`: five normalized levels in progression order.
- `ben-integration.png`: live board with levels 0–4 on city tiles 1, 2, 3, 5 and 6.
- Browser request list: before `[]`; after state sync exactly the five Ben WebP assets.

Checks:

- Level 0 is a claim pad, not a house. Levels 1–4 progress through Omnitrix station, broad hero base, command tower and Hero HQ.
- Silhouettes and structures genuinely change at every level; no stage is a resized duplicate.
- Normalized content envelopes intentionally progress from 520×383 through 780×736 on a common 1024² alpha canvas.
- All runtime sprites share anchor `[0.5, 0.9375]`, world scale `1.6`, and the common `PROPERTY_LEVEL_SCALE`; ownership does not define a private map scale.
- Live rendering stays within each city tile and keeps city names/rent strips readable.
- All five assets are state-lazy and are absent before the owned-property state is injected.
- Hashes, byte sizes and source references match the manifest; largest file is 129,062 B.

Status: **PASS — INDEPENDENT QA**. The full progression, common scale, live readability, lazy requests and file integrity passed. Gwen production is unblocked.
