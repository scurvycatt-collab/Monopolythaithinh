# M3-E UI, output and décor gate

- Eight décor groups A–H: **PASS — INDEPENDENT QA** (`decor-qa.md`).
- Five UI/output masters: **PASS — INDEPENDENT QA** (`ui-qa.md`).
- The accepted live Map 3 capture is the shared source for its home background, preview and
  result review; the card and popup derive from approved static avatar/building sources.
- Manifest SHA-256, byte counts, dimensions, source references and per-file 180 KiB budgets pass.
- Home selection remains lazy: preview/background may load, while renderer, décor, buildings and
  gameplay assets wait until room entry.
- UI output does not own or modify movement, Chance, notifications, economy or win rules.
- The complete `npm test` suite passes, including rule parity across all four maps.

Status: **PASS — M3-E COMPLETE**.

## Map 3 completion

M3-A through M3-E are independently accepted. Every Map 3 v2 manifest record is `PASS`, all
current binaries match their recorded hashes and sizes, and the full regression suite passes.

Status: **PASS — MAP 3 COMPLETE**.
