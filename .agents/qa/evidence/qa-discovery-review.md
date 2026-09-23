# IN-2 Game Review — math verification (real deal, base `92a5e61`)

Match captured end-to-end through the wire (challenge → join → ready →
opening ×2 → accept → result/review/events), `2026-09-23`.

## Match facts (from the event log, authoritative)

- Buyer RV 534 (tenths) opened at 534 (seq 4). Seller RV 193 opened at 193
  (seq 5). Buyer accepted the seller's standing offer (seq 6).
- Settlement 193 = seller RV. ZOPA 341. buyerSurplusShare 1,
  sellerSurplusShare 0. Chips spent 0/0. Clock multipliers 0.9994/0.9999.

## Review moments (seller's perspective) vs events

| Moment | Claim | Verified |
|---|---|---|
| RESULT | "YOU CAPTURED 0%", "Agreement reached at 19.3 with 100 chips remaining" | TRUE — settlement at seller's own RV → 0% surplus; 0 chips spent |
| CONSERVATIVE_OPENING | "You opened at 19.3 — right beside your own limit" | TRUE — opening = own RV, positionInZopa 1 |
| DEAL_NEAR_OWN_LIMIT | "settled within 0% of your own limit" | TRUE |
| FAST_CLOSE | "From crossed offers to agreement: 0s" | TRUE — accept 22ms after the crossing offer |
| EFFICIENT_CLOSE | "1 offers, 0 chips spent" | TRUE — exactly one offer by the seller |

No fabricated or mathematically false claim found in this sample.

## Observed (INFO)

- Persisted features carry nulls on a completed deal: `surplusShareBp`,
  `settled`, `timeUsedMs` — verify intended schema (worker-3).
- RESULT moment has `eventRefs: []`; other moments reference events. Worth
  checking before the timeline links moments to events (W1-03).

Raw payloads: `/tmp/qa-discovery.json` (full wire capture).
