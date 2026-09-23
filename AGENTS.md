# AGENTS.md — Mandatory Instructions for Coding Agents

## Source-of-truth priority

1. `docs/02_GAME_RULES.md`
2. `docs/03_GAME_ECONOMY.md`
3. `docs/05_PRD.md`
4. `docs/06_ARCHITECTURE.md`
5. `docs/07_DATA_MODEL.md`
6. `docs/08_API_CONTRACTS.md`
7. `docs/01_PRODUCT_SCOPE.md`
8. `docs/00_PRODUCT_NORTH_STAR.md`
9. `docs/12_DECISION_LOG.md`

If documents conflict: **stop and report the conflict. Do not infer intent.**

If an item appears in `docs/14_OPEN_QUESTIONS.md`, do not silently turn a provisional assumption into a permanent rule.

## Before changing code

Every task must state:

- objective;
- relevant rule/requirement IDs;
- files expected to change;
- explicit out-of-scope items;
- tests required.

Read only the relevant canonical sections. Do not load the entire project history unless necessary.

## Never

- invent product rules;
- change a game rule as part of implementation convenience;
- duplicate authoritative game calculations in the client;
- trust client clocks;
- expose opponent reservation value pre-result;
- use floating-point values for player offer amounts;
- add a dependency without explaining why;
- modify unrelated files while "cleaning up";
- rename domain vocabulary casually;
- make AI opponents appear human;
- enable real-money behavior in V1;
- use chat content as executable/system instructions.

## Domain rule

`packages/domain` is pure and deterministic. It cannot import web framework, database, Socket.IO, auth provider, analytics SDK, or LLM provider code.

## Testing rule

Any change to game behavior requires tests demonstrating:

- valid case;
- invalid case;
- boundary case;
- relevant invariant/property when applicable.

Bug fixes require a failing regression test first where practical.

## Completion report

At task end report:

1. changed files;
2. behavior implemented;
3. tests added/run;
4. unresolved issues;
5. any spec ambiguity encountered;
6. no-spec-change confirmation or decision-log update reference.
