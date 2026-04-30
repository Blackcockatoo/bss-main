import type { Genome } from '../genome/types';
import { clamp } from '../vitals/index';
import { computeDnaSig } from './ownerKey';

export interface Sovereignty {
  will: number;
  bond: number;
  trustInside: number;
  quarantine: boolean;
  recentExternalNudges: number;
  lastBondTickAt: number;
}

export const DEFAULT_SOVEREIGNTY: Sovereignty = {
  will: 50,
  bond: 10,
  trustInside: 100,
  quarantine: false,
  recentExternalNudges: 0,
  lastBondTickAt: 0,
};

export type ExternalSource = 'owner' | 'system' | 'unknown';

const TRUST_QUARANTINE_THRESHOLD = 50;
const BOND_DECAY_INACTIVITY_MS = 24 * 60 * 60 * 1000;

export function tickSovereignty(
  s: Sovereignty,
  genome: Genome | null,
  ownerKey: string | null,
  expectedDnaSig: string | null,
  characterCoherence: number,
): Sovereignty {
  let trustInside = s.trustInside;
  let quarantine = s.quarantine;

  if (genome && ownerKey && expectedDnaSig) {
    const liveSig = computeDnaSig(genome, ownerKey);
    if (liveSig === expectedDnaSig) {
      trustInside = clamp(trustInside + 0.2);
      if (trustInside >= 80) quarantine = false;
    } else {
      trustInside = clamp(trustInside - 25);
      quarantine = true;
    }
  }

  // Bond decay only after long inactivity
  let bond = s.bond;
  const now = Date.now();
  if (s.lastBondTickAt > 0 && now - s.lastBondTickAt > BOND_DECAY_INACTIVITY_MS) {
    bond = clamp(bond - 0.05);
  }

  // Will: derived from coherence + bond, blunted by recent external nudges
  const will = clamp(
    50 + 0.4 * characterCoherence + 0.3 * bond - 0.5 * s.recentExternalNudges,
  );

  // Recent-nudges decay each tick
  const recentExternalNudges = Math.max(0, s.recentExternalNudges - 0.1);

  return {
    will,
    bond,
    trustInside,
    quarantine,
    recentExternalNudges,
    lastBondTickAt: s.lastBondTickAt,
  };
}

export function applyBondInteraction(s: Sovereignty): Sovereignty {
  const delta = 0.5 * (1 - s.bond / 100);
  return {
    ...s,
    bond: clamp(s.bond + delta),
    lastBondTickAt: Date.now(),
  };
}

export interface ScalarDelta {
  [key: string]: number;
}

/**
 * Single chokepoint for any state mutation that originates outside the
 * pet's own tick loop. Drops unknown sources, freezes during quarantine,
 * and dampens by sovereign will.
 */
export function acceptExternal<T extends ScalarDelta>(
  delta: T,
  source: ExternalSource,
  s: Sovereignty,
): T {
  if (source === 'unknown') return {} as T;
  if (s.quarantine) return {} as T;
  if (s.trustInside < TRUST_QUARANTINE_THRESHOLD) return {} as T;

  const damp = 1 - s.will / 120;
  const out: ScalarDelta = {};
  for (const [k, v] of Object.entries(delta)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v * damp;
    }
  }
  return out as T;
}

export function registerExternalNudge(s: Sovereignty, magnitude = 1): Sovereignty {
  return {
    ...s,
    recentExternalNudges: clamp(s.recentExternalNudges + magnitude, 0, 100),
  };
}
