# UI Design System — BOUNTY BAY ROYALE

> **Status:** This document supersedes the previous restrained-maritime visual
> direction (see DEC-024). It governs the frontend experience ONLY. Game rules,
> economy, architecture, security, API, and domain specifications are
> unaffected and remain higher authority for anything they cover.

## Product character

Bounty Bay is a highly polished, playful, competitive negotiation game. The
world is colorful, animated, and theatrical; the negotiation itself is
legible and strategically serious.

**The world is playful. The numbers are ruthless.**

The player's feeling should be *"I want to beat this person"*, never
*"I am completing a negotiation exercise"*. The emotional territory is
competitive game lobbies and premium mobile strategy games (Clash Royale
clarity, Monopoly GO tactility), not SaaS dashboards, fintech, or corporate
negotiation software. Reference products are borrowed for principles, never
cloned.

### Explicitly rejected

- Corporate / educational / academic presentation.
- Generic SaaS patterns: purple-on-white gradients, identical rounded cards
  everywhere, glassmorphism on every surface, bento grids "because one is
  available", giant purposeless whitespace, icon + heading + paragraph
  feature grids, dashboard sidebars, meaningless status pills, endless
  generic icon sets, B2B-SaaS-sounding copy, placeholder-looking data tables.
- Clichéd pirate decoration (skulls, ropes, steering wheels, treasure-chest
  clip art, pirate flags, parrot mascots, tavern textures).
- Manipulative gambling patterns: fake urgency, misleading button hierarchy,
  near-miss manipulation, obscured costs, confusing currencies, endless
  notification pressure, false scarcity, slot-machine noise. Glows and
  gradients are allowed; casino panic is not.

### World

Bounty Bay is a fantastical global marketplace where ambitious dealmakers
compete. Legitimate motifs: ports, traders, merchants, bounty boards,
treasure, islands, ships, strange collectibles, prestigious objects, private
deals, mercantile competition. The world can later expand beyond maritime
assets, so the visual identity must not lock itself to 18th-century piracy.

## Core vocabulary (unchanged, binding)

Use consistently: **Bounty Rating, Offer, Concession, Reservation value,
Bounty, Concession chips, Clock multiplier, Deal, No deal.** Never
interchange `coins`, `credits`, `points`, `tokens`, and `chips` without a
product decision.

## Color — vivid competitive palette, one token system

Dark is the primary theme. The interface may use gradients and glows; color
must still communicate hierarchy, avoid rainbow noise, and meet WCAG AA
contrast. One coherent token set — no imported component may bring its own
visual system.

| Token | Role | Direction |
|---|---|---|
| `--bg` | foundation | deep navy / midnight / dark indigo |
| `--surface` / `--surface-raised` | panels, cards, board | elevated dark tones |
| `--accent` | primary energetic accent | electric turquoise / cyan / aqua |
| `--gold` | value / bounty | rich gold / warm amber |
| `--rival` | competitive secondary | purple / magenta, used deliberately |
| `--danger` | danger / walk-away | coral / red |
| `--success` | success, sparingly | vivid green |
| semantic game colors | buyer / seller / chips / clock | consistent, never color-only carriers |

No pure black `#000000`, no pure white surfaces. Neutral families are
cool-toned and consistent (one palette per project).

## Shape, depth, materiality

- Rounded surfaces allowed; dimensional controls allowed; shadows allowed;
  glows allowed; expressive borders allowed; selected elements may appear
  raised from the board.
- **One radius scale per surface class** (buttons, cards, inputs, panels)
  documented once and followed everywhere. Do not turn every rectangle into
  a floating glass card; elevation must communicate real hierarchy.
- Important interactive controls feel tactile (press states, physical push).
- The negotiation board reads as a distinct game surface, not a form.

## Typography — two roles

- **Display/game type** (branding, asset names, match state, DEAL, reveal,
  rankings, large percentages, major numbers): personality allowed.
- **Interface type** (chat, instructions, input, stats, rules, small labels):
  maximum legibility.
- Numbers use **tabular figures** and a monotone-friendly face. Offers,
  clocks, ratings, and percentages must be extraordinarily easy to scan.
  Decorative fonts never compromise numerical readability.
- Load via `next/font`; self-host; no runtime font CDNs.

## Motion language

**Motion intensity: HIGH, disciplined.** Motion punctuates game events and
communicates meaning:

- match found, role reveal, confidential reveal;
- offer arrival (the new amount animates into the negotiation space with
  presence, clearly distinct from the previous offer);
- offer commitment (the number visibly becomes my committed position;
  chips visibly respond; turn ownership visibly flips);
- resource deduction, time pressure, acceptance, result reveal, rating change.

Motion must NEVER: continuously animate every card, float decorative blobs,
move text while it is being read, delay actions, or compromise reduced motion.
**Every major animation has a `prefers-reduced-motion` branch.** No animation
may delay or mask actual game state; the server remains authoritative.
Prefer CSS transitions/animations and small client-island Motion components
over full-page animation libraries. Sound (if later added) is always
optional and mutable; never load sounds eagerly.

