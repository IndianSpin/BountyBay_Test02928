# Bounty Bay — Motion & reward choreography spec (juice pass v1)

> **Status: design reference, NOT canonical.** Exported from the Bounty Bay design canvas (pages J1–J4). Game rules, economy and contracts in `docs/` always win. Items marked **DECISION** are open and must not be implemented as rules without a `docs/12_DECISION_LOG.md` entry. Canvas vocabulary → repo vocabulary: *limit* = **Reservation value**, *bounty multiplier* = **Clock multiplier**, *chips* = **Concession chips**.

## Core rule

Numbers must cause physical events in the game world. Every number change is one event that the whole scene listens to (rail, plaque/card, chips, table light, opponent, asset, stall, sound, haptic), staggered by a few ms so it reads as one cause with many consequences.

Stagger for an offer event: rail +0 ms, plaque/card +60, chips +0, table light +120, opponent +180, asset +180, stall/lanterns +240, sound +0, haptic +0.

## Intensity classes

| Class | Use | Duration | Particles | Sound | Haptic | Shake | Input |
|---|---|---|---|---|---|---|---|
| MICRO | ordinary feedback | 80–250 ms | 0 (≤1 dust puff) | one soft material sound | tick | never | never delayed |
| MOMENT | meaningful state change | 300–900 ms | ≤6 diegetic | one phrase, ≤2 layers | tap / thud / double | never | next legal action live from ~50% |
| REWARD | deal / result / progression | 0.9–4 s staged, beat ≤1.2 s | ≤12 diegetic per beat | musical phrase, silence before peak | heavy → roll | ≤2 per match (deal stamp, promotion), 6 px / 120 ms | tap to skip to end state |

**Never:** particle spam/confetti · casino/slot effects · constant shake · FX over numbers · rewards that delay play (tap fast-forwards in 80 ms) · character emotion derived from private reservation values · a "heat" meter.

## Tokens

| Curve | Spec |
|---|---|
| Brass drop | cubic-bezier(.3,0,.2,1) + one 8% bounce, 320 ms |
| Wax press | squash 0.85 in 90 ms → overshoot 1.06 → 1, 260 ms |
| Pin spring | spring k 420 / d 26, settles ≈380 ms (CSS approx cubic-bezier(.34,1.56,.64,1)) |
| Chip arc | gravity arc, 240 ms per chip, 40 ms stagger |
| Light fade | ease-in-out 400 ms |
| Hit-stop | 40–60 ms freeze at impact |

| Sound family | Examples | Rule |
|---|---|---|
| Brass | plaque clunk, pin tock, rail ring | pitch = distance moved |
| Wax | seal squelch, stamp thump | always on commit |
| Paper | card shhk, ledger slide, limit-card snap | movement of MY objects |
| Chips | clack, pour, bonk | one per chip, rising pitch |
| Bells | deal / district / courier bell | REWARD peaks only |
| Harbour | ambient layers | layers drop out as heat rises |

Sound is optional, mutable and lazy-loaded (docs/09). No in-match music loop.

| Haptic | Pattern | Used for |
|---|---|---|
| Tick | light 10 ms | stepper, chip lift |
| Tap | medium 20 ms | plaque impact, reveal |
| Double | 2 taps 80 ms apart | my turn, crossing |
| Thud | heavy 30 ms | offer lands, press |
| Roll | low continuous ≤1.1 s | coin pour, promotion |
| Heartbeat | 2 pulses / 0.9 s | deal heat top step — opt-in |

Implementation reference: `styles/bb.css` section "v1.3 JUICE PASS" has the keyframes (`jx-drop`, `jx-press`, `jx-ring`, `jx-skid`, `jx-stamp`, `jx-flip`, `jx-grow`, `jx-post`, `jx-pin`, `jx-coin`, `jx-reach`, `jx-breath`, `jx-shake`) and the reduced-motion kill switch `.jx-rm`. Production must use `prefers-reduced-motion` instead.

## Event choreography (24 events)

### Negotiation

#### Entering an offer — MICRO

