# Worker 2 — frontend / design (canvas slices)

Session: `bounty-bay-p1-roadmap` · Branch: `w2-frontend-design` ·
Worktree: `~/projects/bay-w2` (one-time `pnpm install`; work there — the
original `~/projects/bay` checkout is manager-only).

Update this file BEFORE starting a substantial task and AFTER each
checkpoint. Do not edit canonical `docs/*` directly — propose doc changes
here; manager applies them (D-6). **You never self-certify "done" — your
terminal state is READY FOR REVIEW; the manager returns ACCEPT / REWORK /
BLOCK (D-8).**

## Founder scope restriction (correction 3) — in force until canvas
## verdict
Your canvas slices are **READY FOR FOUNDER REVIEW — NOT accepted.** Do
not propagate the visual language to additional screens. You may only:
1. prepare the IN handoff (below);
2. clean obvious debug logging;
3. fix regressions;
4. provide screenshots and testing instructions.
**No new UI feature work.** Secondary pages stay untouched.

## Ownership
- `design-sandbox/` (canvas source), `apps/web/public/game/`, all of
  `apps/web/src/components/game/*` EXCEPT worker-1's list
  (`use-hold.ts`, `match-actions.tsx`, `time-warning.tsx`), `globals.css`
  EXCEPT worker-1's `.lm-accept`/`.lm-walk__hold`/`.lm-confirm-sheet`
  sections (selector-level split is temporary — structural CSS split is
  planned as W2-03 at the next safe checkpoint; see TASK_BOARD).
- Dev servers 3000/4000 are yours (D-4). Do not kill worker-1's E2E
  servers on 3100/4100.
- **No longer yours:** `packages/intelligence/` — handing to worker-3.

## CURRENT TASK — BB-239 SH4 result sequence — READY FOR REVIEW
Branch `w2-pv-livematch`, tip `47f2ea7`. The person stays in frame on
the result (outcome clips + spoken line), the 12s offer ring, NOT NOW
→ the Bay letter (new GET /v1/me/rematch-letters seam), ANSWER
completes the loop; motion-spec choreography (pin slam, plaque slide,
cross snap, concede one-shot). Gates: typecheck 0, unit 301, lint
clean, E2E 17/17 + SH4 loop 4/4. Captures sh4-*.png in current/.
Deviations: SWAP SIDES = PDR-14 (same-roles today), rating block =
P1-M2, 0:12 decorative. BB-230 acceptance slot still open.

## DONE — BB-242 manifest-driven animation — MERGED (D-61, TD-4 closed)
Branch `w2-pv-livematch`, tip `ae53e7b`. 12 fps WebP clips per the
manifest over the static poses (one-shots hold; reduced motion =
static only; percentage stepping). Gates: typecheck 0, unit 301,
lint clean, E2E regression 11/11, in-browser verified. BB-239 next
(accept/nodeal/rematch clips waiting).

## DONE — BB-241 The Bay hub (SH3) — READY FOR REVIEW (bcfe65b)
Branch `w2-pv-livematch`, tip `bcfe65b`. Three hubs + shared bar
(desktop top / mobile bottom), the Bay per SH-BayIA (one gold table,
letters empty state, three SOON placeholder slots, practice room,
ME card), PLAY NOW → /bay, battle hierarchy on Play. Gates: typecheck
0, unit 301, lint clean, E2E 22/22, bay spec 2/2. Captures
bay-{desktop,mobile}.png in current/ (L-012). W1's spec entry helpers
migrated in one commit — flagged. BB-242 (animation) next.

## DONE — BB-234 PV live-match rebuild + BB-235 — MERGED (founder-approved)
Branch `w2-pv-livematch`, tip `aa775a9`. PV-Seq/Attention/Comms/Juice/
Mobile implemented: opponent card staging, rail-end plaques + trails,
MY MAX · SEALED vault card, warm-close from public data, quick-line
poses, percentage pose alignment (fixed-600px bug gone), PV mobile
sheet. BB-235 folded in (GREYLOT sheet). Gates: typecheck 0, unit 280,
lint clean, E2E 19/19, canvas green. Captures in screenshots/current/
(L-012). BB-230 complete+green, awaiting its acceptance slot.
BB-232 founder verdict still pending.

## DONE — BB-232 composition overflow fix — MERGED (D-50)
Branch `w2-fit-composition`, tip `e876271`. Dossier disclosure +
mobile re-fit + PV-Mobile state-adaptive action zone; world-level fit
assertions in canvas-checkpoint. Measured: mobile 844/844 (was +368),
desktop 900/900 (was ~90). Gates: typecheck 0, unit 280, lint clean,
full E2E 15/15. Evidence design-sandbox/screenshots/bb232/.
BB-230 next after acceptance.

## DONE — BB-225 cast pose-system — ACCEPTED (f119b9c; PDR-5 mapping confirmed by founder)
Branch `w2-cast-poses`, tip `d1e405e`. Registry of 8 characters
(files/sheet/avatar) + persona mapping; AI opponents now front as
cast characters; humans keep GoldenOtter (registry = selection seam).
Gates: typecheck 0, unit 264, lint clean, cast-poses + practice +
friend regression green. Screenshots bb225/ before+after per persona.
Asset-export request list in the inbox. BB-230 queued after.

