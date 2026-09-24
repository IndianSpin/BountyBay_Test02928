# Context Manifest — BB-234 PV live-match rebuild

Filled in per AGENTS.md before any task changes code.

## Objective

Rebuild the live-match screen to the PV-* direction (D-51, founder
feedback): PV-Seq-1/2 (match sequence), PV-Mobile (mobile
composition), PV-Attention (one hero per state), PV-Comms
(communication placement), PV-Juice (intensity intent) — the founder
expects to SEE these boards on screen. BB-232's fit is the floor.
Captures land in design-sandbox/screenshots/current/ REPLACING the
previous ones (L-012) with the README index updated. Fold in BB-235
(GREYLOT avatar→sheet) and the viewport-correct pose alignment fix
(founder-flagged fixed-600px bug).

## Relevant rule / requirement IDs

- BB-234 + BB-235 inbox contracts; PV boards (Thesis, Seq-1/2,
  Mobile, Attention, Comms, Juice); DESIGN_ACCEPTANCE rules 1–10
  (binding where boards conflict with rules); D-51, L-012;
  golden-baseline-1 + BB-216/224/225/232 as the base.

## Files expected to change

- `components/game/negotiation-board.tsx` (state classes, trail,
  quick-line poses, dossier seal styling), `components/game/
  character-registry.ts` (BB-235 greylot flip), `live-match.css`
  (PV composition, percentage pose alignment, close-warm state),
  `app/play/match-screen.tsx` (staging opponent card, timeline
  amounts), `components/game/types.ts` (TimelineItem amount),
  `canvas-checkpoint.spec.ts` (PV structural contract), captures +
  README index.

## Explicitly out of scope

- PV-Swap / PV-Rivalry (feature vision). The MOVE label (worker-1's
  component — coordination note). Pitch-on-offer input (API has no
  pitch field — GR-025 wiring later). SHOW CARD verified reveal
  (DD-M3, W1). Emotes (PD-10), voice (OQ-021). Opponent "deals"
  count (profile API lacks it — shows games).

## Tests required

- Unit/typecheck/lint green; E2E full suite green; canvas-checkpoint
  updated to the PV structural contract (no-scroll assertions stay);
  captures in screenshots/current/ replacing the old set.

## Result

**Changed:** negotiation-board (state classes incl. --close, trails,
quick-line pose map, rail-end my plaque, dossier in the action zone),
character-registry (BB-235: GREYLOT sheet), gap-meter (trail render),
match-screen (event-history prepend for the trail, PV opponent card
staging), confidential-position (MY MAX · SEALED vault card),
live-match.css (percentage pose alignment, rail-end plaques, trail,
warm-close, sealed card, PV mobile sheet, pv-found card),
canvas-checkpoint (trail assertions post-crossing), current/ captures
+ README (L-012).

**Behavior:** plaques live at the rail ends with both public trails
beneath (never interpreted); the opponent card fronts match-found;
MY MAX · SEALED is the confidential card; the room warms on public
closeness only; quick lines are performed (pose per line); the pose
sheets align viewport-correctly (percentage centers, the fixed-600px
bug is gone); mobile reads as one state-adaptive sheet.

**Tests:** typecheck 0 · unit 280 · lint clean · full E2E 19/19
(strict seed incl. timeout + GR-007) · canvas-checkpoint green.

**Deviations:** MOVE label lives in worker-1's component (SEAL OFFER
kept — coordination note); pitch-on-offer needs the API field
(GR-025 wiring); SHOW CARD reveal = DD-M3 (W1); emotes = PD-10;
voice = OQ-021; opponent "deals" count needs the profile API
extension (games shown); per-character signature gestures are
art-level (pose swap approximates).
