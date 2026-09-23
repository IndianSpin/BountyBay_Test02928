# Product Requirements Document — V1

## 1. Objective

Build a free, mobile-first competitive bargaining product that can answer the primary validation question:

> Do competitive individuals voluntarily repeat single-issue human bargaining when outcomes are objectively measured and made consequential through rating, match economy, and time pressure?

V1 is a validation product, not a real-money gambling product and not an enterprise negotiation platform.

## 2. Success criteria

Primary behavioral success signals:

- first-match completion rate;
- immediate voluntary rematch rate;
- matches per active user;
- D1 and D7 return;
- human-match preference vs AI;
- friend invites/challenge conversion;
- rated matchmaking liquidity;
- evidence that higher-rated players systematically perform better;
- evidence that no single simple strategy dominates.

Initial validation thresholds are defined in `15_SIMULATION_VALIDATION_PLAN.md` and `11_ANALYTICS_EXPERIMENTS.md`.

## 3. User

Primary V1 user: competitive individual who enjoys psychological/strategic competition. They may value fun, mastery, status, learning, or future prizes; V1 does not assume one motivation is dominant.

## 4. Functional requirements

### PRD-001 Authentication and handles

- Users can create/sign into an account.
- Public identity defaults to a unique anonymous handle.
- Real name is not required for public play.

### PRD-002 Profile

Public profile shows canonical rating, rated games, agreement rate, and average surplus captured.

### PRD-003 Game modes

V1 product surface includes:

- ranked synchronous human PvP;
- AI practice;
- private human challenge;
- async human experimental mode.

Only eligible ranked synchronous human PvP updates canonical rating.

### PRD-004 Scenario assignment

Server assigns a lightweight fantasy scenario, buyer/seller roles, legal positive RVs with positive ZOPA, first mover, and balance-config version.

### PRD-005 Private role reveal

Each player sees:

- asset/context;
- role;
- own RV;
- short BATNA/mandate narrative;
- concise rules.

They do not receive an aspiration/target number or opponent market reference information in Fantasy V1.

### PRD-006 Live negotiation

Support:

- valid numerical offers;
- free-text chat;
- explicit accept;
- walk away;
- real-time visible clock/multiplier;
- visible concession-chip budget/spend;
- reconnect/resume.

All authoritative actions are validated server-side.

### PRD-007 Amount entry

UI accepts positive decimal values to one decimal, normalized to integer tenths internally. Reject invalid formatting, zero, negative, scientific notation, and values above max.

### PRD-008 Concession legality

Opening offer is free. Subsequent offers must move strictly toward opponent and pass affordability rules.

### PRD-009 Match result

Show complete reveal and transparent calculation breakdown. Results must be reproducible from stored event history + config version.

### PRD-010 Replay

Provide chronological timeline of offers, chat, clock ownership changes, accept/walk-away, and result. Replay need not animate every millisecond; event chronology is sufficient for V1.

### PRD-011 Matchmaking

Provide ranked queue. Match users using rating bands when liquidity permits and widen safely over wait time. Never fabricate a human opponent.

### PRD-012 AI fallback

Offer AI play when human liquidity is unavailable. AI matches are clearly labeled and unrated. AI action generation cannot bypass domain validation.

### PRD-013 Async

Provide experimental async infrastructure behind a feature flag. Do not enable publicly until async timing rules in `14_OPEN_QUESTIONS.md` are resolved.

### PRD-014 Rating

Maintain a canonical Bounty Rating for eligible synchronous human ranked matches. Exact formula is provisional and isolated behind a versioned rating service/config.

### PRD-015 Analytics

Implement event instrumentation before external testing. Product decisions must be possible from captured events without relying on anecdotal feedback alone.

### PRD-016 Admin/config

Authorized admin can adjust versioned game-balance parameters without code changes:

- match bounty;
- concession budget;
- concession cost constants;
- clock floor-time/curve parameters;
- matchmaking thresholds;
- AI fallback wait;
- feature flags.

Changes apply only to newly created matches and are stored with each match.

## 5. Non-functional requirements

### Reliability

- Authoritative game actions must be idempotent.
- A reconnecting client can reconstruct match state from server data.
- Duplicate accept/offer submissions cannot produce duplicate settlements.

### Performance

- Live offer/chat propagation should feel immediate under normal consumer broadband.
- V1 design target: p95 server action acknowledgement <500ms excluding external AI inference.

### Security

- Opponent RV never leaks pre-result.
- User cannot submit actions for another player.
- User cannot manipulate server clock via client timestamps.
- Rate limit chat/action endpoints.

### Auditability

Persist immutable game events sufficient to reproduce settlement and economy result.

### Accessibility/responsiveness

- Mobile-first responsive web UI.
- Keyboard accessible.
- Color is never the sole carrier of game state.

## 6. Launch criteria

Do not call V1 test-ready until:

- core invariants have automated tests;
- two-browser human match passes end-to-end;
- reconnect test passes;
- hidden RV penetration test passes;
- result calculation is reproducible;
- analytics events are verified;
- AI cannot produce illegal committed actions;
- admin balance config is versioned;
- moderation/reporting minimum exists for public chat.
