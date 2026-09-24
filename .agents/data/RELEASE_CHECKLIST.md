# RELEASE CHECKLIST (DRAFT)

DATA-01 deliverable. Gates a meaningful external playtest/release per
D-15: "workers ready · QA: no unresolved CRITICAL game-flow/integrity
defects · DATA: critical analytics + error reporting functioning ·
manager: integration reviewed · founder: checkpoint where product/design
decisions materially matter. Known risks documented explicitly; no
absolute bug-free demanded."

**Status: DRAFT.** Items marked (TODO) describe infrastructure that does
not exist yet — they become binding only after the manager schedules the
corresponding work (FOUNDATION_PLANS.md DA-P1-*). Items not marked TODO
are executable today.

## 0. Release identification (before anything else)
- [ ] Release commit SHA recorded; `environment` tag defined
      (development / e2e / qa / production). ✅ BB-229 (2026-09-24):
      boot-time `BB_ENV`/`BB_RELEASE` injection live in the API
      (verified: /health + every analytics line). Client-side release
      id ships with BB-230.
- [ ] Previous good SHA recorded as the rollback target.

## 1. Workers ready
- [ ] All task-board rows for this release ACCEPTed (D-8); no READY FOR
      REVIEW items silently included.
- [ ] `pnpm lint` clean.
- [ ] `pnpm typecheck` clean (all packages).
- [ ] `pnpm test` (unit) green.
- [ ] `pnpm test:db` green against a disposable/fresh DB.
- [ ] `pnpm test:e2e` green (critical path: friend match, hold/accept,
      timeout, canvas checkpoint).
- [ ] `pnpm build` (web) succeeds.

## 2. QA gate (Agent 5, .agents/qa/)
- [ ] No unresolved CRITICAL defects in game flow/integrity
      (`.agents/qa/BUGS.md`): match economics, hidden information,
      timers, acceptance, reconnect, auth, DB migrations, AI legality,
      result calculation, major player flows (D-15 mandatory QA list).
- [ ] HIGH/other findings triaged by manager with explicit
      defer/accept rationale.

## 3. DATA gate (this agent) — "critical analytics + error reporting
## functioning"
- [ ] Core events emit and parse: `match_completed`,
      `match_timed_out`, `time_tier_entered`, `review_opened`,
      `review_step_viewed` present with required fields. ✅ BB-229
      verified 2026-09-24 (live emitted-line inspection). (TODO:
      analytics smoke test automated in CI — DA-P1-4.)
- [ ] Funnel + retention events emitting: ✅ API-side via BB-229 —
      `signup_completed`, `handle_created`, `result_viewed` (verified
      live, incl. exactly-once and dedup semantics); ⏳
      `rematch_clicked`, `play_again_clicked`, `client_exception`
      capture = BB-230 (W2), pending.
- [ ] Error reporting functioning: ✅ API structured logs on
      (ENABLE_JSON_LOGS / production), request ids, error handler
      active (BB-229). ⚠️ Open defect BB-229-1: parser-level 400s
      (malformed JSON) reply 500 — fix-forward patch specified in
      `BB-229-VERIFICATION.md`; gate blocked until fixed.
- [ ] Privacy: emitted lines carry no reservation values / tokens /
      secrets (docs/10; extend hidden-information audit to analytics
      lines — ✅ BB-229 da-p1 tests + live privacy grep: 0 RV
      occurrences).
- [ ] Test/dev activity distinguishable from production
      (`environment` tag + DB separation; bots identifiable via
      `isBot`).
- [ ] Data-quality spot check on the target environment: event volumes
      reasonable, no duplicate floods, IDs populated, timestamps valid.

## 4. Manager gate
- [ ] Integration reviewed; INTEGRATION_QUEUE state matches the
      release commit.
- [ ] Migrations reviewed (D-4); none destructive against
      non-disposable DBs; shadow DB diff clean.
- [ ] Environment-variable check: Clerk keys present in production;
      `DEV_AUTH_SECRET` absent in production; `CORS_ORIGIN` pinned;
      `NODE_ENV=production`; no `.env` files committed (secrets check).
- [ ] DB separation verified: dev / test / shadow / production
      (shadow-DB incident policy).

## 5. Founder checkpoint
- [ ] Founder signs off where product/design decisions materially
      matter (canvas verdict, phase checkpoints).

## 6. Deploy + post-release
- [ ] Smoke test on the target environment: `/health` + one complete
      playable match. (TODO: deploy mechanism does not exist yet —
      first release needs one.)
- [ ] Analytics smoke on the target environment (one parsed line with
      correct tags). (TODO.)
- [ ] Rollback plan executable (previous SHA + documented procedure).
- [ ] First 24h watch: API error rate, client exceptions, socket
      disconnect anomalies, match-abandonment spike — vs the
      MEASUREMENT_GAP baselines. Known risks documented explicitly
      (D-15: no absolute bug-free demanded).

## Known-risk register (to fill per release)
- Single-instance timer assumption (TimeoutScheduler/AiTurnEngine —
  bootScan re-arm is restart-safe, not multi-instance-safe).
- Stdout-only analytics sink (until P1-M9) — lines are best-effort.
- Client events fire-and-forget by design.
