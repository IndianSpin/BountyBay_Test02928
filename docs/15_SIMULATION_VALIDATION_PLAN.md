# Game Simulation and Validation Plan

## Objective

Before polishing the product, test whether the economy creates multiple viable strategies, rewards skill, and resists obvious exploits.

## 1. Build a headless simulator from the domain package

Simulator inputs:

- reservation values;
- first mover;
- balance-config version;
- two strategy agents;
- stochastic seed;
- latency/thinking-time model.

Outputs:

- offers;
- settlement/no-deal;
- surplus shares;
- clock multipliers;
- concession spend;
- net results;
- number of turns;
- strategy metadata.

## 2. Initial strategy agents

Implement simple transparent agents before LLM agents:

1. **Extreme Anchor** — opens far from RV; reluctant movement.
2. **Moderate Anchor** — opens aggressive but plausible relative to own RV.
3. **Fast Closer** — prioritizes agreement and fast decisions.
4. **Hardball** — small movement, high willingness to no-deal.
5. **Micro-Conceder** — many minimum/small concessions.
6. **Chunk Conceder** — fewer large concessions.
7. **Reciprocal** — responds proportionally to opponent movement.
8. **Deadline Player** — waits strategically before moving.
9. **Random Legal** — baseline/noob.
10. **Search/Best-Response Agent** — computationally searches available policies under simplified assumptions.

## 3. Parameter sweeps

Sweep at least:

- clock floor times;
- clock curve shapes;
- concession K;
- concession alpha;
- chip budgets;
- bounty size;
- reservation/ZOPA distributions;
- opening extremes;
- response-time distributions.

Run enough seeded matches for stable estimates; target 100k+ simulated matches once simulator is cheap.

## 4. Questions simulation must answer

- Does one strategy dominate across broad conditions?
- Is extreme anchoring rationally dominant?
- Is micro-concession ever cheaper than intended?
- Do cost + clock jointly force one giant concession?
- Is no-deal too rare or too common?
- Does first mover have excessive advantage?
- Are buyer/seller outcomes symmetric after controlling for scenario?
- Does absolute number scale change outcome despite normalized costs?
- Does a 5-unit ZOPA behave comparably to a 5,000,000-unit ZOPA in strategic terms?
- Can a player exploit clock switching with invalid/no-op actions?
- Can a player get stuck with insufficient chips and no meaningful action besides accept/walk?

## 5. Hard invariants

Property-based tests should generate random legal RVs/offers and assert:

- settlement inside both RVs;
- surplus shares sum to 1 within fixed-point tolerance;
- buyer offer sequence strictly increases;
- seller offer sequence strictly decreases;
- multiplier in [0.30, 1.00];
- concession budget never negative;
- no-deal gross bounty = 0;
- event sequence strictly monotonic;
- same input state + command + config yields same output.

## 6. Human playtest gates

Simulation cannot establish fun. Human test phases:

### Phase A — controlled 20–40 users

Observe comprehension and obvious broken metas.

### Phase B — 100–300 recruited competitive users

Measure immediate replay and session depth.

### Phase C — open/free cohort

Measure D1/D7, matchmaking liquidity, invites, and rating signal.

## 7. Kill/redesign criteria

Strong redesign signal if, after basic UX fixes:

- most players understand rules but do not voluntarily rematch;
- one simple strategy dominates materially across simulations and human play;
- no-deal becomes the rational response when behind;
- clock/concession resources matter more than opponent interaction;
- rating fails to predict future surplus performance after sufficient games;
- human players consistently prefer AI because human matchmaking/gameplay feels worse rather than because of availability.

The objective is not to prove the founder right. It is to find reasons the game fails before expensive expansion.
