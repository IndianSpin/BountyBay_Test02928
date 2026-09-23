# DECISIONS — Bounty Bay (coordination records)

Product decisions requiring the founder are marked **PRODUCT DECISION
REQUIRED**. Canonical records of adopted decisions live in
`docs/12_DECISION_LOG.md`; this file is the manager's working record.

## PDR-1 — PRODUCT DECISION REQUIRED: Negotiation-agent architecture

**Issue.** Founder directive (2026-09-23): replace the five DEC-025 personas
(Anchor/Grinder/Closer/Wall/Mirror, deterministic numeric strategies, no LLM
in decision path) with a 7-layer Bounty Negotiation Agent: mandate/belief
state/strategy/tactic selection/economic action (deterministic) +
communication/personality (LLM as actor, not decision-maker), opponent
modelling, tactical repertoire, difficulty = reasoning depth, adversarial
coaching, persistent adaptation, Real World Mode.

**Why it matters.** Solo play is the strategic product entry (DEC-025);
the directive claims the current personas are too shallow for a sticky
practice product and makes the agent core IP.

**Options.**
1. **Adopt + defer (recommended):** DEC-030 records the directive; new
   canonical doc (docs/22) with the 7-layer architecture; supersedes
   DEC-025's persona resolution (OQ-008 re-opened → re-resolved); AI
   economic actions still pass domain validation; implementation deferred
   until after IN-2 checkpoint and DD Phase 1 sign-off. No code changes now.
2. Adopt + implement immediately (collides with W2/W3 mid-flight IN work;
   not recommended).
3. Hold as draft; decide later.

**Affected work.** `packages/ai` (personas), DD-M7 (AI/spectator/replay,
deferred), IN-6 (practice personas), IN-3 (longitudinal profile —
"persistent adaptation" reuses its confidence bands), DEC-025 difficulty
ladder.

**Can work continue safely?** Yes. IN-1/2, canvas slices, and DD Phase 1
are unaffected; `ai-personas-0.1.0` is already config-driven and versioned
per match, which is the seam the agent engine would replace later.

**Status:** awaiting founder decision. Manager drafts DEC-030 + docs/22
outline on confirmation (EM-02).

## D-1 — Baseline commit accepted provisionally

`f1e8c99` "Initial baseline" (589 files, all workstreams) on main is
accepted as the repository baseline. Audit: only `.env.example` files
committed (no secrets); one temp file slipped in → TD-1. Verification
(manager, 2026-09-23 02:45): per-package typecheck exit 0; unit suite
216 passed / 47 skipped. DB (51) + E2E (8/10) were worker-reported;
E2E follow-ups are W1-01. Result: baseline verified.

## D-2 — Worker mapping (2026-09-23)

- **worker-1** = session `gameplay-depth-anti-stalling` — DD track:
  domain, mechanics, API, acceptance-slice files (ownership table in
  worker-1.md).
- **worker-2** = session `bounty-bay-p1-roadmap` — frontend/design:
  canvas slices, board/result, `globals.css`, `design-sandbox`. Also
  authored IN-1/2 (`packages/intelligence`, DEC-028); that ownership
  transfers to worker-3 at baseline (handoff statement W2-02 owed).
- **worker-3** = session `jeremydommnich-c7` — IN track: analytics,
  coaching, content infrastructure; `packages/intelligence`, docs/19–20.

## D-3 — Sequencing conflict (open with founder)

docs/16 says IN starts after P1-M1 and "the DD track resumes after";
DEC-026 says DD runs after P1-M1 — both claim the same slot. IN-2 absorbs
DD-M7 (no-deal analysis, DEC-028). Current operating order: IN-1/2 (in
flight) → DD-M2..M6 → IN-2+ features needing DD-M3/M4/M5. Not silently
resolved; founder to confirm at next checkpoint.

## D-4 — Ports and database safety

W2 owns dev servers 3000/4000. W1 E2E uses alt ports 3100/4100 with the
isolated `bounty_bay_e2e` DB (5433, seed overrides `E2E_*`). Dev DB (5432)
shared; any Prisma migration or destructive DB action needs manager review
first (shadow-database incident policy). No destructive reset/drop against
non-disposable databases, ever.

## D-5 — Git model (protocol)

Per worker protocol: one branch + worktree per worker. Branches
`w1-dd-mechanics`, `w2-frontend-design`, `w3-intelligence` cut off
`f1e8c99`; worktrees at `~/projects/bay-w1`, `~/projects/bay-w2`,
`~/projects/bay-w3` (each needs its own `pnpm install`). Main receives
reviewed changes only, in merge order W1 → W3 → W2. The original checkout
(`~/projects/bay`) stays on main as the manager/integration checkout.

## D-6 — Canonical docs are manager-reviewed

Workers do not edit `docs/*` directly; they propose changes in their
worker file (PRODUCT ASSUMPTIONS / doc-change notes). Manager applies
canonical doc changes and records conflicts in this file. Exceptions:
docs/19–20 are W3's working specification documents — W3 edits them, but
flags any change to a canonical rule in its worker file.