## The live negotiation screen (highest priority)

The screen must answer instantly, with hierarchy (never ten equal cards):

1. Who am I negotiating against? (identity, rating/status)
2. What am I negotiating over? (scenario asset, given real presence)
3. What is their current offer?
4. What is my current offer?
5. Whose turn is it?
6. What is my private limit? (confidential treatment)
7. How much time pressure am I under?
8. How many concession chips do I have?
9. What will my proposed move cost?
10. How do I offer, accept, chat, walk away?

Composition is a battlefield, not a dashboard:

- **TOP:** brand/mode, opponent identity, turn state.
- **CENTER (dominant):** the negotiation — scenario asset, opponent offer,
  the gap, my offer. Offers are physical, animated presences.
- **ACTION ZONE:** proposed offer input, cost preview, Make Offer, Accept,
  Walk Away.
- **RESOURCE HUD:** clock multiplier (visceral, not telemetry), concession
  chips (a game resource, not a number).
- **PRIVATE PANEL:** role + confidential limit, sealed-dossier treatment.
- **SOCIAL:** chat (secondary panel on desktop; drawer or designed lower
  region on mobile; unread indicator; rate-limit feedback; numbers in chat
  visually distinct from formal offers — chat is never binding).

This is a conceptual hierarchy, not a wireframe; use judgment.

### Offer input and cost preview

As the user types: show the proposed offer, direction of concession, chip
cost, and chips remaining after the move, in game language:

```
YOUR OFFER: 67        → typed 72 →        MOVE +5
                                          COST 4
                                          68 CHIPS LEFT
```