- **Anticipation:** The card lifts 6 px off the runner as I focus the stepper
- **Primary motion:** The number rolls like an odometer (80 ms per step); one chip lifts per unit
- **Impact:** Each digit clicks into place
- **Secondary:** The ghost pin slides along the rail to the proposed value
- **Character:** Their eyes follow the card (look-at), in the listening pose
- **World:** None
- **Sound:** Soft wooden click per step, pitch rising with the move size
- **Haptic:** Tick per step (light, 10 ms)
- **Duration:** 80 ms per step, never queued
- **Reduced motion:** Digits swap instantly; the ghost pin jumps; the ticks stay

#### Submitting an offer — MOMENT

- **Anticipation:** The seal squashes 15% on press-down (90 ms)
- **Primary motion:** The card skids forward; the number flies into my pin, which arcs up the rail
- **Impact:** The pin slams at the new value: ring + 3 dust puffs, 40 ms hit-stop
- **Secondary:** The gap glow re-measures; the heat level may step
- **Character:** Reacts to the step size (public): nod / surprised / smug
- **World:** The table light hands over to violet (400 ms)
- **Sound:** Wax “squelch” → paper “shhk” → brass “tock”
- **Haptic:** Heavy on press, thud on impact
- **Duration:** 600 ms end to end; the turn is live at 320 ms
- **Reduced motion:** The card and pin cut to the end state; one 150 ms light fade; the sounds stay

#### Incoming opponent offer — MOMENT

- **Anticipation:** Their hand rises with the new plaque; the old plaque is swept (120 ms)
- **Primary motion:** The brass plaque drops onto their runner
- **Impact:** One 8% bounce, dust, an impact ring; their pin slides to the new value
- **Secondary:** The gap glow re-measures; the compass needle twitches toward the gap
- **Character:** The offer pose, then back to idle
- **World:** The table light returns to my ember edge
- **Sound:** Deep brass “clunk” (pitch lower when they concede less)
- **Haptic:** Tap on impact, then a double tap for “your turn”
- **Duration:** 500 ms
- **Reduced motion:** The plaque swaps in place with a 150 ms fade; the pin jumps

#### Small concession — MICRO

- **Anticipation:** None: small steps should feel small
- **Primary motion:** The pin moves 1–2 units with a short slide
- **Impact:** A light tock, no dust
- **Secondary:** The gap glow narrows slightly
- **Character:** Them receiving mine: a faint smirk (smug if ≤ 1 chip, public)
- **World:** None
- **Sound:** Single light “tock”
- **Haptic:** Tick
- **Duration:** 300 ms
- **Reduced motion:** Pin jump, no sound change

#### Large concession — MOMENT

- **Anticipation:** The chips tremble on the card before sealing (≥ 20% of remaining chips)
- **Primary motion:** The pin travels far with a visible arc and speed marks
- **Impact:** Heavy slam: ring + 5 dust puffs; the rail rings like a struck bar
- **Secondary:** The heat level jumps; the lanterns flare once
- **Character:** Them receiving mine: surprised (≥ 2× my previous step, public)
- **World:** The compass swings; nearby lantern ropes sway
- **Sound:** Rising 3-note chip cascade + low brass bell
- **Haptic:** Double thud
- **Duration:** 700 ms
- **Reduced motion:** Pin jump + one warm flash (150 ms)

#### Concession chip spend — MOMENT

- **Anticipation:** Chips lift from the stack onto the card while composing (one per unit)
- **Primary motion:** On seal, the chips drop into the wax one after another
- **Impact:** Each chip sinks with a clack; the wax flares ember
- **Secondary:** The tray counter ticks down; the stack is visibly shorter
- **Character:** None; this is my economy
- **World:** None
- **Sound:** Chip clacks 40 ms apart, rising pitch
- **Haptic:** One tick per chip (max 6, then a roll)
- **Duration:** 40 ms × chips, capped at 450 ms
- **Reduced motion:** The stack snaps to its new height; the counter updates; one clack

#### Turn change — MICRO

- **Anticipation:** The active clock’s last second ticks louder
- **Primary motion:** The light pool slides from one edge of the table to the other
- **Impact:** The clock enamel flips ember ↔ violet
- **Secondary:** The inactive side dims 15%
- **Character:** Theirs: thinking starts. Mine: the listening pose
- **World:** None
- **Sound:** Clock “tick-tock” flip
- **Haptic:** Double tap when it becomes MY turn only
- **Duration:** 400 ms
- **Reduced motion:** Instant light switch + enamel swap

