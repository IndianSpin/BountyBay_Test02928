# Product Scope

## V1 objective

Ship a coherent, mobile-first web product that allows a new user to create an anonymous handle, enter a live human match or alternative practice mode, complete a legal single-issue negotiation, receive an objective result, and immediately play again.

V1 should be technically complete enough to test appeal, but conceptually bounded around one bargaining engine.

## Scope table

| Capability | V1 status | Notes |
|---|---|---|
| Anonymous account/handle | V1 | Authentication behind handle; no real-name requirement. |
| Public player profile | V1 | Rating, rated games, agreement rate, average surplus captured. |
| Synchronous human PvP | V1 core | Only canonical ranked mode. |
| Ranked matchmaking | V1 core | Random/skill-based evolution; protect from friend boosting. |
| Friend challenge | V1 | Unrated by default in v0.1; see open questions. |
| AI opponent | V1 | Unrated, clearly labeled AI. |
| Async human play | V1 experimental | Unrated. Exact turn/deadline rules still open. |
| Fantasy scenarios/assets | V1 | Lightweight scenario wrapper; no market-data research. |
| Buyer/seller roles | V1 | One private reservation value each. |
| Unrestricted-feeling positive offers | V1 | Technically bounded fixed-point amounts. |
| Free-text negotiation chat | V1 | Moderated/rate-limited. |
| Explicit accept | V1 | Crossed offers do not auto-settle. |
| Walk away | V1 | Ends match with zero bounty. |
| Irreversible concessions | V1 | Buyer only upward; seller only downward after opening. |
| Fresh concession-chip budget per match | V1 | Test economy; resets each match. |
| Personal chess-style payout clock | V1 | Visible to both; 30% multiplier floor. |
| Result/reveal screen | V1 | Settlement, ZOPA, surplus share, time effect, concession spend. |
| Basic replay/timeline | V1 | Offers, messages, clock transitions, settlement. |
| Bounty Rating | V1 | Rated sync human matchmaking only; exact algorithm provisional. |
| Basic analytics instrumentation | V1 | Required for product validation. |
| Push notifications | Optional V1 | Needed mainly for async; email/web notification fallback acceptable. |
| Real-money entry/prizes | Later | Not part of V1. Requires separate legal/compliance work. |
| Real Asset mode | Later | Real-world data + preparation period. |
| Advanced AI coaching | Later/early beta | Keep V1 result analysis deterministic first. |
| Trainer scenario builder | Later | Potential EdTech extension. |
| Multi-issue bargaining | Later | Separate domain expansion. |
| Multi-party negotiation | Later | Explicitly outside first engine. |
| Spectator mode | Later | Potential event/esports layer. |
| Teams/leagues | Later | Not V1 dependency. |
| Enterprise dashboards | Later | Not V1 dependency. |
| Marketplace/scenario creators | Later | Not V1 dependency. |

## Explicit V1 non-goals

- No actual transfer, purchase, or sale of real-world assets.
- No cash balance or redeemable chips.
- No KYC/AML implementation beyond architecture placeholders.
- No claim that Bounty Bay measures all negotiation skill.
- No complex multi-issue integrative bargaining.
- No voice/video negotiation. *(Superseded prospectively by DEC-026, DD
  Phase 5: short offer-attached voice pitches and the planned live Voice
  Deal mode. The non-goal stands until Phase 5 ships.)*
- No real-time spectators. *(DD Phase 7 adds spectator support with
  hidden-information rules — see docs/17, GR-028; no spectator code ships
  before Phase 7.)*
- No mobile-native application; responsive web first.
- No dependence on an LLM for authoritative game calculations.

## Product sequencing inside V1

The first playable vertical slice is narrower than the final V1:

1. Local two-player deterministic match.
2. Authenticated friend/live human match.
3. Result and replay.
4. Ranked matchmaking.
5. AI fallback.
6. Async experimental mode.
7. Public profiles and validation analytics.

This sequencing is intentional. AI agents may build quickly, but features must not outrun rule and test stability.
