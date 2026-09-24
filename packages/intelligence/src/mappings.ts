/**
 * Observation → concept mappings (IN-5, DEC-028, docs/18 §6 — "moat
 * layer"). Explicit structured mappings FIRST: every observation type
 * maps to ontology concepts with relevance weights and conditions, so
 * retrieval has a complete deterministic substrate. RAG supplements the
 * structure later — it never replaces it, and a missing mapping for a
 * known observation type is a validation error, not a fallback.
 *
 * Pure data + lookup; versioned; concept references use the IN-4
 * ontology tag vocabulary only.
 */

import { ALL_ONTOLOGY_TAGS, isOntologyTag } from './ontology';
import type { ObservationType } from './types';

export const MAPPINGS_VERSION = 'observation-concept-mappings-0.1.0';

export interface ConceptMapping {
  /** Ontology tag (§4 vocabulary). */
  concept: string;
  /** Relative importance for the observation, in (0, 1]. */
  relevanceWeight: number;
  /** When this mapping is expected to apply (deterministic conditions). */
  conditions: string;
}

export interface ObservationMapping {
  type: ObservationType;
  concepts: ConceptMapping[];
  version: string;
}

/** A mapping row with concept + weight + conditions. */
function row(concept: string, relevanceWeight: number, conditions: string): ConceptMapping {
  return { concept, relevanceWeight, conditions };
}

/**
 * Full coverage of the 26 deterministic observation types (docs/20
 * "Implemented in IN-1"). Weights are provisional editorial judgments
 * — configurable data, versioned with the mapping set.
 */
