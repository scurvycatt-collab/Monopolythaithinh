# M3-D resort-state QA

Evidence:

- `resort-contact-sheet.webp`: unowned state plus owned levels 1–4.
- `resort-level-0.png` … `resort-level-4.png`: live Map 3 captures for every ownership count.
- Resource Timing evidence: only `m3-resort-0.webp` is present before ownership; each owned-state capture adds exactly its requested level asset.

Checks:

- Progression is a neutral pad → active portal → satellite relay → orbital transfer station → Plumber orbital fortress.
- Every level changes silhouette; the Plumber silver/charcoal body, lime portal energy and cyan controls remain coherent.
- Shared alpha canvas, foot anchor `[0.5,0.9375]`, world scale `1.6` and common `PROPERTY_LEVEL_SCALE` are used.
- Names, rent/value strips, character path and neighboring tiles remain readable in all five live captures.
- Unowned state is eagerly available because four resort tiles are visible at board load; levels 1–4 remain lazy until ownership state requests them.
- Hashes, byte sizes and source references match the manifest; every file is below the binary 180 KiB budget.

Status: **PASS — INDEPENDENT QA**.