#### Opponent thinking — MICRO

- **Anticipation:** —
- **Primary motion:** The thinking loop: hand to chin, thought beads rise every 1.6 s
- **Impact:** —
- **Secondary:** Their clock ring drains; my side is calm and dim
- **Character:** Idle breathing continues; a blink every 3–5 s
- **World:** The lanterns sway slowly; harbour ambience
- **Sound:** Low harbour ambience only
- **Haptic:** None
- **Duration:** Loops for their clock
- **Reduced motion:** Static thinking pose, no beads

#### Bounty multiplier loss — MICRO → MOMENT

- **Anticipation:** The medallion rim darkens as the next step approaches
- **Primary motion:** Each −1% chips a sliver off the gold medallion edge
- **Impact:** At 70 / 50 / 30%: a louder crack and the medallion shrinks one size
- **Secondary:** A gold flake falls onto the table and stays (visible history)
- **Character:** None; the clock is not the opponent’s fault
- **World:** None
- **Sound:** Tiny metal “tik”; a crack at thresholds
- **Haptic:** None per tick; tap at thresholds
- **Duration:** 200 ms per tick; 500 ms at thresholds
- **Reduced motion:** Number updates; the shrink happens without motion

#### Offers becoming close — MOMENT

- **Anticipation:** Heat builds from the gap ratio (gap ÷ opening gap), never from a new meter
- **Primary motion:** The whole scene warms one step: lanterns, gap glow, vignette
- **Impact:** None: heat is a climate, not a hit
- **Secondary:** Fireflies drift toward the table; the lantern flames stretch
- **Character:** Posture tightens: arms fold, leans in
- **World:** The harbour murmur fades; a heartbeat pulse at the top step
- **Sound:** Ambient layers drop out one by one
- **Haptic:** Optional heartbeat at the top step (off by default)
- **Duration:** 1.2 s cross-fade per step
- **Reduced motion:** Colour temperature only, no vignette pulse

#### Offers crossing — MOMENT (strong)

- **Anticipation:** The pins pass each other on the rail
- **Primary motion:** Snap: the pins click together, the rail turns green
- **Impact:** One green shockwave across the table
- **Secondary:** The ACCEPT seal rises out of the table; the gap glow becomes a steady green breath
- **Character:** Surprised → smug (they know it too)
- **World:** Lantern flames flash green-white once
- **Sound:** Bright two-note “ting-ting” + a sustained low chord
- **Haptic:** Double tap
- **Duration:** 400 ms, then a 1.2 s breathing loop (non-settling)
- **Reduced motion:** Instant green state; the seal appears without rising

#### Verified information reveal — MOMENT

- **Anticipation:** A courier’s bell rings off-screen
- **Primary motion:** A notarised slip slides under the asset from the side
- **Impact:** A brass VERIFIED stamp clicks onto the slip
- **Secondary:** The asset’s glow shifts (brighter if it helps value, cooler if not)
- **Character:** A glance at the slip; the reaction reads only what is public
- **World:** None
- **Sound:** Bell + paper slide + small stamp
- **Haptic:** Tap
- **Duration:** 700 ms
- **Reduced motion:** The slip appears with a 150 ms fade

#### Voice / pitch activity — MICRO

- **Anticipation:** —
- **Primary motion:** Speaking: a soft sound-ripple from the speaker’s mouth; their lantern brightens with their voice level
- **Impact:** —
- **Secondary:** Spoken numbers never move pins or plaques; a small “not an offer” tag on detected numbers
- **Character:** The talk mouth is driven by the voice envelope (2-frame)
- **World:** None
- **Sound:** None added; voice is the sound
- **Haptic:** None
- **Duration:** Continuous
- **Reduced motion:** A static “speaking” badge on the nameplate

### Closing

#### Acceptance — REWARD

