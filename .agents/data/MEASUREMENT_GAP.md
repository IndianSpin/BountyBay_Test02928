# MEASUREMENT GAP — north-star metrics vs what is measured today

DATA-01 deliverable. Inspected against main `8be2347` (2026-09-23).
"Smallest sufficient addition" discipline: no platform design; P1-M9
(analytics platform) stays deferred. Evidence basis: docs/11 required
events + emitters in `apps/api/src/analytics.ts` +
`apps/web/src/lib/analytics.ts` + authoritative rows (matches,
match_events, users). Full inspection: `INSPECTION_REPORT.md` in this
lane; proposed event details: `EVENT_CATALOG.md`.

| # | North-star metric | Measured today? | Smallest sufficient addition |
|---|---|---|---|
| 1 | DAU | **Derivable** — users with ≥1 match started per calendar day (`matches.startedAt` / MATCH_STARTED rows) | Derivation query + `environment` tag so dev/test/prod rows can't mix. No new events. |
| 2 | Active days per WAU | **Derivable** — same basis; definition not approved | Approved active-day definition (proposed: ≥1 match started that day) + mean/median/distribution query |
| 3 | D1/D7/D30 retention | **Derivable** — `users.createdAt` + match-activity dates | Cohort query over users × match dates. No new events. |
| 4 | Matches / player | **Derivable** — `matches` + participants | Query. No new events. |
| 5 | Matches / session | **Not defined** — no session concept in product | Product decision: accept day-based proxy (match bursts per user-day) for V1 or define sessions. No instrumentation until defined. |
| 6 | Immediate rematch | **Partially** — behavior derivable (next match started by same user within window of previous completion); intent (click) not measured | Approved window (proposed 10 min) + query; `rematch_clicked` client event for intent (small) |
| 7 | Core funnel (visit→auth→handle→tutorial→first match→result→second match) | **Partial** — users.createdAt (auth) + matches (first/second match) only. No visit, no handle timestamp, no result view. Tutorial not in product. | `signup_completed` + `handle_created` (server, small); `result_viewed` (server, small); tutorial events when tutorial ships (future). Visit/page-load: deliberately NOT tracked in V1 (server-side funnel is the truth). |
| 8 | Completion rate / agreement rate / human-vs-AI split / offer cadence | **Derivable** — completionReason, match_results, aiPersonaKey, match_events/offers rows | Queries (docs/11 already names event rows as the source). No new events. |
| 9 | Disconnect / timeout / walk-away health | **Derivable + partly emitted** — PLAYER_DISCONNECTED/TIMED_OUT rows; match_timed_out/time_tier_entered/match_completed emitted | Disconnect anomaly *prevalence* query; emitted lines need `environment`/`release` tags |
| 10 | Critical technical errors (API errors, client exceptions, WS failures, AI failures, latency) | **NOT measured** — Fastify logger disabled; no error handler; no client exception capture; realtime catches silent | Biggest gap. Structured logging on (built-in, no new dep) + error handler + `client_exception` capture + release identification. See FOUNDATION_PLANS.md F2–F4. |
| 11 | Game Review / coaching loop (docs/18 §15) | **Partial** — `review_opened`, `review_step_viewed` emitted | Coach/practice/recurrence events are future (IN-4..6); nothing needed now. Review loop queries: % matches followed by review (derivable once review_opened is durable — see note). |
| 12 | Experiment exposure (EXP-001..005, Daily Deal) | **Not measured** — no flag/experiment infra exists | Watch item: exposure recording designed BEFORE first experiment ships (E7 in FOUNDATION_PLANS). Not a Phase 1 build. |

## Notes

- **Sink fragility:** all emitted lines go to stdout only, with no
  durable store and no `environment`/`release` tags — today they vanish
  in CI/deploys. Adding the two tags (boot-time) is the single smallest
  change that makes existing lines trustworthy; durable storage is a
  founder decision (deferred to P1-M9; a minimal append-only table would
  be a manager-reviewed migration — NOT proposed in Phase 1).
- **Client events are best-effort** (fire-and-forget, silent failure —
  by design). All metrics in rows 1–8 rest on server rows, not client
  events, so best-effort client events do not corrupt the core metrics.
- **Causal claims:** none of this establishes causation; cohort
  comparisons only (evidence taxonomy, D-15).
- Nothing here requires schema/API changes except the additive
  `/v1/analytics/event` enum extension (rows 6–7 intent events) — flagged
  as an API contract change for INTEGRATION_QUEUE.
