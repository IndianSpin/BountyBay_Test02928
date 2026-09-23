# Game Economy

This specification separates stable economic principles from tunable balance parameters.

## 1. Stable principles

### GE-001 — Available bargaining surplus

For V1 ranked scenarios:

`zopa = buyer_max - seller_min`

`zopa > 0` is required.

### GE-002 — Surplus share

For settlement `p`:

`seller_share = (p - seller_min) / zopa`

`buyer_share = (buyer_max - p) / zopa`

For any valid settlement:

`seller_share + buyer_share = 1.0`

This is the canonical measure of distributive bargaining outcome.

### GE-003 — No deal

No deal produces zero bounty reward for both players.

Concession spend already incurred remains recorded/spent in match-economy metrics.

### GE-004 — Fresh per-match concession budget

V1 testing gives every player the same fresh concession-chip budget at match start. It resets between matches. There is no persistent purchasable chip balance in V1.

This prevents real-money economics from contaminating early demand testing while preserving the strategic cost of movement.

### GE-005 — Concession cost shape

Required invariant:

- a larger concession costs more total chips than a smaller concession;
- marginal/per-unit concession cost declines as concession magnitude increases;
- cost is scale-independent: economically similar proportional movements should behave similarly whether offers are tens, thousands, or millions;
- opening offer is free.

### GE-006 — Scale-independent concession magnitude

Because V1 amounts are strictly positive, use symmetric log-ratio movement as the provisional normalized concession magnitude:

`m = abs(ln(new_offer / previous_offer))`

Properties:

- `100 -> 50` and `50 -> 100` have equal magnitude;
- `1,000,000 -> 500,000` has the same magnitude as `100 -> 50`;
- raw currency scale does not dominate cost.

This is a provisional but mathematically coherent choice. It must be simulation-tested before it becomes a permanent product rule.

### GE-007 — Provisional concession-cost function

Use a concave power function over normalized movement:

`cost = ceil(K * m^alpha)`

where:

- `K > 0` is configurable;
- `0 < alpha < 1` is configurable;
- minimum cost for any non-zero concession is 1 chip.

This guarantees higher total cost with declining marginal cost in normalized concession space.

Do not hardcode `K` or `alpha` in domain logic. Load them from versioned server-side balance configuration.

### GE-008 — Clock payout multiplier

Live-mode thinking time lowers the player's personal bounty multiplier.

V1 principle:

- starts at 100%;
- declines with cumulative active decision time;
- never recovers;
- floor is **30%**;
- opponent can see the current multiplier;
- no-deal still yields zero regardless of multiplier.

Provisional function for first simulation:

`multiplier(t) = max(0.30, 1 - 0.70 * min(t / T_floor, 1))`

where `T_floor` is configurable cumulative active time at which the 30% floor is reached.

The function shape is provisional. The 30% floor is a product decision.

### GE-009 — Gross bounty reward

If a deal occurs:

`gross_reward_i = MATCH_BOUNTY * surplus_share_i * clock_multiplier_i`

If no deal:

`gross_reward_i = 0`

Clock loss is burned/banked inside the abstract test economy; it is not transferred to the opponent.

### GE-010 — Net match economy result

For V1 testing:

`net_result_i = gross_reward_i - concession_chips_spent_i`

Also record `remaining_concession_budget` independently.

The UI must not collapse all concepts into one opaque score. At result time show at minimum:

1. surplus captured;
2. clock multiplier;
3. concession spend;
4. net match result.

This lets us determine whether players are learning the bargaining game or merely optimizing secondary resources.

## 2. Provisional starting balance configuration

These values are **test defaults**, not settled product decisions:

| Parameter | v0.1 default | Status |
|---|---:|---|
| Match bounty | 100 chips | Provisional |
| Concession budget per player | 100 chips | Provisional |
| Concession K | 10 | Provisional |
| Concession alpha | 0.60 | Provisional |
| Clock multiplier start | 1.00 | Settled principle |
| Clock multiplier floor | 0.30 | Settled |
| Cumulative time to floor | 60 seconds | Provisional — the directive's test default supersedes the earlier 120 s value (DEC-026) |
| Per-turn clock grace | 0 seconds | Provisional |
| Hard decision-time limit | 90 seconds | Provisional (GR-023; absent = no limit for legacy configs) |
| Timeout policy | `ATTRIBUTED_NO_DEAL` | Provisional; only supported value (GR-024) |
| Time warning LOW / CRITICAL | 30 / 10 seconds remaining | Provisional UI thresholds (docs/09) |
| Offer precision | 0.1 | Settled |

All provisional values must be server-configurable and versioned per match so historical results remain reproducible after balance changes.

## 3. Economy examples

### Example A — clean 50/50 deal

- seller RV = 40
- buyer RV = 100
- settlement = 70
- seller share = 50%
- buyer share = 50%

If both multipliers are 100% and both spent 4 concession chips:

- gross reward each = 50
- net result each = 46

### Example B — strong bargaining but slow

- seller RV = 40
- buyer RV = 100
- settlement = 82
- seller share = 70%
- seller multiplier = 40%
- seller concession spend = 6

Seller gross reward = `100 * .70 * .40 = 28`
Seller net result = `22`

The game may therefore prefer an efficient 60% settlement over an extremely slow 70% settlement. This is intentional, but must be tested so time pressure does not overwhelm settlement quality.

## 4. Tournament/cash future boundary

V1 chips are abstract, reset per match, and are not purchasable, transferable, withdrawable, or redeemable.

Future real-money tournaments require a separate economic, legal, integrity, and responsible-gaming specification. Do not extend this V1 economy directly into cash balances without that work.

## 5. Economy invariants to test

- surplus shares sum to 1.0 for every valid deal;
- no deal gross reward is 0 for both;
- a TIMEOUT outcome yields zero gross for both and is distinct from walk-away in the record (GR-024);
- multiplier is always in `[0.30, 1.00]`;
- the multiplier decay and the hard decision-time limit are independent: the multiplier stops at the floor while the personal budget keeps running (GR-023);
- a legacy config without a hard limit never times out and replays identically;
- any non-zero concession cost >= 1;
- larger normalized concession magnitude never costs less total than a smaller magnitude under the same config;
- average cost per normalized unit declines as magnitude increases;
- no client-supplied economy value is authoritative;
- match stores the exact balance-config version used.
