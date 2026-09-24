'use client';

/**
 * The hub bar (SH-Nav): three places outside a match and they never
 * change — THE BAY, PLAY, ME. Desktop: top bar with the ME chip on the
 * right. Mobile: bottom tab bar. Inside the match tunnel there is NO
 * hub navigation — the match screens simply do not render this bar.
 */

import Link from 'next/link';

export default function HubBar({ active, me }: { active: 'bay' | 'play' | 'me'; me: { handle?: string; games?: number } }) {
  const tabs: { key: 'bay' | 'play' | 'me'; label: string; href: string }[] = [
    { key: 'bay', label: 'THE BAY', href: '/bay' },
    { key: 'play', label: 'PLAY', href: '/play' },
    { key: 'me', label: 'ME', href: '/profile' },
  ];
  return (
    <nav className="hub" aria-label="Bounty Bay hubs" data-testid="hub-bar">
      <span className="hub__mark">BOUNTY BAY</span>
      <span className="hub__tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`hub__tab ${active === tab.key ? 'hub__tab--active' : ''}`}
            data-testid={`hub-${tab.key}`}
          >
            {tab.label}
          </Link>
        ))}
      </span>
      <span className="hub__me" data-testid="hub-me-chip">
        <span className="hub__handle">{me.handle ?? '…'}</span>
        {me.games !== undefined && me.games > 0 && <span className="hub__stat">{me.games} games</span>}
        {/* the rating division is a P1-M2 slot — labelled, never functional */}
        <span className="hub__division" title="The rating division opens with the ranked milestone">
          UNRATED
        </span>
      </span>
    </nav>
  );
}
