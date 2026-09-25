# Golden reference v4 — visual audit and the 20 changes

Design session, 2026-09-24. Scope: `states/live-match.html`, `states/result.html`, `states/bay.html` at 1440×900 and 390×844.
Measurements were taken from the v3 (Lantern Luxe) pages with Playwright (element boxes, computed font sizes, visible
word counts) and from the renders (luminance and local-contrast grids as a saliency proxy). The v4 pages implement
all 20 changes; items that need a founder decision are built as `data-pending` layers (visible with `?pending=1`).

## What the audit found (v3)

| Area | Finding (measured) |
|---|---|
| Focal point | Saliency was flat on every screen: all nine grid cells scored 7–13 (local-contrast units). On the live match the centre cell — where the negotiation happens — was among the *least* salient (7.2); the brightest region was the painted chart board at the right (L 0.45). |
| Size vs importance | Live match: the price rail was 720×10 px = **0.6 %** of the screen; each offer plaque 0.4 %. The opponent was 20 %. The fight was the smallest thing on the table. Result: the ledger (7.4 %) outweighed the stamp (2.5 %) and her limit card (0.8 %) — the climax was the smallest element. Bay: the event rail (18.8 %) was mostly locked content; the largest text on the page was the "?" (88 px). |
| Type | 14–18 distinct font sizes per screen; 8–10 px text on mobile (limit kicker 8 px). |
| Words | 96 (live), 118 (result), 150 (bay) visible words. |
| Colour | Gold carried nine jobs: rims, ribbons, ledger title, clock, tabs, the letter glow, the standing glow, the CTA, value numbers — so it meant nothing. |
| Materials | One walnut material for everything; four radii; three shadow recipes; the background painting at full sharpness competing with the UI. |
| Motion | Six idle effects (stamp, bloom, breathe, shine, letter nudge, pulsing dots, sparkles) without a stated job. |
| Characters | Her name plate lived in a corner card, disconnected from her; the painting's props were as sharp as she was. |

## The 10 visual changes (V1–V10)

| # | Change | Where in v4 |
|---|---|---|
| V1 | **One focal point per screen.** A spotlight (`data-focus`) lifts the one place the eye should go; the rest of the scene is graded down. | `world.js` `.w-spot` / `.w-grade`; live focus on the band, result on the reveal, Bay on the table. |
| V2 | **Three depth planes.** Painting defocused (blur 2.2 px) and dimmed to 74 %; the person sharp and rim-lit; the table and the fight in front. | `golden.css` `.w-bg`, `.sprite`. |
| V3 | **Six-step type scale, nothing under 12 px.** 12 / 14 / 18 / 24 / 36 / 64 (hero 88); mobile 12 / 14 / 16 / 20 / 28 / 40. Measured: smallest text is now 12 px on all six views (was 8 px). | `--fs-*` tokens; all three states. |
| V4 | **Fewer words, every number once.** Measured desktop: live 96 → 78, result 118 → 104, Bay 150 → 127 — while adding the drain, the tell and the rival record. Cut: "sealed — KESTREL never sees this", "WITH OFFER 74", "WAITING ON YOU", the ledger rows, the host bubble. | All states. |
| V5 | **Gold means value.** Rims and frames are neutral hairlines; gold only on bounty, the one primary action and value numbers. Ember = you, violet = her, green = the deal. | `--lx-rim` neutral; ribbons are glass; letter/standing glows removed. |
| V6 | **Size = importance (area budgets).** Band ≥ 820 px wide and 3× taller; offers 120×72; her limit card 132×164; primary buttons ≥ 230×76; Bay table ≥ 35 % of the screen. | Contracts `minSize` / `minArea`. |
| V7 | **One reading axis.** Result stacks everything on one centre axis (x = 40 %); side columns hold only secondary things; mobile puts the decision in the bottom third. | Result and live layouts. |
| V8 | **Three materials, three radii.** Glass (HUD chips over the scene, blurred behind) · walnut (cards) · objects (brass, enamel, stamp). Radii 12 / 20 / pill. | `.glass`, `.card`, object components; `--r-*`. |
| V9 | **Motion with a job.** Three speeds: snap 180 ms (feedback), settle 450 ms (arrivals), ceremony 900 ms (the reveal). Idle motion only on the one primary and the lanterns. Sparkles and the letter nudge removed. | `--t-*`; `.sparkle { display:none }`. |
| V10 | **Characters are actors.** Her name plate and rivalry sit next to her; rim light and contact shadow; props behind her are soft. | Live `.lm-opp`; `.sprite` filter. |

## The 10 stickiness changes (panel recommendations 1–10)

| # | Change | Where in v4 | Status |
|---|---|---|---|
| 1 | **The limit reveal is the climax.** Both limits start sealed; yours turns at 0.9 s, hers at 2.1 s (a longer pause), then the zone splits and "She'd have gone to 59 — 15 left on the table" appears under her part. | Result: `.flip` cards, `left-on-table`. | Canon (GR-018 respected: only after the deal). |
| 2 | **The gap is the hero of the live match.** A 30 px band across the table; every round's gap drawn on it, faint when old, bright now, so convergence is visible; big offer plaques; GAP 2 at 24 px. | Live: `price-rail`, `gap-label`. | Canon. |
| 3 | **Clock cost is visible.** A coin pile under the clock thins while your face runs: "×84 % of the bounty · falls while you think". | Live: `bounty-drain`. | Canon (shows GE-008/009, adds no rule). |
| 4 | **Collection cabinet.** The traded item flies into the cabinet; Navigator's Set 3/4 on the Bay. | Result `cabinet-counter`, `trophy-fly`; Bay `bay-cabinet`. | **PENDING — DEC collection** (GE-004, docs/14). |
| 5 | **Rivals.** Head-to-head record on her plate, in her rematch offer and on her letter. | `rival-record` on all three states. | Canon (record from match history). A reward for settling a rivalry would need a DEC. |
| 6 | **One hero per Bay screen, no dead tiles.** Table hero → the rival waiting on you → (pending) streak and cabinet → one compact list; locked items say what opens them. | Bay. | Canon. |
| 7 | **A daily reason to return (no energy meter).** Keep the lantern lit: one rated deal a day, streak dots, freeze token. | Bay `bay-streak`, hub `streak-counter`. | **PENDING — DEC streak** (docs/14, D-16). |
| 8 | **Three reads on the result.** Stamp + share → reveal → reward. The ledger is one receipt line: 100 × 63.4 % × 84 % − 12 = 41.3 (GE-010 minimum still visible). Exact numbers kept (docs/09: the numbers are ruthless). | Result `result-ledger`. | Canon. |
| 9 | **Readable tells.** "Her steps 24 › 12 › 6 › 4" under her line — public information only (her own offers), read as a pattern. The clip changes with her state. | Live `opponent-tell`. | Canon. |
| 10 | **Sound and haptics are design.** `sfx.json` names 11 cues with length, loudness and haptic pattern; timeline steps carry `sfx`; the golden pages synthesise placeholders (`?sound=1` or the speaker button). | `sfx.json`, `golden.js` `Sfx`, `sound-toggle`. | Canon; produced audio to be commissioned. |

Rejected by the panel and not built: spins, random reward chests, paid energy, fake scarcity timers (docs/09 gambling patterns).
