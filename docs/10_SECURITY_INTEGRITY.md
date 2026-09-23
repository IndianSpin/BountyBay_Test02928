# Security and Competitive Integrity

## Threat model

Bounty Bay combines hidden information, realtime state, ratings, chat, and later potentially prizes. Even V1 must assume users will inspect network traffic, modify clients, automate play, create multiple accounts, and attempt rating manipulation.

## V1 must-have controls

### SI-001 Hidden RV isolation

Opponent RV must remain server-side until result reveal. Never send a full `MatchParticipant` row to both clients.

Test with network inspection and API-contract tests.

### SI-002 Server-authoritative clock

Ignore client elapsed-time claims. Compute from server timestamps and stored cumulative active time.

### SI-003 Server-authoritative commands

Validate user identity, match membership, active turn, match status, command idempotency, amount, RV, concession direction, cost, and chip balance for every action.

### SI-004 Idempotency and race handling

Simultaneous/duplicate offer or accept requests must resolve exactly once. Use transactional row locking/version checks and `command_id` uniqueness.

### SI-005 Rate limiting

Rate limit:

- login/auth abuse through provider;
- matchmaking joins/leaves;
- chat;
- offer/accept command spam;
- profile enumeration where appropriate.

### SI-006 Chat moderation

Minimum V1:

- block/report capability;
- length/rate limits;
- automated toxicity/spam screening if practical;
- audit trail for moderator redaction.

Do not make negotiation bluffing itself a moderation violation.

### SI-007 AI disclosure

Never disguise AI as human. Store opponent type in match record.

### SI-008 Rating integrity

- AI/async excluded.
- Friend challenges unrated in v0.1.
- Detect repeated paired opponents and suspicious outcomes for later integrity review.

### SI-009 Server-determined timeout (DD Phase 1)

The hard decision-time budget (GR-023) and timeout (GR-024) are
server-determined only:

- Clients can neither trigger nor defer a timeout — there is no client
  route for it; the server scheduler submits the TIMEOUT command.
- The domain rejects the transition unless the active player's
  server-computed elapsed time has actually reached the limit
  (`TIMEOUT_NOT_DUE`), so a misfired timer cannot fabricate a timeout.
- After the limit, gameplay commands are rejected (`TIMED_OUT`) — the
  domain guard closes the race between the deadline and the scheduler's
  timer and survives a crashed/restarting scheduler.

Test with API-contract tests (no timeout route exists; post-limit commands
are rejected) and scheduler tests (over-limit matches time out on boot
scan).

## Disconnect integrity

Product decision: genuine disconnect freezes active clock. Known exploit: player can deliberately disconnect to think for free.

V1 safeguards:

- short reconnect window;
- log disconnect frequency/duration;
- cap repeated freezes per match in a future balance rule if abuse appears;
- technical-abort logic feature flagged;
- never trust client `online` state alone; server/socket determines connection status.

The hard personal decision-time budget (GR-023) bounds freeze-then-think
abuse: time does not accrue while the clock is frozen, but the total
active-decision budget per player is capped regardless, so deliberate
disconnects cannot extend total thinking time (cross-ref OQ-009).

This remains an open integrity issue and must be measured during testing.

## Bot/automation risk

V1 does not need enterprise anti-bot infrastructure, but record:

- action timing distributions;
- repeated message templates;
- impossible reaction speed;
- account/device/session linkage signals allowed by privacy policy.

Do not ban automation based on one heuristic alone.

## Collusion / multi-accounting future

Before cash prizes:

- stronger identity verification/KYC as legally required;
- device/account graphing;
- opponent pairing controls;
- chip-transfer impossibility;
- suspicious settlement detection;
- real-time and retrospective review;
- geolocation/jurisdiction controls as required.

These are **real-money prerequisites**, not V1 tasks.

## AI-analysis security

If LLMs later analyze chat/replays:

- treat user chat as untrusted input, not instructions;
- never expose secrets/system prompts;
- use structured data separation;
- limit tool access;
- redact personal data where possible;
- analysis cannot mutate authoritative match history.

## Secrets and environment

- no secrets committed to repository;
- `.env.example` names only;
- production secrets in deployment manager;
- least-privilege DB and provider keys;
- separate development/staging/production resources.

## Logging

Never log:

- auth tokens;
- passwords;
- full third-party secrets.

RV values may appear in protected server audit/debug logs only if necessary; default operational logs should prefer match IDs and rule error codes. Analytics event logs (docs/11, DD Phase 1) must never carry RV values.
