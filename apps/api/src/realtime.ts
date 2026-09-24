/**
 * Realtime layer (06_ARCHITECTURE.md §7, 08_API_CONTRACTS.md socket events).
 *
 * - Token-authenticated sockets; the user identity always comes from the
 *   verified token, never from client-supplied ids (SI-003).
 * - Rooms: `user:{userId}` (private views) and `match:{matchId}` (shared
 *   events). Clients join match rooms with `match:join`; the server verifies
 *   participation before joining.
 * - Presence: a verified socket disconnect freezes the active clock after a
 *   debounce (GR-015; the debounce window is server config — OQ-009
 *   abandonment policy stays open). Reconnection cancels the pending freeze
 *   and resumes the same player's clock.
 * - All broadcasts flow from committed command outcomes; sockets never
 *   execute game rules (08: prefer HTTP for mutations in early V1).
 */

import type { AuthAdapter } from './auth/adapters';
import type { MatchCommandService, PrismaClient, StoredSnapshot } from '@bounty-bay/db';
import type { DomainEvent, MatchView } from '@bounty-bay/domain';
import { viewMatchFor } from '@bounty-bay/domain';
import type { FastifyInstance } from 'fastify';
import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'node:crypto';

export interface RealtimeOptions {
  auth: AuthAdapter;
  service: MatchCommandService;
  prisma: PrismaClient;
  /** GR-015 technical debounce before freezing the clock on disconnect. */
  disconnectDebounceMs?: number;
  /** DEC-025: called when a participant joins a match room (lazy AI turn scheduling). */
  onMatchJoin?: (matchId: string) => void;
  /**
   * DD Phase 1: called after every realtime-driven state change (reconnect,
   * disconnect freeze) so consumers can re-arm the hard decision-time
   * deadline (TimeoutScheduler.refresh) and lazily schedule AI turns.
   */
  onMatchStateChange?: (matchId: string) => void;
}

export interface MatchBroadcaster {
  (matchId: string, events: DomainEvent[], snapshot: StoredSnapshot | null): void;
}

