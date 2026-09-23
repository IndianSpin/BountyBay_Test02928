/**
 * Game Review timeline tests (IN-2, DEC-028, docs/20 "Timeline"):
 * sequence-ordered negotiation steps derived from the persisted event
 * stream, with no message content anywhere.
 */

import { describe, expect, it } from 'vitest';
import { buildTimeline } from '../src';
import { BUYER_ID, play, readyBoth, SELLER_ID, START_NOW } from './helpers';

describe('review timeline (IN-2)', () => {
  it('lists offers, messages and the terminal action in sequence order', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'MESSAGE', playerId: SELLER_ID, messageId: 'msg-1', body: 'meet me at 800', now: START_NOW + 1500 });
      const sellerStanding = api.offer(2);
      commit({ kind: 'OFFER', playerId: SELLER_ID, offerId: sellerStanding, amountTenths: 800, now: START_NOW + 2000 });
      commit({ kind: 'ACCEPT', playerId: BUYER_ID, offerId: sellerStanding, now: START_NOW + 3000 });
    });

    const timeline = buildTimeline(match.state, match.events);
    expect(timeline.map((e) => e.kind)).toEqual(['OFFER', 'MESSAGE', 'OFFER', 'ACCEPT']);
    expect(timeline[0]).toMatchObject({ actorPlayerId: BUYER_ID, role: 'BUYER', amountTenths: 500, isOpening: true });
    expect(timeline[1]).toMatchObject({ actorPlayerId: SELLER_ID, role: 'SELLER' });
    expect(timeline[2]).toMatchObject({ actorPlayerId: SELLER_ID, amountTenths: 800 });
    expect(timeline[3]).toMatchObject({ actorPlayerId: BUYER_ID });

    // strictly ascending sequence numbers
    const seqs = timeline.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);

    // message content never reaches the timeline
    expect(JSON.stringify(timeline)).not.toContain('meet me at 800');
  });

  it('records TIMEOUT against the timed-out player, not a system actor', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'TIMEOUT', playerId: SELLER_ID, now: START_NOW + 91_000 });
    });

    const timeline = buildTimeline(match.state, match.events);
    const last = timeline[timeline.length - 1]!;
    expect(last.kind).toBe('TIMEOUT');
    expect(last.actorPlayerId).toBe(SELLER_ID);
    expect(last.role).toBe('SELLER');
  });

  it('skips plumbing events (started/ready/pause/disconnect)', () => {
    const match = play((commit, api) => {
      readyBoth(commit);
      commit({ kind: 'OFFER', playerId: BUYER_ID, offerId: api.offer(1), amountTenths: 500, now: START_NOW + 1000 });
      commit({ kind: 'WALK_AWAY', playerId: SELLER_ID, now: START_NOW + 2000 });
    });

    const negotiationOnly = match.events.filter(
      (e) => !['MATCH_STARTED', 'PLAYER_READY', 'MATCH_COMPLETED'].includes(e.type),
    );
    const timeline = buildTimeline(match.state, negotiationOnly);
    expect(timeline.map((e) => e.kind)).toEqual(['OFFER', 'WALK_AWAY']);

    // an event stream without negotiation steps yields an empty timeline
    const plumbingOnly = match.events.filter((e) =>
      ['MATCH_STARTED', 'PLAYER_READY', 'MATCH_COMPLETED'].includes(e.type),
    );
    expect(buildTimeline(match.state, plumbingOnly)).toEqual([]);
    expect(buildTimeline(match.state, [])).toEqual([]);
  });
});