## DONE — BB-224 opening/title screen — ACCEPTED (e9a3128, founder approved)
Branch `w2-title-screen` (from `golden-baseline-1` + cast-v3 export),
tip `211556b`. OS-* boards implemented (wharf + v4 otter, one PLAY
NOW, 8-face teaser strip, desktop + mobile); PDR-4 as the named
SHOW_TITLE_ON_RETURN switch (default SHOW). Gates: typecheck 0, unit
251, lint clean, title-flow 3/3, friend/practice regression green.
Screenshots bb224-title-{desktop,mobile}.png in design-sandbox/
screenshots/. Waiting for ACCEPT/REWORK. BB-225 queued after.

## DONE — post-BB-216 queue ACCEPTED, merged `44c39da` (D-32)

## DONE — BB-216: live-match composition redesign — ACCEPTED + merged (5935792)
Committed to `w2-frontend-design` (tip `fa6ad69`, rebased on main
`346cc25`): `5eb46b7` composition → `07b8b5f` v2 assets → `de49f12`
pose system → `fa6ad69` D-28 + mobile fix.
Delivered: D-24 five-object/four-zone composition + D-26 three-level
chat (bubble fade, quick prompts, bottom sheet) + canvas v2 Closer
poses (key-state swap + crossfade) + D-28 seal neutralization (illegal
amount disables the seal; grouped `SEAL OFFER 116,500`).
Verification: typecheck 0 · unit 251 passed · E2E friend-match/
hold-accept/timeout 10 passed · canvas-checkpoint green (11 captures
in `apps/web/test-results/canvas/`) · QA bb-218 repro flips at its
pin (seal disabled). Deviations + evidence: inbox file. STOPPED for
founder review — do not start BB-213/BB-215 until BB-216 is ACCEPTed.

## BB-201 CHECKPOINT (CSS split, PAUSED by manager D-24 — commit below)
Committed to `w2-frontend-design` as a salvage checkpoint; NOT reviewed.
**What exists in the commit:**
- `apps/web/src/components/game/live-match.css` — canvas composition
  (world/opponent/plaque/offer/limit/rail/composer/seal/ribbon/clock/
  coins/chat/round-btn/menu/asset/positions/mobile) + my acceptance
  interaction pieces (`.lm-accept--pressed`, `lm-shockwave` keyframe +
  class) + their reduced-motion rule.
- `apps/web/src/components/game/reveal.css` — `.lm-result-*` overlay/
  stage/stamp/limits/range/split/headline/ledger/rematch-seal/skip-hint
  + mobile media + `.lm-split__coin` reduced-motion.
- `apps/web/src/app/play/match-screen.tsx` — imports both modules (only
  `app/` files may import global CSS; match-screen is the single `.lm-*`
  container incl. staging MerchantScene).
- `globals.css` — reduced to legacy/secondary styles + tokens/keyframes
  + worker-1's owned acceptance sections (`.lm-accept` overflow/
  transition, `.lm-accept__fill`, `lm-stamp`, `.lm-accept--stamping`,
  `.lm-confirm-sheet`, `.lm-walk__hold/__fill`) + their reduced-motion
  block (restored).
**Verification done:** rule-multiset parity script (538 rules before =
after, mod the intentional 3-way decomposition of one shared
reduced-motion line — same elements/query/computed styles); `pnpm test`
226 passed; `next build` compiles CSS (Turbopack ✓).
**Known gap at pause time:** `pnpm typecheck` / `next build` fail on
PRE-EXISTING worker-1 spec error `e2e/friend-match.spec.ts:249`
(`body.code` union narrowing, from their commit `0aec467`) — untouched
per ownership, flagged in inbox. E2E canvas-checkpoint desktop half
passed (all `.lm-*` structural checks) on a run against STALE main-
checkout servers; I killed them (they were started from `~/projects/bay`
by my earlier session) — 3000/4000 are free; restart from this worktree
when needed. Zero-visual-diff screenshot comparison NOT completed
before the pause.

## NEXT (after BB-216)
- BB-213 / BB-215 re-queue after BB-216 (manager, D-24).

## BLOCKERS
- None that block the handoff; canvas verdict is the founder's.

## PRODUCT ASSUMPTIONS
Canvas is design authority (founder directive); domain stays game-rule
authority; no rules changed for visuals. Repo vocabulary (Reservation
value / Clock multiplier / Concession chips) replaces canvas mockup
labels. Rating numbers omitted (no rating system — P1-M2); unrated tag
used.

## W2-02 — IN HANDOFF STATEMENT (packages/intelligence → worker-3)

Authored by me at baseline `f1e8c99`; already committed and merged
forward into this branch — **no new commit is needed from me for the
handoff itself**; this statement is the record. I confirm I am no longer
editing `packages/intelligence/`; ownership transfers to worker-3.