- **Anticipation:** The green seal squashes 20% under the thumb
- **Primary motion:** A green shockwave rolls out; my hand reaches across the table and his meets it
- **Impact:** 60 ms hit-stop on the handshake, with the ambience cut to silence
- **Secondary:** The rail pins lock; the plaque and card slide together
- **Character:** The accepted pose (hand out) → pleased or grudging by outcome
- **World:** Every lantern flares; the asset glows gold
- **Sound:** Wax press → silence → a deep bell + crowd-free “thunk”
- **Haptic:** Heavy on press, a long thud on the handshake
- **Duration:** 350 ms, then the result reveal begins
- **Reduced motion:** The seal changes, a still handshake frame, the bell; no shockwave

#### Walk away — MOMENT

- **Anticipation:** A 1 s hold-to-confirm ring fills around the knob
- **Primary motion:** My chair scrapes back; the camera pulls back 4%
- **Impact:** My card is swept off the table
- **Secondary:** The asset glow fades out; the rail empties
- **Character:** Shrug (no deal) or relief, from public info only
- **World:** The lanterns dim one step; the harbour sounds return
- **Sound:** Chair scrape + paper sweep
- **Haptic:** One long soft buzz
- **Duration:** 800 ms
- **Reduced motion:** Hold ring stays; the scene cuts to the dimmed state

#### Timeout — MOMENT

- **Anticipation:** The last 5 s: the clock ticks louder and the enamel pulses
- **Primary motion:** The clock hand hits zero; the light pool snuffs like a candle
- **Impact:** A dull bell
- **Secondary:** The bounty medallion goes grey
- **Character:** Surprised → no deal
- **World:** One lantern gutters out
- **Sound:** Tick crescendo → dull bell
- **Haptic:** Three decreasing taps
- **Duration:** 900 ms
- **Reduced motion:** The count stays; a grey state cut; the bell

#### No deal — MOMENT

- **Anticipation:** —
- **Primary motion:** The ledger slides in and NO DEAL is stamped in grey ink
- **Impact:** A soft stamp, no shake
- **Secondary:** The asset returns to their side; the coins do not appear
- **Character:** The nodeal shrug; a nod of respect if the gap was small
- **World:** The lanterns cool to night blue
- **Sound:** Low muted stamp, a single soft tone
- **Haptic:** Single soft tap
- **Duration:** 900 ms, then limits reveal as usual
- **Reduced motion:** Stamp appears; no slide

### Result & progression

#### Hidden-limit reveal — REWARD

- **Anticipation:** Both limit cards lift 10 px
- **Primary motion:** Theirs slides across face-down and flips (rotateY); mine turns to face them
- **Impact:** Each flip lands with a card “snap”
- **Secondary:** Posts rise from the rail at both limit values
- **Character:** Surprised when my limit was far above the price (public now)
- **World:** None
- **Sound:** Two card snaps
- **Haptic:** Two taps
- **Duration:** 900 ms
- **Reduced motion:** Both cards appear face-up with a 150 ms fade

#### Surplus calculation — REWARD

- **Anticipation:** The gold span between the posts hums
- **Primary motion:** It cracks at the settlement pin; the two parts fill violet and ember
- **Impact:** Coins pour from each part to each side, one coin per unit
- **Secondary:** Coin piles are real counts (13 : 5 here), so the pile size IS the result
- **Character:** Watches the coins go; slumps if my pile is larger
- **World:** None
- **Sound:** Coin pour, pitch mapped to count
- **Haptic:** A roll for the length of the pour
- **Duration:** 1.1 s (capped; 1 coin = 1 unit up to 30, then 1 coin = 2)
- **Reduced motion:** The split bar and final piles appear; the numbers stay

#### Strong result (≥ 65%) — REWARD

- **Anticipation:** A beat of silence after the pour
- **Primary motion:** The brass headline banner rises out of the ledger: YOU CAPTURED 72%
- **Impact:** The banner lands with a bright chord
- **Secondary:** The ember span pulses once per 10%; the asset gleams on my side
- **Character:** Frustrated or impressed (by character personality)
- **World:** The lanterns hold warm; sparkles on the asset (max 4)
- **Sound:** Rising three-note phrase
- **Haptic:** Double tap
- **Duration:** 900 ms (masterful > 85%: 2.4 s lantern cascade)
- **Reduced motion:** Banner fade-in; no sparkle

