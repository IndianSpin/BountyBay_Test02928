# CURRENT QA REPORT — Bounty Bay (Agent 5)

- **Base SHA:** `92a5e61` (current main; worktree `~/projects/bay-qa`, branch `qa-adversarial`)
- **Date:** 2026-09-23
- **Contract:** BB-206 / QA-01 adversarial baseline
- **Environment:** isolated `bounty_bay_qa` DB (docker postgres 5433, seeded E2E time controls 45s/25s/10s); E2E ports 3200/4200; probe API on 4300. Dev auth only (Clerk not configured locally — production auth untested, as expected in dev).

## Verdict

The product's **server-authoritative core is in strong shape**: every P0
integrity invariant probed from the wire held (27/27). Hidden information is
properly scoped at API, socket, and browser-surface levels. The two failures
found on the pre-W1-01 baseline were test-infra races that W1-01 fixed;
re-verified clean on current main. Real findings are UX/product-level
(QA-001, QA-004), a broken typecheck gate (QA-002), and one spec ambiguity
already routed to the founder (PDR-2).

## Key question resolved (BB-206)

**Does the accept-seal-while-ACTIVE transient still reproduce on current main?**
**No.** On `92a5e61`, with first-actor page selection, the accept seal
survives an early release while the match stays ACTIVE, and a full hold
settles the deal (`.agents/qa/tools/specs/qa-interruption.spec.ts` test 1, PASS). The transient
seen on `c70a448` was the OLD spec's stale-accept window (asserting on the
second mover's pre-broadcast page), not app state. Root cause fixed by
W1-01 (`0aec467`), merged in `bbf318e`.

## What was tested (baseline vs `92a5e61`)

| Layer | Result | Evidence |
|---|---|---|
| `pnpm typecheck` | **FAIL** — see QA-002 | `/tmp/qa-tc-main.log` |
| Unit suite | 226 passed / 47 skipped | run log |
| DB+API suite (clean seed, `RUN_DB_TESTS=1`) | 56/56 passed (incl. hidden-info audits, timeout scheduler) | run log |
| E2E suite (7 specs) | 9/9 passed, 1 capture-skip | `/tmp/qa-e2e-main.log` |
| Adversarial API battery (27 P0 probes) | 27 PASS + 1 INFO (GR-012 → PDR-2) | `.agents/qa/evidence/battery-results.jsonl` |
| Browser-surface leak scan (HTML, `__NEXT_DATA__`, storage, `/v1` bodies, WS frames, pre-result) | **clean** — zero `reservationValueTenths` field hits pre-result; the only post-result hit is the GR-018-legal reveal | `.agents/qa/evidence/qa-leak.json` |
| MATCH STATE INTERRUPTION matrix (refresh × pre-start/offer/mid-hold/waiting/result) | PASS with one defect: joiner refresh → QA-001 | `.agents/qa/tools/specs/qa-interruption.spec.ts` test 2 |
| Mobile ~390px (join, offer, crossed, hold-accept, result) | PASS — no horizontal scroll, full deal completes | test 3 + screenshots |
| Canvas checkpoint vs design boards (structural contract) | PASS (objects, fonts, ribbon strings, mobile composition) | `test-results/canvas/*.png` |
| IN-2 Game Review math vs actual events | verified correct on a real deal (RESULT moment, opening, chips, settlement all match the event log) | `.agents/qa/evidence/qa-discovery-review.md` |

## Findings index

- **QA-001** — joiner mid-match refresh shows "no challenge with that token" (MEDIUM, product) — `BUGS.md`
- **QA-002** — `pnpm typecheck` fails on main: `friend-match.spec.ts:249` TS2339 (HIGH, build gate) — `BUGS.md`
- **QA-004** — friend-mode Rematch resets to home; no rematch with the same opponent (PRODUCT) — `PRODUCT_FINDINGS.md`
- **PDR-2** — GR-012 walk-away doc-vs-behavior conflict (report only) — `PRODUCT_FINDINGS.md`
- INFO — IN-2 review envelope null fields (`surplusShareBp`/`settled`/`timeUsedMs`); RESULT moment has empty `eventRefs` — `PRODUCT_FINDINGS.md`

## Open risk notes (not findings)

- Production auth (Clerk) and ranked-mode queue are not exercisable in this environment — NOT TESTED.
- Two-tabs-same-user and spectator/third-party UI surfaces were probed at API level only (403s correct); UI-level double-tab behavior NOT TESTED.
- Pixel-level visual comparison could not be performed by this agent (no image rendering); the structural contract passed and screenshots are attached for an image-capable reviewer.

## Terminal state

REPORTED TO MANAGER. Stop per BB-206; no further test campaigns started.
