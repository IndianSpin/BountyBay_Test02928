/**
 * Insights API (BB-220, D-25): serves the IN-3 longitudinal player
 * profile (longitudinal-profile-0.1.0, docs/18 §9 + docs/20) for the
 * caller themselves — a player analyzes their own negotiation only
 * (docs/18 §14). The pure engine (packages/intelligence `buildProfile`)
 * computes aggregates, windows, trends, descriptors, and the role split
 * from the caller's own stored feature rows (written at match completion,
 * DEC-028). Same-version rows only; the casts are safe for rows written
 * by the engine version the loader reads back (review-route pattern).
 *
 * Coaching state is deliberately absent: coaching-state-0.1.0 has no
 * persistence yet; serving an empty state would be fake. Its store and
 * endpoints belong with IN-5/IN-7.
 */

import type { PrismaClient } from '@bounty-bay/db';
import { buildProfile, FEATURE_ENGINE_VERSION, type BehaviorFeatures } from '@bounty-bay/intelligence';
import type { FastifyInstance } from 'fastify';

export interface InsightsRoutesOptions {
  prisma: PrismaClient;
}

export function registerInsightsRoutes(app: FastifyInstance, options: InsightsRoutesOptions): void {
  /** GET /v1/me/insights — the caller's longitudinal profile, or null without a completed match. */
  app.get('/v1/me/insights', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request) => {
    const rows = await options.prisma.matchFeature.findMany({
      where: {
        playerId: request.userId!,
        version: FEATURE_ENGINE_VERSION,
        match: { completedAt: { not: null } },
      },
      orderBy: { match: { completedAt: 'asc' } },
      select: { matchId: true, features: true, match: { select: { completedAt: true } } },
    });

    const inputs = rows.map((row) => ({
      matchId: row.matchId,
      endedAt: row.match.completedAt!.getTime(),
      features: row.features as unknown as BehaviorFeatures,
    }));

    // ABORTED matches are excluded by the engine (technical termination is
    // not a negotiation); pre-filter here to distinguish the "no data yet"
    // empty state from a profile.
    if (!inputs.some((input) => input.features.outcome !== 'ABORTED')) {
      return { profile: null };
    }

    return { profile: buildProfile(inputs, request.userId!) };
  });
}
