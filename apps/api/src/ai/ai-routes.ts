/**
 * AI practice routes (DEC-025, docs/08): POST /v1/matches/ai creates an
 * unrated practice match against one persona. The AI readies immediately;
 * the turn engine schedules its moves from then on. Mode AI matches carry
 * ratingVersion null (GR-019, DEC-004) — AI never touches human rating.
 */

import { AI_PERSONAS_VERSION, personaByKey } from '@bounty-bay/ai';
import { createAiMatchRequestSchema } from '@bounty-bay/contracts';
import type { MatchCommandService, PrismaClient } from '@bounty-bay/db';
import { ensureAiBotUsers, findBotByPersona, verifiableFactIdsForRole } from '@bounty-bay/db';
import type { Role } from '@bounty-bay/domain';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { assignAiOpponentRole, assignCreatorRole, pickFirstPlayer } from '../match-assignment';
import { scenarioForRole, statusFor } from '../match-routes';
import type { MatchBroadcaster } from '../realtime';
import type { AiTurnEngine } from './engine';

export interface AiRoutesOptions {
  service: MatchCommandService;
  prisma: PrismaClient;
  broadcast: MatchBroadcaster;
  engine: AiTurnEngine;
  gameRulesVersion: string;
  economyConfigVersion: string;
}

export function registerAiRoutes(app: FastifyInstance, options: AiRoutesOptions): void {
  app.post('/v1/matches/ai', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = createAiMatchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'commandId (uuid) and a valid persona are required' });
    }
    const persona = personaByKey(parsed.data.persona);
    if (!persona) return reply.code(400).send({ code: 'INVALID_PERSONA', message: 'unknown persona' });

    const scenario = await options.prisma.scenario.findFirst({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } });
    if (!scenario) return reply.code(503).send({ code: 'NO_SCENARIO_AVAILABLE', message: 'no published scenario exists' });

    let bot = await findBotByPersona(options.prisma, persona.key);
    if (!bot) {
      await ensureAiBotUsers(options.prisma);
      bot = await findBotByPersona(options.prisma, persona.key);
    }
    if (!bot) return reply.code(503).send({ code: 'AI_UNAVAILABLE', message: 'practice opponent unavailable' });

    const assignment = assignCreatorRole({ scenarioId: scenario.id, scenarioVersion: scenario.version });
    const aiRole: Role = assignment.role === 'BUYER' ? 'SELLER' : 'BUYER';
    const aiRv = assignAiOpponentRole(aiRole);
    // DD-M3 (GR-028): the human may formally reveal their verifiable facts;
    // the bot has no dossier ([]) — unrevealed facts never reach the AI.
    const humanFacts = verifiableFactIdsForRole(scenario, assignment.role);
    const buyer =
      assignment.role === 'BUYER'
        ? { playerId: request.userId!, role: 'BUYER' as const, reservationValueTenths: assignment.reservationValueTenths, verifiableFactIds: humanFacts }
        : { playerId: bot.id, role: 'BUYER' as const, reservationValueTenths: aiRv, verifiableFactIds: [] };
    const seller =
      assignment.role === 'SELLER'
        ? { playerId: request.userId!, role: 'SELLER' as const, reservationValueTenths: assignment.reservationValueTenths, verifiableFactIds: humanFacts }
        : { playerId: bot.id, role: 'SELLER' as const, reservationValueTenths: aiRv, verifiableFactIds: [] };

    const matchId = randomUUID();
    const created = await options.service.createMatch(
      {
        matchId,
        mode: 'AI',
        scenarioId: scenario.id,
        scenarioVersion: scenario.version,
        gameRulesVersion: options.gameRulesVersion,
        economyConfigVersion: options.economyConfigVersion,
        ratingVersion: null,
        buyer,
        seller,
        firstPlayerId: pickFirstPlayer(request.userId!, bot.id),
        createdAt: Date.now(),
      },
      { aiPersonaKey: persona.key, aiPersonaVersion: AI_PERSONAS_VERSION },
    );
    if (!created.ok) return reply.code(statusFor(created.code)).send(created);

    // the AI readies immediately; the human READY activates the match
    const aiReady = await options.service.ready({ kind: 'READY', matchId, playerId: bot.id, commandId: randomUUID(), now: Date.now() });
    if (!aiReady.ok) return reply.code(statusFor(aiReady.code)).send(aiReady);
    options.broadcast(matchId, aiReady.events, await options.service.loadSnapshot(matchId));
    void options.engine.maybeSchedule(matchId);

    return reply.code(201).send({
      matchId,
      mode: 'AI',
      unrated: true,
      persona: { key: persona.key, displayName: persona.displayName, handle: persona.handle, blurb: persona.blurb },
      aiPlayerId: bot.id,
      role: assignment.role,
      reservationValueTenths: assignment.reservationValueTenths,
      aiReady: true,
      scenario: scenarioForRole(scenario, assignment.role),
    });
  });
}
