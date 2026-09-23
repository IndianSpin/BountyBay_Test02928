/**
 * @bounty-bay/domain — pure, deterministic, server-owned game rules.
 *
 * The most important architectural boundary (CLAUDE.md): all authoritative
 * game legality and calculations live here with no web framework, database,
 * Socket.IO, auth provider, analytics SDK, or LLM dependency.
 *
 * Every function takes authoritative time as a parameter; nothing reads the
 * system clock and nothing draws randomness internally.
 */

export * from './amount';
export * from './clock';
export * from './concession';
export * from './economy';
export * from './match';
export * from './projection';
export * from './replay';
export * from './types';
