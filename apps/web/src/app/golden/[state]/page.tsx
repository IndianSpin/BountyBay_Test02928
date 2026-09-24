import { notFound } from 'next/navigation';
import GoldenFrame from '../../../components/golden/golden-frame';
import { STATE_VIEWS } from '../../../components/golden/golden-states';
import { goldenState } from '../../../components/golden/journey-data';

/**
 * GOLDEN STATE PAGE (BB-256 point 1): one page per journey state —
 * reference data, real art, timeline-driven animation. DEV ONLY.
 */
export default async function GoldenStatePage({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state: key } = await params;
  const state = goldenState(key);
  const View = state ? STATE_VIEWS[key] : undefined;
  if (!state || !View) notFound();
  return (
    <GoldenFrame state={state}>
      <View state={state} />
    </GoldenFrame>
  );
}
