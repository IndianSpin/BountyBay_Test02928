# Negotiation Intelligence, Game Review & Coaching System

Canonical architecture for the strategic layer adopted in DEC-028. The
game remains the primary product: a normal player can always PLAY → SEE
RESULT → REMATCH without entering a lesson. Learning is progressively
available (ANALYZE DEAL, WHY?, REVIEW, PRACTICE THIS, IMPROVE THIS SKILL).

## 1. Architecture

Distinct layers, never collapsed into one LLM prompt:

```
MATCH DATA
→ BEHAVIOR FEATURE ENGINE        (deterministic, versioned)
→ DETERMINISTIC OBSERVATIONS     (deterministic rules over features/events)
→ PLAYER LONGITUDINAL PROFILE    (aggregates, trends, thresholds)
→ BENCHMARK ENGINE               (cohorts, percentiles, minimum N)
→ NEGOTIATION KNOWLEDGE BASE     (ontology + structured records + evidence grades)
→ RETRIEVAL                      (structured mappings first; RAG supplements)
→ COACHING COMPOSER              (structured input → validated structured output)
→ PRACTICE RECOMMENDATION        (drills, lessons, AI personas)
→ OUTCOME / IMPROVEMENT TRACKING
```

The LLM explains and synthesizes near the end. It is **never** the
authoritative source for what happened, economic outcomes, concession
sizes, timing, ZOPA existence, unreciprocated concessions, or population
statistics — those come from structured data and deterministic or
statistical analysis.

## 2. Four levels of claims

Every analysis/coaching statement is conceptually one of:

- **L1 — Objective match fact.** Directly calculable from authoritative
  game data. ("You made 4 concessions.")
- **L2 — Empirical Bounty Bay benchmark.** Calculated from sufficiently
  comparable population data; must carry cohort definition, sample size,
  version, and minimum-sample threshold. No false precision on small N.
- **L3 — Research-supported principle.** From curated negotiation
  scholarship; carries source attribution and evidence metadata.
