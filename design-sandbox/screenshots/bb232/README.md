# BB-232 fit evidence — live-match composition in both reference viewports

Captured by canvas-checkpoint (CAPTURE_CANVAS=1) after the re-fit. The
canvas spec now asserts world-level fit (no scroll in either axis) on
desktop 1440×900 and mobile 390×844; the only page-level overflow in
dev builds is the dev auth banner (absent in production).

- live-match-desktop-{mine,theirs,crossed,chat}.png — desktop, all
  controls inside the viewport
- live-match-mobile.png + live-match-mobile-chat-sheet.png — mobile,
  fullPage captures: the state-adaptive sheet (composer + seal only on
  my turn, per PV-Mobile intent)
- board-LMR-D-*.png — reference design boards
