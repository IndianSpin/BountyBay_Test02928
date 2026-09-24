# CANONICAL CONTRACTS (stabilization, D-70)

Four authoritative contracts. Workers never independently invent
behavior covered here; conflicts are reported to the manager, not
silently resolved. Each file below is the pointer contract — the
canonical substance lives in the named sources.

## 1. GAME_STATE_CONTRACT
Source: docs/02 (rules), docs/03 (economy), packages/domain (the
authoritative implementation + tests). Key invariants: server-owned
state; only legal gameplay commands mutate (OFFER/ACCEPT/WALK_AWAY/
REVEAL/MESSAGE/DISCONNECT/RECONNECT/READY/ABORT/TIMEOUT); turn-gated
formal actions; GR-023 decision-time budget; 7:00 clock +
economy-0.3.0 (DEC-031); no client trust; replay single-path.

## 2. GOLDEN_UI_JOURNEY
Source: SH0–SH4 + PV boards (frozen design version "Golden Journey
v1", D-70 freeze), DESIGN_ACCEPTANCE.md, screenshots/current/.
Journey A and B states per PRODUCT_HEALTH.md. W2 implements exactly
this version; refinements only on founder request.

## 3. AI_BEHAVIOR_CONTRACT
Source: founder's AI acceptance standard (D-70) + DEC-025 (personas)
+ DEC-030 direction. Every AI turn: OBSERVE (legal view only) →
UPDATE BELIEFS → CHOOSE LEGAL ECONOMIC ACTION (domain-validated) →
CHOOSE SOCIAL/NEGOTIATION INTENT (probe / challenge / justify /
request reciprocity / hold / signal finality / conditional close /
pressure / disclose / bluff-where-permitted) → GENERATE TABLE TALK →
RETURN CONTROL. The economic engine is authoritative; the language
layer never makes illegal moves and never receives hidden human
information; graceful fallback when generation fails/times out.
Deterministic conversation fixture set required (BB-254).

## 4. CTA_ROUTE_CONTRACT
Source: the two journeys' state lists (PRODUCT_HEALTH.md) + docs/08
endpoints + the Bay route map (SH-BayIA). Every visible CTA must map
to a working route; no visible CTA leads to an error page (exit
criterion). Navigation-guard E2E covers the map.
