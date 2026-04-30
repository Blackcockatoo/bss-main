import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SOVEREIGNTY,
  acceptExternal,
  applyBondInteraction,
  registerExternalNudge,
  tickSovereignty,
} from '../sovereignty';
import { computeDnaSig } from '../ownerKey';
import type { Genome } from '../../genome/types';

const GENOME: Genome = {
  red60: [1, 2, 3],
  blue60: [4, 5, 6],
  black60: [7, 8, 9],
};
const OWNER = 'owner-key-abc';

describe('bond growth', () => {
  it('rises with diminishing returns and never exceeds 100', () => {
    let s = DEFAULT_SOVEREIGNTY;
    for (let i = 0; i < 1000; i++) s = applyBondInteraction(s);
    expect(s.bond).toBeLessThanOrEqual(100);
    expect(s.bond).toBeGreaterThan(50);
  });

  it('first interaction increases bond more than a later one (diminishing returns)', () => {
    const first = applyBondInteraction(DEFAULT_SOVEREIGNTY);
    let s = DEFAULT_SOVEREIGNTY;
    for (let i = 0; i < 50; i++) s = applyBondInteraction(s);
    const lateDelta = applyBondInteraction(s).bond - s.bond;
    expect(first.bond - DEFAULT_SOVEREIGNTY.bond).toBeGreaterThan(lateDelta);
  });
});

describe('DNA signature trust', () => {
  it('matching signature drifts trustInside up', () => {
    const sig = computeDnaSig(GENOME, OWNER);
    let s = { ...DEFAULT_SOVEREIGNTY, trustInside: 70 };
    for (let i = 0; i < 50; i++) s = tickSovereignty(s, GENOME, OWNER, sig, 50);
    expect(s.trustInside).toBeGreaterThan(70);
    expect(s.quarantine).toBe(false);
  });

  it('mismatched signature drops trust and engages quarantine', () => {
    const tampered: Genome = { ...GENOME, red60: [99, 98, 97] };
    const sig = computeDnaSig(GENOME, OWNER);
    const s = tickSovereignty(DEFAULT_SOVEREIGNTY, tampered, OWNER, sig, 50);
    expect(s.trustInside).toBeLessThan(DEFAULT_SOVEREIGNTY.trustInside);
    expect(s.quarantine).toBe(true);
  });
});

describe('acceptExternal gate', () => {
  it('drops unknown sources entirely', () => {
    const out = acceptExternal({ mood: 10 }, 'unknown', DEFAULT_SOVEREIGNTY);
    expect(out).toEqual({});
  });

  it('drops everything during quarantine', () => {
    const s = { ...DEFAULT_SOVEREIGNTY, quarantine: true };
    expect(acceptExternal({ mood: 10 }, 'owner', s)).toEqual({});
  });

  it('drops everything when trustInside is below threshold', () => {
    const s = { ...DEFAULT_SOVEREIGNTY, trustInside: 30 };
    expect(acceptExternal({ mood: 10 }, 'owner', s)).toEqual({});
  });

  it('dampens deltas proportionally to will', () => {
    const lowWill = { ...DEFAULT_SOVEREIGNTY, will: 10 };
    const highWill = { ...DEFAULT_SOVEREIGNTY, will: 90 };
    const lowOut = acceptExternal({ mood: 10 }, 'owner', lowWill);
    const highOut = acceptExternal({ mood: 10 }, 'owner', highWill);
    expect(lowOut.mood ?? 0).toBeGreaterThan(highOut.mood ?? 0);
    expect(highOut.mood ?? 0).toBeGreaterThan(0);
  });

  it('registerExternalNudge decays over ticks', () => {
    let s = registerExternalNudge(DEFAULT_SOVEREIGNTY, 5);
    expect(s.recentExternalNudges).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) s = tickSovereignty(s, null, null, null, 50);
    expect(s.recentExternalNudges).toBe(0);
  });
});