#### Weak result (< 35%) — MOMENT

- **Anticipation:** —
- **Primary motion:** The headline rises lower and smaller, in ledger ink not brass
- **Impact:** No chord, one soft low tone
- **Secondary:** The small ember pile; no sparkle
- **Character:** Smug, or a kind shrug if it’s a friend match
- **World:** The lanterns do not flare
- **Sound:** Single soft tone
- **Haptic:** None
- **Duration:** 500 ms: never make a bad result slow
- **Reduced motion:** Same, static

#### Rating gain / loss — REWARD / MOMENT

- **Anticipation:** The medallion drops onto the ledger
- **Primary motion:** The rating counts up (or down) in ≤ 600 ms; the division bar fills or drains
- **Impact:** A gain ends with a bright “ting”; a loss with a soft brass tap
- **Secondary:** Gain: gold sparkles at the bar tip. Loss: the bar drains, with no red flash
- **Character:** Watches; congratulates on big gains
- **World:** None
- **Sound:** Ascending (gain) / descending (loss) tick run
- **Haptic:** Ticks during the count; tap at the end
- **Duration:** 600–1200 ms
- **Reduced motion:** Final number shown with the delta; no count-up

#### Division promotion — REWARD (largest)

- **Anticipation:** The bar overfills; light leaks from the medallion edges
- **Primary motion:** A 300 ms hush, then the district bell; the new medallion drops from the canopy on a ribbon
- **Impact:** It swings to a stop; one screen-shake (the 2nd and last allowed)
- **Secondary:** The lanterns relight in a wave toward me in the division colour; neighbours applaud
- **Character:** Pleased; tips his head; others lean into the frame
- **World:** A new nameplate is bolted to my table edge, permanently
- **Sound:** Silence → deep bell → rising brass fanfare (3 s, no loops)
- **Haptic:** Heavy, then a slow roll
- **Duration:** 3.6 s, skippable after 1 s
- **Reduced motion:** The medallion and nameplate appear; the bell; no wave or shake

#### Rematch challenge — MOMENT

- **Anticipation:** He straightens and points at the camera
- **Primary motion:** The crimson REMATCH seal rolls into the thumb zone
- **Impact:** It settles with a wax thump
- **Secondary:** A ring pulses around it every 2 s (max 3 times)
- **Character:** The rematch pose: pointing, a grin
- **World:** His lantern turns toward me
- **Sound:** Wax thump + short brass sting
- **Haptic:** Tap
- **Duration:** 600 ms
- **Reduced motion:** The seal appears; no pulse

## Signature sequences

### A · Offer landing

| t | Beat | What happens |
|---|---|---|
| 0 ms | Anticipation | Seal squashes 15% (90 ms). The card lifts 10 px; my pin crouches on the rail. |
| 90 ms | Launch | The sealed card skids forward along the ember runner, with a paper “shhk”. |
| 220 ms | Pin flight | The card’s number flies up into the pin; the pin arcs along the rail from 58 to 64. |
| 320 ms | Impact | Hard stop + 40 ms hit-stop. Ring and 3 dust puffs; the rail shivers, and their plaque rattles 2°. Haptic thud. |
| 600 ms | Settle | The gap glow re-measures. The table light hands over to violet (400 ms fade), and their clock starts. |

### A · Incoming offer

| t | Beat | What happens |
|---|---|---|
| 0 ms | Hand rises | Their hand lifts the new plaque. The old one is already gone (swept 120 ms earlier). |
| 180 ms | Drop | Brass drop with one 8% bounce. Dust, an impact ring and a low “clunk”; the pin slides 84 → 78. |
| 500 ms | My turn | The ember pool fades up at my edge, the clock enamel flips to ember with a tick, and a soft double haptic. |

### B · Concession spend