- **L4 — Interpretive coaching hypothesis.** A cautious synthesis
  ("One possibility is that you are conceding quickly when you encounter
  resistance."). Never presented as proven psychology.

UI, API, and data model must preserve enough metadata to distinguish these.

## 3. Game Review vs Coach

- **Game Review** answers "What happened?" — mostly deterministic, 1–5
  meaningful moments per match, references actual events, timeline
  step-through (the timeline event kinds — OFFER/MESSAGE/ACCEPT/
  WALK_AWAY/TIMEOUT/ABORTED, negotiation steps only — are defined in
  docs/20 and implemented by `buildTimeline` in packages/intelligence).
  Works fully when the coaching service is unavailable.
- **Coach** answers "What might this mean, and what should I practice?" —
  research + longitudinal + interpretive. Concise by default
  (RESULT → ONE IMPORTANT OBSERVATION → WHY IT MATTERS → PRINCIPLE →
  TRY NEXT TIME → PRACTICE THIS); deep expansion available on request.

## 4. Negotiation ontology (canonical taxonomy)

Preparation (BATNA, reservation value, aspiration/target, planning,
information gathering) · Opening (first offers, anchoring, ambition,
credibility) · Concessions (reciprocity, size, frequency, pattern,
signaling, timing) · Communication (questions, listening, information
disclosure, framing, bluffing/deception, credibility, silence) · Decision
biases (anchoring, fixed-pie, loss aversion, overconfidence, reactive
devaluation, escalation) · Relationship/social (trust, reciprocity, face,
emotion, power, culture) · Pressure (deadlines, time pressure, impasse,
walk-away decisions) · Closing (acceptance, value capture, failed ZOPA,
no deal, closure) · Integrative negotiation (interests, multi-issue
trading, logrolling, contingent agreements, value creation — present even
while Bounty Bay is single-issue). Extensible.

## 5. Knowledge base + evidence quality

Structured records: id, title, summary, ontology_tags, claim,
practical_implication, conditions, limitations, evidence_level,
source_type, authors, year, publication, doi/url, citation_text,
license/access metadata, review_status, reviewed_by, created_at, version.
No indiscriminate ingestion of copyrighted books; open-access papers,
licensed material, bibliographic references, and curated summaries only.
Provenance for every item.

Evidence grades: **A** strong empirical support (replicated/high-quality/
meta-analytic) · **B** empirical with important limitations · **C**
established practitioner framework · **D** expert heuristic / contested.
Coaching register respects the grade: A/B "Research suggests…"; C "A
widely used negotiation framework recommends…"; D "One practitioner
approach is…". Grades are configurable and versioned, not immutable truth.
Conflicting research is preserved with its conditions and limitations —
"Research is mixed here…" is valid output.

## 6. Observation → concept mappings (moat layer)

Explicit structured mappings first, e.g. UNRECIPROCATED_CONCESSION →
concession reciprocity / signaling / discipline; LARGE_OPENING_MOVE →
anchoring / first offers / aspiration; FAILED_POSITIVE_ZOPA → impasse /
closing / walk-away decisions. Each mapping: relevance weight, conditions,
version. RAG supplements the structure; it never replaces it.

## 7. Coaching composer (IN-5)

Structured input: player observation, match impact, player history,
benchmark, relevant concepts, retrieved research, coaching objective.
Structured output: headline, observation, why_it_matters,
research_context, suggested_action, practice_recommendation, citations,
certainty_language. Unsupported free-form output is rejected, not
repeated.

## 8. Practice system (IN-6)

Drills train isolated decisions (WHAT WOULD YOU DO? with scenario state,
private info, options, teaching objective, concept tags, explanation,
sources, optional benchmark). No drill implies one universally optimal
answer. Micro-lessons are 1–5 minutes, callable from a relevant Game
Review. Practice recommendations map weaknesses to drills + AI personas
(UNRECIPROCATED CONCESSIONS → PLAY THE WALL). Daily/skill drills and
streaks ship only after core drills prove useful (OQ-026).

## 9. Longitudinal profile, insights, improvement (IN-3, IN-7)

Versioned player negotiation profile over gameplay tendencies (opening
aggressiveness, concession frequency/size/reciprocity, decision speed,
agreement rate, surplus capture, no-deal tendency, information use,
closing behavior, time-pressure performance, buyer/seller split) — never
personality claims. Confidence bands: 1–4 INSUFFICIENT DATA, 5–14 EARLY
SIGNAL, 15–29 EMERGING PATTERN, 30+ ESTABLISHED (configurable). Style
descriptors derive from explicit thresholds (OQ-025). Trends use windowed
metrics (recent N / previous N / rolling / lifetime); change is reported,
never attributed to a cause without experimental design. Coaching state
is structured (focus, topics, assignments, completions, before/after,
repeat-issue counts), not LLM chat memory.

## 10. Benchmark engine (IN-8)

Comparable cohorts: rating range, role, scenario class, first/second
mover, game/economy/rule versions, mode, time period. Stores cohort
definition, N, mean, median, percentiles, variance, generated_at,
version; minimum-sample safeguards; no fundamentally incompatible
comparisons. Proprietary evidence layer separates ACADEMIC RESEARCH from
BOUNTY BAY OBSERVATIONAL EVIDENCE; observational language is
"associated with", never "causes".

## 11. Research / data governance (§33)

Product analytics and research datasets are separate: de-identification,
consent status, exclusion/deletion, dataset versioning, provenance
(OQ-028). No publication workflow until separately requested.

## 12. Entitlements (seams only — OQ-024)

FREE: human play, rating, basic result/replay, limited Game Review,
limited drills, basic profile. PREMIUM: unlimited detailed review, full
coach explanations, longitudinal insights, research-backed
recommendations, full lessons, advanced drills, personalized practice
plan, deeper replay analytics. Boundaries are PRODUCT DECISION REQUIRED;
no payments implemented. Free users still get enough coaching to see the
value — never "Pay to know anything else."

## 13. Failure modes

AI coaching unavailable · RAG unavailable · insufficient history ·
insufficient benchmark · no research found · conflicting research ·
low-confidence observation · new ruleset without benchmarks: fall back to
objective deterministic Game Review. Never invent evidence because
retrieval failed.

## 14. Privacy

The coach is an application client with explicit data permissions:
a player analyzes their own negotiation only; opponent-private
information follows the normal post-match disclosure policy (GR-018);
private user metadata, hidden account data, and moderation data are never
exposed through it.

## 15. Observability (IN-2+)

Game Review opened · review step viewed · coach explanation expanded ·
sources opened · Practice This clicked · lesson/drill started and
completed · recommended practice played · same-behavior recurrence ·
behavior trend after intervention. Core metrics (§42): % matches followed
by review, % reviews followed by practice, % practice followed by another
match, D1/D7 by coaching usage, targeted-behavior change — the loop must
return users to negotiation, not to content consumption.

## 16. Phases

IN-1 behavioral foundation (effective now) → IN-2 Game Review V1 →
IN-3 longitudinal profile → IN-4 knowledge system (~20–30 records, never
mass ingestion) → IN-5 retrieval + coach → IN-6 practice system →
IN-7 improvement tracking → IN-8 benchmark engine. Each phase ends with a
founder checkpoint; do not auto-continue.
