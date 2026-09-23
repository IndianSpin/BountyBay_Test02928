'use client';

/**
 * Private negotiation dossier (DD-M2, GR-028, docs/17 Phase 2).
 *
 * PROPS CONTRACT (stable for W2's BB-213 board wiring — do not rename):
 *   - `sharedContext: string | null`   — both roles see this.
 *   - `privateContext: string | null`  — the VIEWER'S OWN role context.
 *   - `facts: DossierFactView[]`       — the VIEWER'S OWN private facts.
 *   - `role: 'BUYER' | 'SELLER'`       — viewer role (labels only).
 * The server never sends the opponent's dossier (scenarioForRole); this
 * component renders whatever it is given and never fetches.
 *
 * Presentation only: category tags, a verifiable marker per fact
 * (reveals are DD-M3 — no action here), authored order preserved.
 */

import { dossierCategoryLabel, dossierFactsAsAuthored, type DossierFactView } from './dossier-model';
import styles from './dossier.module.css';

export default function Dossier({
  sharedContext,
  privateContext,
  facts,
  role,
}: {
  sharedContext: string | null;
  privateContext: string | null;
  facts: DossierFactView[];
  role: 'BUYER' | 'SELLER';
}) {
  const authored = dossierFactsAsAuthored(facts);

  return (
    <section className={styles.dossier} data-testid="dossier" aria-label={`${role === 'BUYER' ? 'Buyer' : 'Seller'} private dossier`}>
      <header className={styles.header}>
        <span className={styles.kicker}>PRIVATE DOSSIER · {role === 'BUYER' ? 'BUYER' : 'SELLER'}</span>
        <span className="sr-only">Only you can see this.</span>
      </header>

      {sharedContext !== null && sharedContext !== '' && (
        <p className={styles.shared} data-testid="dossier-shared">{sharedContext}</p>
      )}

      {privateContext !== null && privateContext !== '' && (
        <p className={styles.context} data-testid="dossier-context">{privateContext}</p>
      )}

      {authored.length > 0 && (
        <ul className={styles.facts} data-testid="dossier-facts">
          {authored.map((fact) => (
            <li key={fact.id} className={styles.fact} data-testid="dossier-fact">
              <span className={styles.tag}>{dossierCategoryLabel(fact.category)}</span>
              <span className={styles.text}>{fact.text}</span>
              {fact.verifiable === true && (
                <span className={styles.verifiable} data-testid="dossier-verifiable" title={fact.optionalRevealLabel ?? 'Verifiable fact'}>
                  VERIFIABLE
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
