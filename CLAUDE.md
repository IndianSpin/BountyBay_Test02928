# Claude Project Instructions

Follow `AGENTS.md` as the mandatory operating contract.

Do not use previous chat history as authority over repository specs. Read the minimum relevant canonical documents for the current task, use `agent/CONTEXT_MANIFEST_TEMPLATE.md` to define task context, and stop on contradictions rather than guessing.

The most important architectural boundary is `packages/domain`: all authoritative game legality and calculations are pure, deterministic, server-owned, and extensively tested.

## Design reference (non-canonical)

The exported design canvas lives in `design-sandbox/bounty-bay-canvas/` (see its `README.md`). For animation, feedback and reward work read `design-sandbox/bounty-bay-canvas/motion-spec.md` first; target visuals are in `renders/`. It is a design reference only: `docs/` (especially `docs/09_UI_DESIGN_SYSTEM.md`) always wins, and conflicts must be reported, not resolved by guessing.

Only `design-sandbox/bounty-bay-canvas/` is current — begin with the "START HERE" table in its README. Never implement from `design-sandbox/_superseded/` (replaced designs, kept for history).
