# REGRESSION MATRIX — Bounty Bay (Agent 5)

Last run: 2026-09-23, base `92a5e61`. Statuses: PASS / FAIL / NOT
IMPLEMENTED / NOT TESTED. Environment: dev auth only; isolated QA DB;
E2E ports 3200/4200.

## Critical flows

| Flow | Status | Evidence |
|---|---|---|
| AUTH (dev identity, stale-token self-heal) | PASS | `stale-auth-recovery.spec.ts`; suite 9/9 |
| AUTH (Clerk/production) | NOT TESTED | no Clerk keys in this environment |
| TUTORIAL / onboarding | NOT IMPLEMENTED | no tutorial flow in the V1 build |
| CREATE/JOIN MATCH (share link) | PASS | `friend-match.spec.ts`; battery challenge/join probes |
| READY / START (both ready → ACTIVE) | PASS | suite; battery |
| OFFER (legal, boundary, direction, duplicate) | PASS (27/27 probes) | `.agents/qa/evidence/battery-results.jsonl` |
| CHAT (no turn transfer, GR-013) | PASS | suite; battery probe |
| ACCEPT (hold seal, early-release cancel, full-hold settle) | PASS on `92a5e61` | suite + `qa-interruption.spec.ts` test 1 |
| ACCEPT legality (superseded/own/non-turn offers) | PASS | battery (409 OFFER_NOT_CURRENT / NOT_YOUR_TURN) |
| ACCEPT race (concurrent accepts, single settlement) | PASS | battery |
| WALK AWAY (active player, confirm hold) | PASS | `hold-accept.spec.ts` |
| WALK AWAY by non-active player | FAIL vs GR-012 text → PDR-2 (report only) | battery INFO line |
| TIMEOUT (tiers + distinct outcome, GR-023/024) | PASS | `timeout.spec.ts`; DB timeout-scheduler tests |
| DISCONNECT → freeze after debounce (GR-015) | PASS | battery (remaining stable across 2.5s window) |
| RECONNECT → resume same clock | PASS | battery (remaining decreased after resume) |
| RESULT (settlement math, both-RV reveal GR-018) | PASS | battery; suite reveal assertions |
| RESULT refresh (persists after reload) | PASS | `qa-interruption.spec.ts` test 2 |
| REMATCH | FAIL (product): friend-mode resets to home — QA-004 | `qa-interruption.spec.ts`; `PRODUCT_FINDINGS.md` |
| AI MATCH (practice vs personas, GR-020 label) | PASS | `practice-vs-ai.spec.ts`; ai-hidden-info audit (DB suite) |
| GAME REVIEW (moments vs actual events) | PASS (math verified on real deal) | `review-flow.spec.ts`; `.agents/qa/evidence/qa-discovery-review.md` |
| DAILY DEAL | NOT IMPLEMENTED | gated (docs) |

## Interruption matrix (L-004 — refresh at each state)

| State × refresh | Status | Note |
|---|---|---|
| Pre-start, creator (B ready, A not) | PASS | resume link restores staging; no soft-lock |
| Mid-match, creator/active player | PASS | board restores; offer history intact, no duplicates |
| Mid-hold (reload during accept hold) | PASS | hold never commits; seal returns |
| Mid-match, joiner | **FAIL → QA-001** | "no challenge with that token"; manual resume click required |
| Result screen | PASS | reveal persists (GR-018) |
| Rematch click | FAIL → QA-004 | exits to home; opponent not re-invited |

## Mobile ~390 px

| Check | Status |
|---|---|
| Join → ready → offer → crossed → hold-accept → result, full deal | PASS |
| Composer, offer input, submit visible; no horizontal scroll | PASS |
| Accept hold gesture (pointer events on touch context) | PASS |
| Evidence | `.agents/qa/evidence/mobile-390-*.png`, `live-match-mobile.png` |

## Hidden information (GR-002 / SI-001)

| Surface | Status |
|---|---|
| REST bodies pre-result (incl. BATNA narratives) | PASS — API audit tests (DB suite) |
| Socket.IO frames pre-result | PASS — API audit + browser scan |
| Browser DOM / `__NEXT_DATA__` / localStorage / sessionStorage | PASS — browser scan (zero field hits) |
| Non-participant access (snapshot/result/review/events/commands) | PASS — 403 NOT_A_MATCH_PARTICIPANT |
| Post-completion reveal | PASS — GR-018 legal, both RVs |
