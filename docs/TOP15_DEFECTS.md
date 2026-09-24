# TOP-15 DEFECT CANDIDATES — BB-264 (upstream-impact ordered)

QA Agent 5 candidate list for the repair queue. "Upstream-first": items
that unblock founders/workers/matrix-legs rank above polish. Status
tracks the manager's task board; RESOLVED items are kept as context.

| # | Defect | Severity | Status | Owner | Upstream impact |
|---|---|---|---|---|---|
| 1 | SH4 result-reveal visual deviation (dark fixed overlay over the scene — founder G-5, QA-confirmed) | HIGH (visual acceptance) | OPEN | W2 (BB-256 golden reference) | Blocks founder visual sign-off of Journey A; matrix VISUAL now R |
| 2 | Profile/training update missing after AI match | MEDIUM (journey loop) | KNOWN RED → BB-258 | W3 | Journey B completion loop; retention |
| 3 | Dev-build banner/overlay clipping (QA-008) | LOW (dev-only) | → BB-236 | W2 | Founder screenshot reviews see a wrong frame |
| 4 | PDR-2: GR-012 walk-away wording vs turn-gated implementation | LOW (spec ambiguity) | OPEN with founder | founder | Rule clarity before ranked-mode rating |
| 5 | Challenges JOIN route rate limit still hard-30/min (BB-250 gave gameRouteCap to most, join left fixed) | LOW (suite-gate risk) | WATCH | W1 | Next suite-size growth hits it first (BB-243 class) |
| 6 | Game Review feature nulls + empty RESULT eventRefs (QA INFO) | LOW | WATCH | W3 | Before BB-203 timeline wiring — dead links risk |
| 7 | Mobile not walked: Game Review / Rematch / back-to-Bay (matrix N cells) | LOW (coverage) | QA next pass | QA | BB-249 Phase 7 will cover on hosted |
| 8 | — RESOLVED — QA-009 ready 30/min self-exhaustion (BB-250 gameRouteCap merged) | HIGH→fixed | RESOLVED | W1 | strict-suite gate green again |
| 9 | — RESOLVED — QA-006 signin 30/min self-exhaustion (BB-222 dev-only 300/min) | HIGH→fixed | RESOLVED | W1 | |
| 10 | — RESOLVED — QA-007 insights fixed-subject pollution (BB-223) | LOW→fixed | RESOLVED | W1 | |
| 11 | — RESOLVED — QA-005 illegal hero CTA (D-28 seal neutralization, verified) | MEDIUM→fixed | RESOLVED | W2 | founder item 10 closed |
| 12 | — RESOLVED — QA-001 joiner-refresh error (BB-215 redirect, verified) | MEDIUM→fixed | RESOLVED | W2 | |
| 13 | — RESOLVED — QA-004 friend-rematch dead-end (BB-219b mutual-consent rematch) | PRODUCT→fixed | RESOLVED | W2 | |
| 14 | — RESOLVED — QA-002 typecheck gate break (BB-214; L-007 makes typecheck mandatory in the manager gate) | HIGH→fixed | RESOLVED | W1 | |
| 15 | — RESOLVED — AI table talk static-flavor gap (BB-254 engine + BB-257 wiring; QA re-walk GREEN, D-80) | PRODUCT→fixed | RESOLVED | W3/W1 | |

Open work for the repair queue: items 1–7.
