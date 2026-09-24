# SUPERSEDED DESIGN — do not implement from this folder

Everything here was replaced by newer design and is kept only for history (moved here 2026-09-24).
The current design reference is `design-sandbox/bounty-bay-canvas/` — start with its README's "START HERE" table.

| What | Replaced by |
|---|---|
| `bounty-bay-canvas/boards/GO-*` (C1 GoldenOtter redesign) | `GO2-*` (C2, GoldenOtter v4) |
| `bounty-bay-canvas/boards/CR-*` (character routes A/B/C) | Decision taken: Route A → `GO2-*` + `CAST-*` |
| `bounty-bay-canvas/boards/CC-*` (old core cast lineup) | `CAST-*` (7 characters at v4) + `GO2-*` |
| `bounty-bay-canvas/boards/PE-*` (old pose/expression matrix) | per-character expression/gesture sheets in `CAST-*`/`GO2-*`; PV0 avatar-performance rule |
| `bounty-bay-canvas/renders/{CC,CR,PE}-*` | `renders/CAST-*`, `renders/GO2-*` |
| `bounty-bay-canvas/assets/` route B/C characters, BLACK PARROT, parrot poses, old otter | v4 exports in `bounty-bay-canvas/assets/` and `apps/web/public/game/` |
| `concepts/`, `arena.html`, `deal-table.html`, `comparison.html` | the canvas (DEC-029) |
| `screenshots/` concept / merchant / early AI-practice captures | current QA captures in `design-sandbox/screenshots/` |