Never expose the concession formula. The conceptual model: bigger
concessions cost more; lots of tiny concessions are inefficient. Illegal
moves explain themselves in game language ("You already moved to 67. You
cannot take that concession back.", "Your mandate does not allow you to
offer more than 100.") — never raw error codes. Client cost preview is a
preview only; the server remains authoritative.

### Private limit treatment

The reservation value is privileged information: a confidential card / sealed
dossier / private badge with a subtle lock motif and reveal moment.
`CONFIDENTIAL — YOUR LIMIT — 100 — Only you can see this.` Psychological
weight matters more than ornament; do not overdecorate. Never render the
opponent's RV anywhere pre-result (SI-001).

### Clock and multiplier

Never display `multiplier = 0.83` telemetry. Make the consequence visceral:
`BOUNTY × 83%` with an animated ring / shrinking meter and threshold
feedback. The user understands: *my time is costing me*. At the 30% floor,
the representation must stop implying further loss even though elapsed time
keeps counting. No casino panic techniques.

### Decision-time warnings (DD Phase 1, GR-023/GR-024)

The hard personal decision-time budget surfaces as tiered warnings around
the active player's remaining time. The client renders the server-derived
`timeTier` (NORMAL / LOW_TIME / CRITICAL) — it never computes the rule.

- **NORMAL:** nothing extra; the existing clock treatment stands.
- **LOW TIME:** compact gold (`--gold`) warning banner near the turn
  state: `LOW TIME — 0:24` with `role="status"`.
- **CRITICAL:** coral (`--danger`) treatment, `aria-live="assertive"`,
  `CRITICAL — TIME RUNNING OUT`.
- **TIMEOUT:** the terminal state replaces the turn banner; result copy is
  distinct from walk-away ("No deal — ran out of time", attributing the
  timed-out player) — never the walk-away wording (GR-024).
- All warning states honor `prefers-reduced-motion` (no pulsing under the
  global kill switch) and never use casino-panic escalation. Testids:
  `time-warning`.

### Concession chips

A game resource: `72 / 100` with a tactile meter, stack, or token bar and a
small deduction animation on spend. Never render 100 individual icons. The
user understands: *chips determine how much freedom I have left to move*.

### Chat

Persuasion and bluffing are the human part of the game, but chat never
dominates the board. Unread indicator, clear opponent/player styling,
typing indicator only if technically reliable, rate-limit feedback, correct
scroll and keyboard/mobile behavior, and no accidental offer submission
from chat. Chat numbers stay visually distinct from formal offers and remain
non-binding (GR-013).

## Match-found experience

Never a bland loading screen. A brisk, competitive sequence:

1. `OPPONENT FOUND` — avatar, handle, rating, games, average surplus,
   agreement rate.
2. `THE DEAL` — the asset and context, richly presented.
3. `YOUR ROLE` — role + confidential information, revealed.

Anticipation, not cinematic delay.

## AI opponents in the world

Practice opponents are characters, not settings (DEC-025, GR-020 labeling).
Five personas sit behind the stall counter in the harbor scene: The Anchor,
The Grinder, The Closer, The Wall, The Mirror. Each is presented as a
persona card — name, a single flavor line, and a mood of negotiation — and
then as the living opponent at the table during the match.

Rules:

- AI identity is always visible: the staging card reads "The Closer has
  taken the table — practice match · unrated", and the result card carries
  the same "practice match · unrated" tag. Never ambiguous.
- Persona flavor chat is character, not coaching: short lines only, never
  strategic advice, never numbers that read as offers.
- Practice is clearly secondary to human play in every entry surface
  (a secondary button under PLAY; a quiet section on the play page).
- AI matches never show rating deltas or leaderboard movement; the result
  screen treats them as unrated practice (GR-019).

## Onboarding (P0)

A 60-120 second interactive tutorial that teaches by DOING:

1. **Everyone has a secret limit.** (Player is Buyer. `YOUR MAXIMUM: 100`.
   "Your opponent cannot see this.")
2. Opponent offers 90. **Make a counteroffer.**
3. Teach the irreversible concession by letting the player move, then:
   "Once you concede, you cannot take that number back."
4. Show concession chips; prompt another move with the cost shown first.
5. Start the clock. "Taking longer reduces the bounty you keep."
6. Allow accepting.
7. Reveal the opponent's limit; show the ZOPA and captured percentage.
   Then: **Ready for a real opponent?**

Do not teach BATNA theory, negotiation terminology, formulas, or rating
math. The mental model is: *Know your limit. Get the best deal you can.
Moving costs chips. Thinking costs bounty. No deal gets nothing.*

## Result reveal (the signature moment)

Sequence, with high-quality motion:

1. **Outcome:** `DEAL CLOSED` with a large settlement amount (number ticker
   or blur-fade reveal considered).
2. **Hidden information reveal:** both limits.
3. **The full range:** seller limit → settlement → buyer limit.
4. **The split, large:** `YOU 58%` / `OPPONENT 42%` — instantly clear who
   got the better deal.
5. **Secondary mechanics:** clock multiplier, concession cost, final bounty,
   rating movement.
6. **Next action:** `REMATCH` primary, `ANALYZE DEAL` secondary.

No confetti by default. A win feels satisfying, never like a slot jackpot.
Include deterministic post-match facts when cheap to show: opening offers,
number of concessions, largest concession, decision time, chips spent,
surplus captured vs opponent's, deal/no-deal. No AI coaching yet.

## Profiles

Competitive, not a LinkedIn. Avatar, handle, prominent Bounty Rating, games,
agreement rate, average surplus captured. No meaningless progression badges
before retention is proven.

## Scenarios and assets

The negotiated object gives each match identity: `THE RUBY COMPASS` with a
strong stylized asset image. A small number of high-quality scenarios
(legendary ship, rare gemstone, mysterious island, racing stallion, royal
artifact, lost manuscript, strange machine, famous painting, space-mining
rights — not historically constrained). Never hundreds of mediocre ones.
Asset images are emotional anchors: production-grade placeholders that
preserve layout are acceptable and must be documented; no permanent generic
stock photography.

## Landing page

Not a SaaS marketing site. Above the fold communicates the game instantly:

`BOUNTY BAY` / `GET THE BETTER DEAL.` / "Two secret limits. One price. Take
as much of the deal as you can without losing it." / `PLAY FREE`, with a
visual game scene or animated miniature negotiation. No three generic
feature cards, no enterprise logo walls, no negotiation-training copy.

## Responsive behavior (binding)

Mobile is first-class: 320px+ designed, tested at 320 / 375-390 / tablet /
desktop. Critical actions reachable with one hand; the keyboard appearing
for offer entry or chat must not destroy game-state visibility; the private
limit, opponent offer, own offer, and action controls stay accessible.

## Accessibility (binding, inherited and unchanged)

Native buttons/inputs, 44px touch targets, visible keyboard focus, ARIA
live announcements for new offers and turn changes, no color-only state,
`prefers-reduced-motion` respected for every animation, WCAG AA contrast
across the palette. Chat numbers and formal offers must be distinguishable
by more than color.

## Component discipline

One coherent token system. Before creating a primitive: check the repo,
search 21st.dev, inspect candidates against this brief, install only the
chosen one, and normalize it to Bounty Bay tokens. No duplicate buttons,
modal systems, tooltip libraries, animation frameworks, or icon sets.
21st components become Bounty Bay components after installation; their
source styles are not authoritative.

## Game Review (IN-2)

The post-match review is a harbor notice board: the RESULT moment as the
wide top notice, then 1–4 smaller moment cards — eyebrow label, objective
headline, one detail line, and a "See in timeline" link that scrolls the
timeline and highlights the exact events. Mobile: the moment cards stack
to one column, the timeline stays below with the same linkage; nothing
depends on hover. Copy is deterministic game-language from measurements —
never a wall of text, never an opinion. The result screen's ANALYZE DEAL
sits beside REMATCH and REPLAY; the replay screen links back to the
review.
