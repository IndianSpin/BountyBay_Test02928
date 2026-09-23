# DESIGN ACCEPTANCE — Bounty Bay Royale visual rules

Canonical for design review (founder directive, 2026-09-23). Worker 2
builds against it; QA tests against it; the manager and founder use it
in canvas verdicts. Add a rule every time a recurring visual failure is
found — never let design quality regress as screens are built.
Authoritative visual source remains the canvas
(`design-sandbox/bounty-bay-canvas/`, DEC-029) + docs/09 for
accessibility bindings.

## Non-negotiable rules
1. **No generic dark SaaS.** Nothing should look like a default dark
   dashboard template; the world is playful, the numbers are ruthless
   (DEC-024).
2. **Characters dominate social interactions.** Opponent presence is
   character-first; identity is felt before it is read.
3. **Numbers create physical events.** Offers/results are staged as
   physical, weighty events (sequence A–H choreography from
   `motion-spec.md`), not text updates.
4. **Background and character rendering must match.** No style seams
   between scene art and character art.
5. **Result has a staged payoff.** The result reveal is a sequence with
   dramatic payoff (LIVE MATCH → ACCEPTANCE → RESULT REVEAL order,
   DEC-029), never a flat screen.
6. **Mobile remains first-class.** Every screen works at ~390 px with a
   16 px gutter; no horizontal scroll; haptics best-effort.
7. **Vocabulary is the repo's:** Reservation value / Clock multiplier /
   Concession chips — never canvas mockup labels (DEC-029).
8. **Tokens are the canvas's:** ember = player, violet = opponent,
   gold = value, green = deal (DEC-029). No new accent colors without a
   founder decision.
9. **Accessibility bindings hold:** WCAG, reduced-motion, focus states
   (docs/09 authority).
10. **No rules changed for visuals:** domain authority is absolute
    (AGENTS.md).

## Chat & communication (founder feedback #2, 2026-09-23 — binding)

**Principle: the opponent IS the conversation; the chat UI is only the
mechanism. Make conversation big, make the chat box small.**

1. **Visual budget:** opponent/world 50–60% · offers/state 20–25% ·
   primary action 10–15% · chat UI itself 5–10%.
2. **Desktop composer:** ~48–56 px tall × 320–420 px wide — never a
   horizontal slab. Three levels: Ambient (latest opponent message as a
   speech bubble NEXT TO the character; Talk available) → Compose
   (compact composer on tap) → History (drawer/sheet with the full
   transcript on demand).
3. **Latest message lives with the character:** bubbles physically
   appear around the opponent, fade into history after ~5–8 s, reinforced
   by animation (eyebrow raise / lean forward / hand gesture / dismissive
   flick). Human opponents: same treatment with their selected
   character. A hold is a social event — "I'm comfortable where I am"
   with a lean back.
4. **Mobile:** bottom sheet at 35–50% screen height while typing; the
   game stays visually dominant; sheet collapses on send.
5. **Four mechanisms:** free text · quick negotiation prompts (WHY? /
   TOO FAR / I'M HOLDING / YOU NEED TO MOVE / WE'RE CLOSE / IS THAT
   FINAL? / WHAT WOULD GET THIS DONE?) rendered as character dialogue,
   never "buttons vomiting system messages" · character reactions/
   emotes (skeptical, amused, annoyed, thinking, confident, deal? —
   character-specific) · voice: LATER (not scheduled).
6. **COMM vs FORMAL OFFER stays canonical** (GR-025 territory): only
   MAKE OFFER changes authoritative state. The permanent instructional
   sentence is REMOVED — subtle composer hint instead ("Talk to
   GoldenOtter…" + ⓘ); the teaching moves to the tutorial (not yet
   implemented).
7. **Turn structure (domain-checked, GR-013):** a turn may be TALK or
   MAKE/CHANGE OFFER or ACCEPT/WALK; chat does not consume formal turn
   state.

## Live-match composition (founder feedback 2026-09-23 — binding)

The live match screen must be readable in this order: **Opponent → their
offer → my position/limit → action.** Everything else sits down.
Concrete rules:

1. **~5 visual objects, not 15:** opponent (largest meaningful element,
   physically reactive) · one offer plaque · one negotiation surface ·
   one private-limit card · one action. No ornament farms.
2. **One integrated design language:** the illustrated world, the game
   HUD, and any utility copy must feel authored together — never
   "background + components on top". No visible SaaS-form fragments.
3. **Strict scale hierarchy** (≈3 levels): deal numbers (display) >
   action/status (UI) > dialogue/explanation (body). Every number being
   enormous = visual inflation.
4. **Protected zones:** opponent / negotiation state / private info /
   action / communication each have strict areas; nothing collides,
   overlaps, or clips ("can't go back dow..." must be impossible).
5. **Strict type system:** Display (deal numbers) / UI (action/status) /
   Body (dialogue/explanation). ~3 treatments, no more.
6. **Semantic color budget:** normal / positive-deal / danger-time /
   private. Red means danger+time only. Everything else sits down.
7. **Physical world carried through:** the opponent slides the plaque
   across the counter; your plaque is physically opposite; concessions
   move it; sealing = stamp → plaque locks. Numbers cause physical
   events — never "number + plus/minus + button" (a form dressed as a
   game).
8. **Never review or ship with broken-looking data** — invalid actions
   are prevented or visually neutralized, never presented as the hero
   CTA with an explanation in microscopic copy.

## Recurring-failure log (add here, then promote to the rules above)
- 2026-09-23 founder critique: component improvement instead of
  composition redesign → the rules above. Prior canvas v1 composition is
  superseded for the live match; acceptance/reveal slices remain as
  approved until further feedback.
