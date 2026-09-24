# BB-216 after-captures (live-match composition redesign)

Captured by `canvas-checkpoint.spec.ts` (CAPTURE_CANVAS=1, reuse mode,
clean seed) from commit `fa6ad69`. Each live capture maps to its
before-image in `design-sandbox/screenshots/` (v1 composition) and the
canvas board it renders against.

| After (this folder) | Before (../) | Board |
|---|---|---|
| live-match-desktop-mine.png | live-match-desktop-mine.png | GO2-LiveMatch (my move) |
| live-match-desktop-theirs.png | live-match-desktop-theirs.png | GO2-LiveMatch (their move) |
| live-match-desktop-crossed.png | live-match-desktop-crossed.png | GO2-LiveMatch / LMR-D-03 crossed |
| live-match-desktop-chat.png | — (new, D-26) | GO2-LiveMatch bubble |
| live-match-desktop-accept-hold.png | acceptance-crossed-seal.png | JX-E-Acceptance (mid-hold) |
| live-match-desktop-accept-stamp.png | acceptance-crossed-seal.png | JX-E-Acceptance (stamp) |
| live-match-mobile.png | live-match-mobile.png | LMR-M-01 / GO2 mobile |
| live-match-mobile-chat-sheet.png | — (new, D-26) | D-26 bottom sheet |

`board-LMR-D-{01,02,03}-*.png` are the reference design boards captured
alongside the live screen by the same tool (not product screenshots).

Deviation context: the GO2 boards keep the v1 UI frame ("the same UI");
the composition follows the binding DESIGN_ACCEPTANCE §Live-match
composition + §Chat rules. See the inbox READY FOR REVIEW for the full
list.
