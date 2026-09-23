/**
 * Internal user + profile repository (07_DATA_MODEL: User, PlayerProfile;
 * PRD-001/PRD-002).
 *
 * The internal user is keyed by the auth provider's subject — Clerk's user
 * object is never the domain user model (DEC-023). Public DTOs expose the
 * 08_API_CONTRACTS profile shape and nothing private (no authSubject, no
 * email, no moderation signals).
 */

import { Prisma, type PrismaClient } from './generated/prisma/client';

/** PRD-001: default public identity is a unique anonymous handle. */
export const HANDLE_PATTERN = /^[A-Za-z0-9_-]{3,16}$/;

export interface PublicProfileDto {
  handle: string;
  bountyRating: number;
  ratedGames: number;
  agreementRate: number;
  averageSurplusShare: number;
}

export interface MeDto {
  id: string;
  handle: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  profile: {
    bountyRating: number;
    ratingVersion: string | null;
    ratedGames: number;
    ratedDeals: number;
    ratedNoDeals: number;
    agreementRate: number;
    averageSurplusShare: number;
  };
}

// Default-handle word pools (maritime flavor; "BlackParrot" is the docs example).
const ADJECTIVES = ['Black', 'Silent', 'Crimson', 'Lucky', 'Salty', 'Bold', 'Wandering', 'Golden', 'Iron', 'Midnight'];
const NOUNS = ['Parrot', 'Anchor', 'Compass', 'Marlin', 'Squid', 'Gull', 'Barracuda', 'Lantern', 'Otter', 'Frigate'];

function pick(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)]!;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates the internal user on first sign-in, or returns the existing one.
   * DEC-025: the `bot:` subject namespace belongs to seeded AI users — a
   * sign-in can never materialize (or return) one, whatever the auth layer
   * claims.
   */
  async ensureUserBySubject(subject: string): Promise<{ userId: string; handle: string; created: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { authSubject: subject } });
    if (existing) {
      if (existing.isBot) throw new Error('bot subjects cannot sign in');
      return { userId: existing.id, handle: existing.handle, created: false };
    }
    if (subject.startsWith('bot:')) throw new Error('bot subjects cannot sign in');

    const user = await this.prisma.user.create({
      data: {
        authSubject: subject,
        handle: await this.allocateUniqueHandle(),
        profile: { create: { bountyRating: 1200 } }, // provisional display default (OQ-001)
      },
    });
    return { userId: user.id, handle: user.handle, created: true };
  }

  /** Sets (or changes) the public handle. Spec is silent on change frequency. */
  async setHandle(
    userId: string,
    handle: string,
  ): Promise<{ ok: true; handle: string } | { ok: false; code: 'INVALID_HANDLE' | 'HANDLE_TAKEN'; message: string }> {
    if (!HANDLE_PATTERN.test(handle)) {
      return { ok: false, code: 'INVALID_HANDLE', message: 'handle must be 3-16 characters: letters, digits, underscore or hyphen' };
    }
    const taken = await this.prisma.user.findFirst({
      where: { handle: { equals: handle, mode: 'insensitive' }, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) return { ok: false, code: 'HANDLE_TAKEN', message: 'that handle is already in use' };
    try {
      const updated = await this.prisma.user.update({ where: { id: userId }, data: { handle } });
      return { ok: true, handle: updated.handle };
    } catch (err) {
      // Case-insensitive race: the DB unique index is case-sensitive; fall back
      // to the P2002 handler for exact duplicates.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { ok: false, code: 'HANDLE_TAKEN', message: 'that handle is already in use' };
      }
      throw err;
    }
  }

  /** Private view for the authenticated player (GET /v1/me). */
  async getMe(userId: string): Promise<MeDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) return null;
    return {
      id: user.id,
      handle: user.handle,
      status: user.status,
      profile: {
        bountyRating: user.profile?.bountyRating ?? 1200,
        ratingVersion: user.profile?.ratingVersion ?? null,
        ratedGames: user.profile?.ratedGames ?? 0,
        ratedDeals: user.profile?.ratedDeals ?? 0,
        ratedNoDeals: user.profile?.ratedNoDeals ?? 0,
        agreementRate: user.profile?.agreementRate.toNumber() ?? 0,
        averageSurplusShare: user.profile?.avgSurplusShare.toNumber() ?? 0,
      },
    };
  }

  /** Public profile (GET /v1/profiles/:handle) — the exact 08_API_CONTRACTS shape. Bots are never served (DEC-025). */
  async getPublicProfileByHandle(handle: string): Promise<PublicProfileDto | null> {
    const user = await this.prisma.user.findFirst({
      where: { handle: { equals: handle, mode: 'insensitive' }, status: { not: 'DELETED' }, isBot: false },
      include: { profile: true },
    });
    if (!user) return null;
    return {
      handle: user.handle,
      bountyRating: user.profile?.bountyRating ?? 1200,
      ratedGames: user.profile?.ratedGames ?? 0,
      agreementRate: user.profile?.agreementRate.toNumber() ?? 0,
      averageSurplusShare: user.profile?.avgSurplusShare.toNumber() ?? 0,
    };
  }

  private async allocateUniqueHandle(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const base = pick(ADJECTIVES) + pick(NOUNS);
      const candidate = attempt === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
      const taken = await this.prisma.user.findFirst({
        where: { handle: { equals: candidate, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new Error('unable to allocate a unique default handle');
  }
}