**Complete (authored, tested green at baseline):**
- `packages/intelligence/src/types.ts` — versioned types (`feature-engine-0.1.0`, `observation-engine-0.1.0`), `BehaviorFeatures` (~60 features), `MatchObservation`, `ObservationThresholds` + defaults.
- `src/features.ts` — pure deterministic feature engine over (MatchState, DomainEvent[], EconomyConfig): `classifyMoves` (per-move classification: magnitudes, per-turn active time with pause-span subtraction, unreciprocated flags, pitch proximity), `computeFeatures`, `finalDecisionMs`, `ownDisconnectSpans`.
- `src/observations.ts` — 26 deterministic observation rules (docs/20) with measurements + eventRefs.
- `src/curate.ts` — `curateReview`: RESULT-first, priority order, cap 5, outcome-aware dedup, fixed L1-only copy (`review-curation-0.1.0`).
- Persistence: migration `intelligence_analysis` (`match_features`, `match_observations`), `persistAnalysis` computed atomically in the terminal command's transaction (`command-service.ts`), `loadAnalysis`, `scripts/backfill-analysis.ts` (idempotent).
- API: `GET /v1/matches/:matchId/review` (participant-only, terminal-only, caller-scoped; `moments` + `curationVersion`), `POST /v1/analytics/event` (`review_opened`/`review_step_viewed`, stdout sink).
- Web: `/review/[matchId]` page (moments + linked timeline), ANALYZE DEAL on the result card, `review-flow.spec.ts`.
- Docs: `docs/18_NEGOTIATION_INTELLIGENCE.md`, `docs/19_BEHAVIOR_FEATURE_DEFINITIONS.md`, `docs/20_OBSERVATION_DEFINITIONS.md`, DEC-028, review contract in docs/08, IN track in docs/16.
- Tests: `packages/intelligence/tests/{helpers,features,observations,features.property,curate}.test.ts` (28 at baseline) + DB/API additions (56 DB+API tests green at baseline).

**Partial / deferred by design (not defects):**
- IN-3..IN-8 (longitudinal, knowledge base, RAG/coach, practice, improvement tracking, benchmarks) — not started, per the phase gate.
- `opponentRating` is always null (no rating system — P1-M2).
- `VERIFIED_INFORMATION_USE` / `AGREEMENT_AFTER_VERIFIED_REVEAL` marked NEEDS DEFINITION (depend on GR-028 dossiers, DD-M3/M4).
- Unreciprocated-concession family is structurally unreachable under current strict turn alternation; detectors are rigorous and synthetic-tested, documented in docs/20 (fires when hold/communication or async mechanics ship).

**Temporary:**
- Feature/observation/curation thresholds are code constants with version strings; a DB-row tuning story is recorded (docs/16/18) — no DB config table yet.
- `scripts/backfill-analysis.ts` is a one-shot idempotent tool, not a scheduled job.

**Known-broken / environment notes at baseline (all transient, resolved):**
- Stale Prisma client after the schema change was fixed with `prisma generate` (the client is not auto-regenerated by `migrate dev` in this setup).
- `timeout.spec.ts` requires strict-mode seed overrides (see below).
- Review page mobile polish deferred to the IN-2 UI checkpoint.

## FOUNDER CANVAS REVIEW — testing instructions

Screenshots: `design-sandbox/screenshots/` (`board-LMR-*` authority + `live-match-desktop-{mine,theirs,crossed}`, `live-match-mobile`, `acceptance-crossed-seal`, `reveal-final-{deal,nodeal}`, plus `in2-*` review shots).

Run the app (ports 3000/4000 are worker-2's; do not touch worker-1's 3100/4100):
```
pnpm install                      # one-time, from ~/projects/bay-w2
pnpm dev                          # web:3000 + api:4000
```
Play: http://localhost:3000/ → PLAY → pick a persona → Ready → negotiate.

E2E — reuse mode (against the running dev stack):
```
cd apps/web && E2E_REUSE_SERVERS=1 npx playwright test
```
E2E — strict mode (self-booted servers; seed the short timeout overrides first, stop any dev servers on 3000/4000):
```
E2E_HARD_LIMIT_MS=45000 E2E_WARN_LOW_MS=30000 E2E_WARN_CRITICAL_MS=10000 pnpm --filter @bounty-bay/db db:seed
cd apps/web && E2E_HARD_LIMIT_MS=45000 E2E_WARN_LOW_MS=30000 E2E_WARN_CRITICAL_MS=10000 npx playwright test
pnpm --filter @bounty-bay/db db:seed   # afterwards: restore default 90s limits
```
Canvas structural checkpoint (captures boards + live screen to `test-results/canvas/`):
```
cd apps/web && CAPTURE_CANVAS=1 E2E_REUSE_SERVERS=1 npx playwright test e2e/canvas-checkpoint.spec.ts
```
Unit/typecheck/build: `npx vitest run` · `pnpm typecheck` · `npx next build` (web).

## STATUS (W2-02 done)
Handoff statement above; debug `console.log` instrumentation confirmed removed (grep clean across `apps/web/src/components/game/*` and `apps/web/src/app/play/*`). No new UI work until the founder checkpoint verdict.