export const OBSERVATION_CONCEPT_MAPPINGS: readonly ObservationMapping[] = [
  {
    type: 'STRONG_OPENING_POSITION',
    version: MAPPINGS_VERSION,
    concepts: [
      row('FIRST_OFFERS', 0.9, 'applies when the opening sits at or beyond the opponent\'s limit'),
      row('ANCHORING', 0.8, 'the opening claims a reference point near the opponent\'s limit'),
      row('ASPIRATION_TARGET', 0.6, 'the opening reflects ambition toward the favorable end of the range'),
    ],
  },
  {
    type: 'CONSERVATIVE_OPENING',
    version: MAPPINGS_VERSION,
    concepts: [
      row('RESERVATION_VALUE', 0.9, 'the opening sits beside the player\'s own limit'),
      row('AMBITION', 0.6, 'a cautious opening may signal modest aspiration'),
    ],
  },
  {
    type: 'LARGE_OPENING',
    version: MAPPINGS_VERSION,
    concepts: [
      row('FIRST_OFFERS', 0.8, 'the opening move itself is unusually large'),
      row('ANCHORING', 0.7, 'a distant opening anchors the range far from the player\'s limit'),
      row('AMBITION', 0.5, 'large openings express aggressive aspiration'),
    ],
  },
  {
    type: 'UNRECIPROCATED_CONCESSION',
    version: MAPPINGS_VERSION,
    concepts: [
      row('RECIPROCITY', 0.9, 'a concession with no reciprocal movement from the other side'),
      row('SIGNALING', 0.7, 'unilateral movement signals flexibility the other side may exploit'),
      row('TIMING', 0.4, 'the concession arrived while the opponent held position'),
    ],
  },
  {
    type: 'CONSECUTIVE_UNILATERAL_CONCESSIONS',
    version: MAPPINGS_VERSION,
    concepts: [
      row('RECIPROCITY', 0.9, 'a run of concessions without reciprocal movement'),
      row('SIGNALING', 0.8, 'repeated unilateral movement signals a pattern'),
      row('PATTERN', 0.6, 'the run itself is a concession pattern'),
    ],
  },
  {
    type: 'LARGEST_CONCESSION',
    version: MAPPINGS_VERSION,
    concepts: [
      row('SIZE', 0.9, 'the largest single concession size'),
      row('SIGNALING', 0.6, 'a large concession is a strong signal of flexibility'),
    ],
  },
  {
    type: 'LATE_LARGE_CONCESSION',
    version: MAPPINGS_VERSION,
    concepts: [
      row('TIMING', 0.9, 'a large concession late in the match'),
      row('SIGNALING', 0.7, 'late large movement signals urgency'),
      row('IMPASSE', 0.4, 'late concessions often follow a stall'),
    ],
  },
  {
    type: 'DECLINING_CONCESSIONS',
    version: MAPPINGS_VERSION,
    concepts: [
      row('PATTERN', 0.9, 'concession sizes strictly decline'),
      row('SIGNALING', 0.7, 'shrinking concessions signal approaching limits'),
    ],
  },
  {
    type: 'INCREASING_CONCESSIONS',
    version: MAPPINGS_VERSION,
    concepts: [
      row('PATTERN', 0.9, 'concession sizes strictly increase'),
      row('SIGNALING', 0.7, 'growing concessions signal increasing flexibility'),
    ],
  },
  {
    type: 'FAST_CONCESSION_AFTER_RESISTANCE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('TIMING', 0.8, 'a concession within seconds of resistance'),
      row('RECIPROCITY', 0.7, 'quick retreat under a held position'),
      row('CREDIBILITY', 0.5, 'fast retreats can weaken a position\'s credibility'),
    ],
  },
  {
    type: 'LONG_HOLD',
    version: MAPPINGS_VERSION,
    concepts: [
      row('SILENCE', 0.9, 'a long decision interval without action'),
      row('TIMING', 0.7, 'the hold consumes the clock deliberately or not'),
      row('IMPASSE', 0.5, 'long holds can mark a stall'),
    ],
  },
  {
    type: 'TIME_PRESSURE_EXPOSURE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('TIME_PRESSURE', 0.9, 'a share of decision time ran inside the low-time window'),
      row('DEADLINES', 0.7, 'the hard decision budget loomed'),
      row('IMPASSE', 0.5, 'pressure exposure rises during stalls'),
    ],
  },
  {
    type: 'HIGH_CHIP_SPEND',
    version: MAPPINGS_VERSION,
    concepts: [
      row('VALUE_CAPTURE', 0.7, 'chips bought concessions; capture depends on the settlement'),
      row('SIGNALING', 0.6, 'spending signals commitment to specific moves'),
    ],
  },
  {
    type: 'LOW_CHIP_SPEND',
    version: MAPPINGS_VERSION,
    concepts: [
      row('VALUE_CAPTURE', 0.6, 'low spend kept the budget intact for the endgame'),
      row('SIGNALING', 0.5, 'low spend may reflect a conservative move plan'),
    ],
  },
  {
    type: 'EFFICIENT_CLOSE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('ACCEPTANCE', 0.8, 'the deal closed in few offers'),
      row('VALUE_CAPTURE', 0.7, 'efficiency preserved chips while capturing value'),
    ],
  },
  {
    type: 'DEAL_NEAR_OWN_LIMIT',
    version: MAPPINGS_VERSION,
    concepts: [
      row('RESERVATION_VALUE', 0.9, 'the settlement sat within a tenth of the player\'s own limit'),
      row('VALUE_CAPTURE', 0.7, 'captured value was thin relative to the mandate'),
    ],
  },
  {
    type: 'DEAL_NEAR_OPPONENT_LIMIT',
    version: MAPPINGS_VERSION,
    concepts: [
      row('VALUE_CAPTURE', 0.9, 'the settlement sat near the opponent\'s limit — the favorable end'),
      row('CREDIBILITY', 0.5, 'pushing to the opponent\'s limit tests their stated position'),
    ],
  },
  {
    type: 'STRONG_SURPLUS_CAPTURE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('VALUE_CAPTURE', 0.9, 'a large share of the surplus went to this player'),
      row('VALUE_CREATION', 0.4, 'capture happens within the created range'),
    ],
  },
  {
    type: 'LOW_SURPLUS_CAPTURE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('VALUE_CAPTURE', 0.9, 'a small share of the surplus went to this player'),
      row('AMBITION', 0.5, 'thin capture may reflect modest targets'),
    ],
  },
  {
    type: 'MISSED_STANDING_OFFER',
    version: MAPPINGS_VERSION,
    concepts: [
      row('WALK_AWAY_DECISIONS', 0.9, 'the match ended while an acceptable standing offer remained'),
      row('FAILED_ZOPA', 0.7, 'an agreement within the range was passed up'),
      row('IMPASSE', 0.6, 'the decision to end came while a path to agreement existed'),
    ],
  },
  {
    type: 'FAILED_POSITIVE_ZOPA',
    version: MAPPINGS_VERSION,
    concepts: [
      row('FAILED_ZOPA', 0.9, 'a positive range existed and no deal was reached'),
      row('IMPASSE', 0.8, 'the parties could not close an available range'),
      row('WALK_AWAY_DECISIONS', 0.7, 'the match ended without agreement despite room to agree'),
    ],
  },
  {
    type: 'DEADLOCK',
    version: MAPPINGS_VERSION,
    concepts: [
      row('IMPASSE', 0.9, 'the final gap was small relative to the range, yet no deal'),
      row('WALK_AWAY_DECISIONS', 0.6, 'ending the match was the resolution of the stall'),
      row('ESCALATION', 0.5, 'deadlocks can harden positions'),
    ],
  },
  {
    type: 'TIMEOUT',
    version: MAPPINGS_VERSION,
    concepts: [
      row('TIME_PRESSURE', 0.9, 'the decision budget expired'),
      row('DEADLINES', 0.8, 'the hard limit, not a player choice, ended the match'),
      row('WALK_AWAY_DECISIONS', 0.5, 'the outcome contrasts with a deliberate walk-away'),
    ],
  },
  {
    type: 'FAST_CLOSE',
    version: MAPPINGS_VERSION,
    concepts: [
      row('ACCEPTANCE', 0.8, 'agreement followed crossing within seconds'),
      row('VALUE_CAPTURE', 0.6, 'the quick close locked in the standing terms'),
      row('TIMING', 0.5, 'the endgame ran fast'),
    ],
  },
  {
    type: 'SILENT_NEGOTIATION',
    version: MAPPINGS_VERSION,
    concepts: [
      row('SILENCE', 0.9, 'a match of offers with no messages at all'),
      row('INFORMATION_DISCLOSURE', 0.5, 'no chat meant no voluntary disclosure'),
    ],
  },
  {
    type: 'OFFER_WITH_PITCH',
    version: MAPPINGS_VERSION,
    concepts: [
      row('FRAMING', 0.8, 'a message immediately preceded the offer'),
      row('CREDIBILITY', 0.6, 'pitched offers attach a stated justification to the number'),
    ],
  },
];

