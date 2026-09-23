# Negotiation Agent — Canonical Design Direction

Adopted by DEC-030 (founder directive, 2026-09-23). **DESIGN DIRECTION
ONLY — NOT IMPLEMENTED, NOT SCHEDULED.** The five DEC-025 personas remain
the provisional early implementation and are not deleted. Nothing here
overrides current game rules, economy, or the domain package.

## 1. Why

Five fixed personas (concession-curve bots) are a fine first test of the
game engine but too shallow for a sticky negotiation-practice product. A
serious negotiation AI must form beliefs about the player, change tactics,
use information, bluff, remember what was said, and react to behavior —
not merely follow a concession curve.

## 2. Architecture: seven layers, not one LLM pretending to negotiate

1. **Mandate / utility model** — what this negotiator wants. Private
   inputs the human does not know: reservation value, aspiration, BATNA
   strength, urgency, private facts, verifiable facts, risk appetite,
   relationship objective, personality/tactical tendencies. A real
   strategic situation, not a character prompt.
2. **Belief state** — what it currently believes about the opponent
   (estimated RV range, confidence, observed concession behavior, inferred
   time-sensitivity).
3. **Strategy** — what it tries to achieve next (hold, obtain information
   before conceding, test a perceived limit, …).
4. **Tactic selection** — which negotiation move to use.
5. **Economic action** — hold / concede (small, large) / ask / challenge /
   disclose / bluff / verify / signal finality / create time pressure /
   accept / walk. This layer passes the exact same domain validation as
   human commands (DEC-025).
6. **Communication** — what it says; produced by the LLM from the
   structured decision.
7. **Personality** — how the character says it.

**The LLM is an actor, not a decision-maker.** The strategic engine
decides (e.g. "HOLD at 74; ASK about the buyer's alternative; SIGNAL
limited flexibility; tone = skeptical"); the LLM produces the words,
persuasion, personality and conversational continuity. Strategy stays
measurable, deterministic and legal; stronger language models can be
swapped in later without redesigning the game engine.

## 3. Counterpart modelling

During a match the agent maintains hypotheses about the player: opening
aggressiveness, concession reactions after rejection, likely agreement
motivation, shifted RV estimates, ignored questions. Strategy adapts:
cave quickly → it becomes tougher; hold → it probes; challenge a bluff →
it verifies or changes argument; appear near your limit → it tests you.
This is what simple bots cannot produce: the feeling of being watched and
adapted to.

## 4. Tactical repertoire (illustrative, not exhaustive)

Anchoring · diagnostic questioning · conditional concession · reciprocity
· finality signalling · strategic silence/hold · credibility challenge ·
selective disclosure · bluff · verification (turn a true private claim
into a game-verified fact per GR-028).

## 5. Difficulty = reasoning depth, not concession sizes

- **Beginner:** predictable concession strategy, obvious questions, weak
  opponent modelling, misses exploitable patterns.
- **Intermediate:** tracks reciprocity, uses information, detects common
  concession patterns, occasionally bluffs.
- **Expert:** maintains an opponent model, updates beliefs, changes
  tactics, controls concession signalling, uses timing, combines argument
  and movement, detects likely limits probabilistically, sometimes
  deliberately creates ambiguity. **Expert never cheats:** it never sees
  the player's hidden information; it is only better at inference. That is
  what makes losing educational.

## 6. Adversarial coaching

When Game Review detects a weakness (e.g. conceding too quickly after
rejection), the coach assigns a targeted drill: the AI opponent receives a
private instruction to create situations exposing that weakness (hold
position through at least two opportunities unless strategy justifies
moving). Afterwards the review reports what happened vs. the player's
historical rate. Hooks IN-6 (practice system) and IN-3 (longitudinal
profile).

## 7. Persistent adaptation

AI opponents may eventually use the player's Bounty Bay history — never
the current match's hidden information — via IN-3's longitudinal profile
with its confidence bands (INSUFFICIENT DATA → ESTABLISHED). A player who
is predictably fast to concede, hates no-deals, anchors aggressively, or
turns conservative near deadlines can be exploited by an advanced
opponent; this creates repeated-negotiation depth and motivation to become
less predictable.

## 8. Real World Mode

The same engine consumes realistic scenario dossiers (GR-028 shape:
private facts, verifiable facts, private RV; price-only negotiation), e.g.
a used-car sale where the AI knows its dealer cost, target, floor, month-
end pressure and competing inquiries — and the player knows comparable
listings, their maximum, and financing conditions. The AI evaluates the
player's arguments rather than following a script.

## 9. One engine, many consumers

Casual AI opponents · practice partners · targeted coaching drills · Real
World Mode · expert simulations · (eventually) enterprise training.

## 10. Constraints and guardrails (standing)

- Layers 1–5 deterministic, seeded-RNG testable (packages/ai pattern);
  layer 5 passes domain validation (DEC-025 surviving constraint).
- AI matches remain mode AI, unrated, bot-scoped (GR-019, DEC-004);
  opponents never appear human (AGENTS.md); LLM output is data, never
  executable/system instructions (AGENTS.md).
- Information boundaries follow GR-028: own RV + own dossier only;
  unrevealed facts stay hidden from opponent, spectators, and AI.
- Versioning: `ai-personas-0.1.0` already records per-match behavior; the
  agent engine will carry its own versioned config row recorded per match.
- Replay: LLM-generated text must be persisted as match events (retention
  permitting) or replay breaks.
- Difficulty ladder: replaces the deferred DEC-025 Easy/Competitive/Expert
  ladder with reasoning-depth tiers when implemented.
