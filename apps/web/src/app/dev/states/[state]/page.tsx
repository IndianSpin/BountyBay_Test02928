import { notFound } from 'next/navigation';
import { castCharacter } from '../../../../components/game/character-registry';
import GoldenResultScene, { type ResultSceneData } from '../../../../components/game/golden-result';
import '../../../../components/game/golden-result.css';
import { loadReferenceFixture } from '../fixture';
import DevStub from '../dev-stub';

/**
 * DEV-ONLY GOLDEN STATE GALLERY ROUTE (BB-265 G-1): /dev/states/[state]
 * renders the REAL components from design-sandbox/golden/fixture/
 * reference-match.json — no match, no network. The golden-check CLI
 * measures these routes against contracts/*.json at both viewports.
 * 404 in production builds.
 *
 * The checker appends ?fixture=reference&t=end (and t=0&speed=6 for
 * the timeline run) — golden-runtime.ts reads those parameters.
 */
export default async function DevStatePage({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await params;

  if (state === 'result') {
    const fixture = await loadReferenceFixture();
    const f = fixture.result;
    const data: ResultSceneData = {
      deal: true,
      character: castCharacter(fixture.opponent.character),
      opponentHandle: fixture.opponent.handle,
      scenarioTitle: fixture.asset.name,
      settlementTenths: f.settlement,
      myLimitTenths: fixture.me.reservationValue,
      theirLimitTenths: fixture.opponent.reservationValue,
      myShare: f.share.me / 100,
      theirShare: f.share.opponent / 100,
      myMultiplier: f.clockMultiplier.me / 100,
      theirMultiplier: f.clockMultiplier.opponent / 100,
      chipsSpent: f.chipsSpent.me,
      gross: f.bounty.gross,
      net: f.bounty.net,
      ratingFrom: f.rating.from,
      ratingTo: f.rating.to,
      rated: true,
      ai: false,
      completionReason: null,
      incoming: { line: f.rematch.line, windowSec: f.rematch.windowSec },
      rematch: null,
      links: { review: `/review/${fixture.asset.name}`, replay: `/replay/reference`, backToBay: '/bay' },
    };
    return <GoldenResultScene data={data} />;
  }

  if (state === 'live-match' || state === 'bay') {
    return <DevStub state={state} />;
  }

  notFound();
}