| t | Beat | What happens |
|---|---|---|
| tap +1 | One chip lifts | Each + lifts exactly one chip off the stack and parks it on the card. The tray ticks 68 → 67. Haptic tick, a light “clack”. |
| tap +6 | Six on the card | Six chips hover in a 3×2 grid. My stack is visibly shorter, and the ghost pin shows where I would land. |
| hold | Big step warning | Large concession (≥ 20% of remaining chips): the hovering chips tremble 2 px, and the card rim warms. No block, just weight. |
| press | Chips melt into wax | Press: six chips drop into the wax one by one (40 ms apart, rising pitch) and flare ember. |
| can’t afford | Bounce back | Not enough chips: the chip jumps toward the card, bonks, and falls back to the empty tray. A dull “tok”; the seal stays pale. |

### C · Deal heat (heat = 1 − gap ÷ opening gap, 4 steps; public data only)

| t | Beat | What happens |
|---|---|---|
| gap 20 | Cold | Neutral light. The lanterns sway, the harbour is quiet, and he stands relaxed. |
| gap 14 | Warming | Gap glow pale gold. The lanterns brighten 10% and the harbour hum drops a tone. |
| gap 9 | Warm | Amber glow, a faint vignette. He folds his arms. Fireflies drift toward the table. |
| gap 5 | Hot | Deep amber, tighter vignette, lantern flames taller. A low heartbeat pulse joins the ambience. |
| gap 2 | Boiling | Near-closed: the gap glow flickers. The crowd murmur stops. Heartbeat haptic (off by default). |

### D · Deal possible (crossed; non-settling)

| t | Beat | What happens |
|---|---|---|
| 0 ms | Pins pass | Their 68 lands below my 70. The violet pin slides past mine, and the rail notices. |
| 140 ms | Snap | The pins click together and the rail goes green. One green shockwave; the lantern flames turn briefly green-white. Double haptic. |
| 400 ms | Accept rises | A green ACCEPT seal rises out of the table (400 ms), larger than any seal before it. My old seal is gone. |
| loop | Holds open | Non-settling: the green breathes (1.2 s period). My clock and the bounty keep draining, and nothing closes until I press. |

### E · Acceptance

| t | Beat | What happens |
|---|---|---|
| 0 ms | Press | The green seal squashes 20% under the thumb. Heavy haptic on press-down, not on release. |
| 90 ms | Shockwave | A green ring rolls across the table, the rail pins lock, and my hand reaches forward to meet his. |
| 250 ms | Hit-stop | 60 ms freeze on the handshake. Ambient sound drops out, so the next sound lands in silence. |
| 350 ms | Stamp | The ledger slides in and DEAL 69 slams: the one screen-shake (6 px, 120 ms). The compass glides to my side. |

### F · Result reveal

| t | Beat | What happens |
|---|---|---|
| 0.0 s | DEAL | Stamp |
| 1.1 s | Limits | Both limit cards flip |
| 2.0 s | Range | Posts rise, gold span |
| 2.6 s | Settlement | The 69 pin drops in |
| 3.0 s | Split | Coins pour 13 : 5 |
| 4.0 s | Headline | YOU CAPTURED 72% |
| 4.8 s | Rating | +21, bar fills |

### G · Performance tiers

| t | Beat | What happens |
|---|---|---|
| < 35% | Weak | Muted: no sparkle and no coin sound, just one soft low tone. He looks smug. Rematch is offered right away (no dwell). |
| 35–65% | Fair | Standard: coins pour evenly with a warm two-note chime. He nods. |
| 65–85% | Strong | Bigger pile, sparkles on the compass, a rising three-note phrase. He slumps. |
| > 85% | Masterful | Lantern cascade: every lantern in the market lights in sequence toward me. The compass lifts and turns once, and he applauds. 2.4 s, skippable. |

### H · Rank promotion

| t | Beat | What happens |
|---|---|---|
| 0.0 s | Threshold | The bar overfills and light leaks out of the medallion’s edges. The count stops at the threshold. |
| 0.8 s | Hush | Hush (300 ms): the market dims, everything but the medallion. The ambience cuts. He looks up. |
| 1.1 s | Bell + medal | The district bell rings once. The Captain medallion drops from the canopy on a crimson ribbon and swings to a stop. |
| 2.0 s | Lantern wave | The lanterns relight in a wave toward me, now in ember. Neighbouring dealmakers lean in and applaud; Goldenotter tips his head. |
| 3.6 s | Nameplate | Permanent change: a Captain nameplate is now bolted to MY edge of the table in every future match. Continue sits in the thumb zone. |

