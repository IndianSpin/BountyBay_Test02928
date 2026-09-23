# Glossary

**BATNA** — Best Alternative To a Negotiated Agreement. In Bounty Bay, the BATNA concept informs the private reservation value but is not itself the scored quantity.

**Reservation value (RV)** — Hard private boundary. Buyer RV is maximum acceptable amount; seller RV is minimum acceptable amount.

**ZOPA** — Zone of Possible Agreement. In V1 numerical form: `buyer RV - seller RV`, requiring a positive result for standard ranked scenarios.

**Available bargaining surplus** — Same numeric width as V1 ZOPA; the value divided between players by settlement.

**Surplus share** — Percentage of available bargaining surplus captured by a player at settlement. Buyer share + seller share = 100% before clock/economy adjustments.

**Offer** — Formal numerical proposal submitted through the game action.

**Opening offer** — Player's first formal numerical offer. Free of concession-chip cost.

**Concession** — A later formal offer moving toward the opponent: buyer upward, seller downward.

**Standing offer** — Player's latest valid formal offer.

**Crossed offers** — State in which buyer standing offer is equal to/above seller standing offer. Does not automatically settle.

**Deal** — Opponent's current standing offer is explicitly accepted.

**No deal** — Match ends without accepted settlement.

**Bounty** — Abstract reward pool for a match. In V1 test defaults, separate concept from the concession budget.

**Concession chips** — Fresh per-match resource spent when making concessions. Not real money, purchasable, transferable, or persistent in V1.

**Clock multiplier** — Player-specific factor from 100% down to 30% applied to their surplus-based bounty reward according to cumulative active decision time.

**Active player** — Player whose turn/decision clock currently runs.

**Bounty Rating** — Canonical competitive rating from eligible synchronous human ranked play. Exact algorithm is versioned and still provisional.

**Ranked Live** — Synchronous human-v-human matchmaking eligible for canonical rating.

**Friend Live** — Private synchronous challenge; unrated in v0.1.

**AI Practice** — Clearly labeled AI opponent; unrated.

**Async / Correspondence** — Human negotiation with delayed turns; unrated in V1 and governed by separate time-control rules.

**Fantasy Mode** — Initial fictional/lightweight scenario mode. No external market data required.

**Real Mode** — Future product mode using actual asset data and preparation/research before negotiation.

**Game rules version** — Identifier for behavioral rule set used by a match.

**Economy config version** — Immutable parameter set used for concession costs, clock curve, bounty, and budgets.

**Domain package** — Pure deterministic code implementing authoritative game rules, with no UI/network/database dependency.