export interface MappingValidationError {
  type: ObservationType;
  message: string;
}

export function validateMappings(mappings: readonly ObservationMapping[]): MappingValidationError[] {
  const errors: MappingValidationError[] = [];
  const seenTypes = new Set<ObservationType>();

  for (const mapping of mappings) {
    if (seenTypes.has(mapping.type)) {
      errors.push({ type: mapping.type, message: `duplicate mapping for observation type ${mapping.type}` });
      continue;
    }
    seenTypes.add(mapping.type);

    const seenConcepts = new Set<string>();
    for (const entry of mapping.concepts) {
      if (!isOntologyTag(entry.concept)) {
        errors.push({ type: mapping.type, message: `unknown ontology concept "${entry.concept}"` });
      }
      if (!(entry.relevanceWeight > 0 && entry.relevanceWeight <= 1)) {
        errors.push({ type: mapping.type, message: `relevance weight must be in (0, 1] for concept ${entry.concept} (got ${entry.relevanceWeight})` });
      }
      if (!entry.conditions || entry.conditions.trim() === '') {
        errors.push({ type: mapping.type, message: `missing conditions for concept ${entry.concept}` });
      }
      if (seenConcepts.has(entry.concept)) {
        errors.push({ type: mapping.type, message: `duplicate concept ${entry.concept}` });
      }
      seenConcepts.add(entry.concept);
    }
    if (mapping.concepts.length === 0) {
      errors.push({ type: mapping.type, message: 'at least one concept mapping is required' });
    }
    if (mapping.version !== MAPPINGS_VERSION) {
      errors.push({ type: mapping.type, message: `version must be ${MAPPINGS_VERSION} (got ${mapping.version})` });
    }
  }
  return errors;
}

export interface MappingStore {
  version: string;
  byType: ReadonlyMap<ObservationType, ConceptMapping[]>;
}

/**
 * Builds the deterministic mapping store. Full coverage of the
 * observation vocabulary is enforced here: a known type without a
 * mapping is an error, never a silent miss (§6 — structure first).
 */
export function createMappingStore(
  mappings: readonly ObservationMapping[],
  allObservationTypes: readonly ObservationType[],
): MappingStore {
  const errors = validateMappings(mappings);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.type}: ${e.message}`).join('; ');
    throw new Error(`invalid observation-concept mappings: ${detail}`);
  }
  const byType = new Map<ObservationType, ConceptMapping[]>();
  for (const mapping of mappings) {
    // Deterministic ordering: relevance weight desc, then concept asc.
    const concepts = [...mapping.concepts].sort((a, b) => (b.relevanceWeight !== a.relevanceWeight ? b.relevanceWeight - a.relevanceWeight : a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0));
    byType.set(mapping.type, concepts);
  }
  for (const type of allObservationTypes) {
    if (!byType.has(type)) {
      throw new Error(`invalid observation-concept mappings: missing mapping for observation type ${type}`);
    }
  }
  return { version: MAPPINGS_VERSION, byType };
}

/** Deterministic lookup: concepts for one observation type, weight-ordered. */
export function mappingsFor(store: MappingStore, type: ObservationType): ConceptMapping[] {
  return store.byType.get(type) ?? [];
}

/** Every observation type referenced by the store's mappings. */
export function coveredTypes(store: MappingStore): ObservationType[] {
  return [...store.byType.keys()];
}

/** Concept vocabulary actually referenced by the mappings (moat audit). */
export function referencedConcepts(store: MappingStore): Set<string> {
  const concepts = new Set<string>();
  for (const entries of store.byType.values()) {
    for (const entry of entries) concepts.add(entry.concept);
  }
  return concepts;
}

/** For audits: concepts never referenced by any mapping. */
export function unreferencedConcepts(store: MappingStore): string[] {
  const referenced = referencedConcepts(store);
  return ALL_ONTOLOGY_TAGS.filter((tag) => !referenced.has(tag));
}
