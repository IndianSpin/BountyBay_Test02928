# PRODUCT FINDINGS — Bounty Bay QA (Agent 5)

Base SHA: `92a5e61`. Product findings are not conventional bugs — they are
evidence-based risks to comprehension, fun, or retention (DAU lens).

---

## QA-004 — Friend-mode Rematch resets to home; the opponent gets nothing

- **SEVERITY:** PRODUCT (retention).
- **EVIDENCE:** `apps/web/src/app/play/page.tsx` — `rematch()` sets
  challenge/opponent/activeMatch to null and returns to the idle panel.
  Verified by clicking the Rematch seal after a completed friend match
  (`.agents/qa/tools/specs/qa-interruption.spec.ts`; screenshot
  `.agents/qa/evidence/rematch-click.png`).

**OBSERVATION:** the result reveal shows a prominent Rematch CTA. In a
friend match it does not start a new match, does not create a new challenge
link, and does not notify the opponent. The label promises "rematch"; the
behavior is "exit to home". A player who clicks it discovers their opponent
has no way to be pulled back into another game — the social loop dies at
the exact moment retention should peak.

**LIKELY IMPACT:** "does this create another match now?" — no, unless the
player manually creates a new challenge and re-shares. For the DAU goal
this is the single highest-leverage product gap found in this baseline.

**SUGGESTION (for product, not implemented by QA):** friend-mode Rematch
should either create a fresh challenge pre-filled with the same opponent
(pending their join) or be relabeled to what it does (e.g., "New game").
Requires a product decision — flagging, not changing.

---

## PDR-2 — GR-012 walk-away wording vs implementation (REPORT ONLY)

- **EVIDENCE:** adversarial battery — `POST /v1/matches/:id/walk-away` by
  the non-active player returns `409 NOT_YOUR_TURN`
  (`packages/domain/src/match.ts` turn-gates walk-away, citing GR-014).
  Canonical text: "Either active player may choose Walk Away."

Recorded as PDR-2 by the manager for the founder. QA changes nothing.
Included here so the finding chain stays visible in the QA lane.

---

## INFO — IN-2 review envelope: null fields + empty eventRefs

- **EVIDENCE:** `.agents/qa/evidence/qa-discovery-review.md` — on a real
  completed deal the persisted features carried
  `surplusShareBp: null`, `settled: null`, `timeUsedMs: null`, and the
  RESULT moment had `eventRefs: []` while headline/detail/measurements were
  mathematically correct (settlement at seller RV → "YOU CAPTURED 0%",
  chips and offer counts match the event log).

Not user-visible today (the review board renders moments, not raw
features), but worth a worker-3 sanity check before the timeline links
moments to events (W1-03): empty `eventRefs` would render dead links.

---

## INFO — "Opponent offered 27.5" announcer + RV inference

The sr-only announcer announces the opponent's **public offer**. When a
player opens at their own RV (the deterministic test strategy — and a
natural player move), the opponent can infer the boundary. This is
game-theoretic inference from public data, not a serialization leak:
verified no `reservationValueTenths` field ever reaches the opponent
pre-result (leak scan, clean).

---

## Retention observations (evidence-based, current build)

1. **Rematch is the weakest link** (QA-004 above). Every completed friend
   match ends in a dead-end CTA.
2. **AI practice loop is strong**: five personas, "unrated" labeling
   (GR-020) is clear, and a full practice match completes in seconds — the
   solo-player retention path exists and works.
3. **Game Review** gives a concrete post-match reason to look back
   (moments verified accurate). No "improve" loop yet connects it to the
   next match (e.g., no rating progress in V1 friend/practice modes) —
   consistent with the deferred rating system, not a defect.
4. **Fresh content:** scenario content is placeholder (3 seeded scenarios,
   same title/description for all matches) — repetition risk is real but
   known/planned (M10 content). Not a defect at this milestone.
5. **Social pull:** share-link flow works end-to-end (create → join →
   ready → deal), but the joiner-refresh error (QA-001) and the rematch
   dead-end are the two places the social loop visibly strains.

No new feature proposals are made by QA; items are flagged only.