export function attachRealtime(app: FastifyInstance, options: RealtimeOptions): { broadcast: MatchBroadcaster } {
  const debounceMs = options.disconnectDebounceMs ?? 5000;
  let io: SocketServer | null = null;

  // Per (matchId, userId): the sockets currently watching that match.
  const presence = new Map<string, Set<string>>();
  const pendingFreeze = new Map<string, NodeJS.Timeout>();
  // Clock heartbeat per ACTIVE match (GR-016 visibility).
  const heartbeats = new Map<string, NodeJS.Timeout>();

  app.addHook('onReady', () => {
    // FF-1 (D-67, DEPLOY_RUNBOOK_ALPHA1.md §1): env-pinned socket origins.
    // Production sets SOCKET_CORS_ORIGINS (or falls back to CORS_ORIGIN) —
    // never '*'. Unset = dev-permissive (mirrors the HTTP CORS plugin's
    // dev default) so local work and the E2E suite keep working. The
    // allowRequest hook actively refuses disallowed browser origins —
    // the cors option alone only withholds headers, which non-browser
    // clients ignore. Requests without an Origin header stay allowed
    // (non-browser clients; browsers always send it).
    const socketOrigins = (process.env.SOCKET_CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    io = new SocketServer(app.server, {
      path: '/socket.io',
      cors: { origin: socketOrigins.length > 0 ? socketOrigins : true, methods: ['GET', 'POST'] },
      ...(socketOrigins.length > 0
        ? {
            allowRequest: (req, done) => {
              const origin = req.headers.origin;
              if (!origin || socketOrigins.includes(origin)) return done(null, true);
              done('origin not allowed', false);
            },
          }
        : {}),
    });

    io.use(async (socket, next) => {
      const token = typeof socket.handshake.auth?.token === 'string' ? (socket.handshake.auth.token as string) : null;
      if (!token) return next(new Error('missing token'));
      const subject = await options.auth.verifyToken(token);
      if (!subject) return next(new Error('unauthorized'));
      socket.data.subject = subject.subject;
      next();
    });

    io.on('connection', (socket) => {
      const subject = socket.data.subject as string;

      // resolve internal user id on join; sockets join user rooms lazily.
      socket.on('user:register', async ({ userId: claimed }: { userId: string }) => {
        // The internal user id must match the authenticated subject's row —
        // never trust the claimed id by itself.
        const user = await options.prisma.user.findUnique({ where: { id: claimed } });
        if (!user || user.authSubject !== subject) return;
        socket.data.userId = claimed;
        void socket.join(`user:${claimed}`);
        socket.emit('user:registered', { userId: claimed });
      });

      socket.on('match:join', async ({ matchId }: { matchId: string }) => {
        const internalId = socket.data.userId as string | undefined;
        if (!internalId) return;
        // Presence is added synchronously so a fast disconnect (which can
        // interleave with this async handler) can never miss the socket.
        const key = presenceKey(matchId, internalId);
        if (!presence.has(key)) presence.set(key, new Set());
        presence.get(key)!.add(socket.id);

        const participant = await options.prisma.matchParticipant.findFirst({
          where: { matchId, userId: internalId },
          select: { id: true },
        });
        if (!participant) {
          // Not a participant: undo presence, no room join.
          presence.get(key)!.delete(socket.id);
          if (presence.get(key)!.size === 0) presence.delete(key);
          return;
        }

        await socket.join(`match:${matchId}`);
        socket.emit('match:joined', { matchId });
        options.onMatchJoin?.(matchId); // DEC-025: a rejoining human may hand the turn to an AI opponent

        // A reconnecting player cancels any pending freeze (GR-015 debounce).
        const freeze = pendingFreeze.get(key);
        if (freeze) {
          clearTimeout(freeze);
          pendingFreeze.delete(key);
        }
        // RECONNECT is always attempted: it is a domain no-op while the
        // player is not marked disconnected, and resumes the same player's
        // clock after a freeze already fired.
        const reconnect = await options.service.reconnect({
          kind: 'RECONNECT',
          matchId,
          playerId: internalId,
          commandId: randomUUID(),
          now: Date.now(),
        });
        if (reconnect.ok && reconnect.events.length > 0) {
          const snapshot = await options.service.loadSnapshot(matchId);
          broadcast(matchId, reconnect.events, snapshot);
          options.onMatchStateChange?.(matchId); // the resumed clock re-arms the deadline
        }
      });

      socket.on('disconnect', async () => {
        const internalId = socket.data.userId as string | undefined;
        if (!internalId) return;
        for (const [key, sockets] of presence) {
          if (!sockets.delete(socket.id)) continue;
          if (sockets.size > 0) continue;
          presence.delete(key);
          const [matchId, userId] = splitKey(key);
          // GR-015 debounce: a quick reconnect must not freeze the clock.
          const timer = setTimeout(() => {
            pendingFreeze.delete(key);
            void options.service
              .disconnect({ kind: 'DISCONNECT', matchId, playerId: userId, commandId: randomUUID(), now: Date.now() })
              .then(async (result) => {
                if (result.ok) {
                  const snapshot = await options.service.loadSnapshot(matchId);
                  broadcast(matchId, result.events, snapshot);
                  options.onMatchStateChange?.(matchId); // the frozen clock pauses the deadline
                }
              })
              .catch((err) => app.log.error({ err, matchId, userId }, 'disconnect freeze failed'));
          }, debounceMs);
          pendingFreeze.set(key, timer);
        }
      });
    });
  });

  // ---------------------------------------------------------------------------

  function broadcast(matchId: string, events: DomainEvent[], snapshot: StoredSnapshot | null): void {
    if (!io || !snapshot) return;
    const { state } = snapshot;
    const serverNow = Date.now();

    io.to(`match:${matchId}`).emit('match:event', { matchId, events, serverNow });
    pushStates(matchId, snapshot, serverNow);
    manageHeartbeat(matchId, state.status);
  }

  /** Per-participant role-scoped views (GR-016 / SI-001 scoping lives here). */
  function pushStates(matchId: string, snapshot: StoredSnapshot, serverNow: number): void {
    if (!io) return;
    const { state, config } = snapshot;
    for (const participant of state.participants) {
      const view: MatchView = viewMatchFor(state, participant.playerId, serverNow, config);
      io.to(`user:${participant.playerId}`).emit('match:state', { matchId, view, serverNow });
    }
  }

  function manageHeartbeat(matchId: string, status: string): void {
    const active = status === 'ACTIVE';
    const existing = heartbeats.get(matchId);
    if (active && !existing && io) {
      const timer = setInterval(() => {
        // DD Phase 1 (GR-023): re-project per tick so the decision-time
        // warning tiers advance even while nobody acts — the client renders
        // server-derived fields only and must never compute the rule.
        void options.service
          .loadSnapshot(matchId)
          .then((snapshot) => {
            if (snapshot && snapshot.state.status === 'ACTIVE') {
              pushStates(matchId, snapshot, Date.now());
            } else {
              io!.to(`match:${matchId}`).emit('match:clock-sync', { matchId, serverNow: Date.now() });
            }
          })
          .catch((err) => app.log.warn({ err, matchId }, 'heartbeat snapshot load failed'));
      }, 5000);
      heartbeats.set(matchId, timer);
    } else if (!active && existing) {
      clearInterval(existing);
      heartbeats.delete(matchId);
    }
  }

  function presenceKey(matchId: string, userId: string): string {
    return `${matchId}|${userId}`;
  }
  function splitKey(key: string): [string, string] {
    const [matchId, userId] = key.split('|');
    return [matchId!, userId!];
  }

  return {
    broadcast: (matchId, events, snapshot) => broadcast(matchId, events, snapshot),
  };
}
