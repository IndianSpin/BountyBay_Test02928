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

## Recurring-failure log (add here, then promote to the rules above)
- (none yet beyond the rules themselves — first entry expected from the
  QA matrix or the next founder review)
