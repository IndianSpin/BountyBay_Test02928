/**
 * PDR-4 (OPEN with the founder): should a RETURNING signed-in player see
 * the opening/title screen, or route straight to the Bay?
 *
 * Default SHOW per the manager's ruling-in-progress (D-35). When the
 * founder answers "skip straight to the Bay", flip this single flag —
 * opening-screen.tsx reads only this switch; nothing else changes.
 */
export const SHOW_TITLE_ON_RETURN = true;
