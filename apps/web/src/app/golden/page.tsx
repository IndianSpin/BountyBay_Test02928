import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JOURNEY_A, JOURNEY_B } from '../../components/golden/journey-data';

/**
 * GOLDEN STATE GALLERY (BB-256 point 3): every journey state, rendered
 * straight from the reference data. DEV ONLY — in production builds
 * this route is absent (the reference is not shipped).
 */
export default function GoldenGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="gb" data-golden="golden-frame">
      <header className="gb__head">
        <span className="gb__tag">GOLDEN REFERENCE</span>
        <h1 className="gb__title" data-golden="golden-title">
          The Golden Journey
        </h1>
        <p className="gb__line">one page per journey state · 1440×900 + 390×844 · BOB vs KESTREL on THE RUBY COMPASS</p>
      </header>
      <section className="gb__stage">
        <p className="gb-k">JOURNEY A — HUMAN PVP</p>
        <div className="gb-ps">
          {JOURNEY_A.map((s) => (
            <Link key={s.key} className="gb-card gb-ps__card" href={`/golden/${s.key}`}>
              <span className="gb__ord">{s.order}</span>
              <span className="gb-h">{s.name}</span>
              <span className="gb-ps__epithet">{s.line}</span>
            </Link>
          ))}
        </div>
        <p className="gb-k">JOURNEY B — AI PRACTICE</p>
        <div className="gb-ps">
          {JOURNEY_B.map((s) => (
            <Link key={s.key} className="gb-card gb-ps__card" href={`/golden/${s.key}`}>
              <span className="gb__ord">{s.order}</span>
              <span className="gb-h">{s.name}</span>
              <span className="gb-ps__epithet">{s.line}</span>
            </Link>
          ))}
        </div>
        <p className="gb-honest">
          Dev-only: the gallery and every state page render from the same journey data the GATE verifies against.
        </p>
      </section>
    </main>
  );
}