## Full-path storyboard (J4) — reference numbers

Buyer reservation 82 · seller reservation 64 · settlement 69 → range 18, buyer surplus 13 → captured 72% · rating 1,512 → 1,533 (illustrative).

| # | Beat | Class | Duration | Choreography | Prototype dwell (ms) |
|---|---|---|---|---|---|
| 1 | They offer 78 | MOMENT | 700 ms | A heavy brass plaque drops and bounces once. Dust puffs, their pin slides down the rail from 84. | 1500 |
| 2 | I consider 64 | MICRO | player time | Each + tick lifts one more chip off my stack onto the card. The stack visibly shrinks before I commit. | 1700 |
| 3 | 6 chips spent | MOMENT | 450 ms | The seal squashes 15%; six chips drop into the wax with six clacks and melt into an ember pulse. | 1000 |
| 4 | My 64 lands | MOMENT | 600 ms | The card skids forward and stamps; my pin is flung up the rail 58 → 64 and slams down with a ring. The gap glow tightens. | 1300 |
| 5 | He reacts | MOMENT | 500 ms | A 6-point jump is ≥ 2× my last step → Goldenotter jolts back (surprised). The compass needle swings. Reads public offers only. | 1200 |
| 6 | He thinks | MICRO | their clock | Violet spotlight on him, my side dims. Thought beads rise; the lanterns sway slowly. Nothing asks me to act. | 1700 |
| 7 | He offers 69 | MOMENT | 700 ms | Old plaque is swept off, the new one slams. His pin slides 78 → 69; the gap glow turns deep amber and the whole stall warms a step. | 1500 |
| 8 | Deal in reach | MOMENT | 900 ms | Private to me: 69 is inside my limit, so my limit card pulses green and a green ACCEPT seal rises out of the table. He goes smug. | 1800 |
| 9 | I accept | REWARD | 350 ms | Press → the seal squashes, a green shockwave rolls across the table, my hand reaches out and his meets it. | 800 |
| 10 | Deal closes | REWARD | 1.2 s | The ledger slides in, the stamp slams (one screen-shake, 6 px, 120 ms). The compass glides across the table to my side. Every lantern flares. | 1600 |
| 11 | Limits flip | REWARD | 900 ms | His violet limit card slides across face-down and flips: 64. Mine flips to face him: 82. He sees my 82 → surprised. | 1400 |
| 12 | The range appears | REWARD | 800 ms | Two brass posts rise from the rail at 64 and 82; the space between fills with gold. The 69 pin drops into it. | 1500 |
| 13 | Surplus splits | REWARD | 1.1 s | The gold span cracks at 69: 13 units pour as coins to my side, 5 to his. Count them: mine is visibly the bigger pile. | 1600 |
| 14 | 72% captured | REWARD | 900 ms | A brass banner rises out of the ledger: 72%. The ember span on the rail pulses once per 10%. He slumps a little; the compass gleams on my side. | 1400 |
| 15 | Rating +21 | REWARD | 1.2 s | The rating medallion drops onto the ledger and counts 1,512 → 1,533; the division bar fills with a rising tone. | 1700 |
| 16 | Rematch | MOMENT | 600 ms | He points straight at me. A big crimson REMATCH seal rolls into the thumb zone; leaving is a small knob. | 2600 |

## Open decisions (do not implement as rules)

- **In reach vs crossed:** "in reach" (their offer ≤ my reservation value) is a private strategic hint shown only to me. Decide whether it may be signalled at all.
- **Verified information reveal** is not defined in the rules; choreography assumes a verified asset fact visible to both players.
- **Concession cost** of 1 chip per unit in the storyboard is a placeholder — use `docs/03_GAME_ECONOMY.md`.
- **Performance tiers** (<35 / 35–65 / 65–85 / >85% capture) are placeholders; tune to the real distribution.
- **Expression triggers** must read only public data (offers, steps, clocks) so reactions never leak reservation values.
- **Human opponents:** expressions automatic (recommended) vs player-chosen emotes.
