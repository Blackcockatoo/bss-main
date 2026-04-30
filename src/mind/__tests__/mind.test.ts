import { describe, expect, it } from 'vitest';

import { DEFAULT_MIND, isPalindrome, isPrime, sequenceAlignment, tickMind } from '../index';
import { DEFAULT_VITALS } from '../../vitals/index';
import type { Genome } from '../../genome/types';

const SAMPLE_GENOME: Genome = {
  red60: [1, 7, 11, 13, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59],
  blue60: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
  black60: [12, 24, 36, 48, 60],
};

function runN(genome: Genome | null, n: number) {
  let mind = DEFAULT_MIND;
  for (let i = 0; i < n; i++) {
    mind = tickMind(mind, DEFAULT_VITALS, genome, null, null);
  }
  return mind;
}

describe('number-theory helpers', () => {
  it('isPrime correctly classifies', () => {
    expect(isPrime(2)).toBe(true);
    expect(isPrime(7)).toBe(true);
    expect(isPrime(11)).toBe(true);
    expect(isPrime(60)).toBe(false);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(97)).toBe(true);
    expect(isPrime(100)).toBe(false);
    expect(isPrime(3599)).toBe(false); // 59 * 61
    expect(isPrime(3607)).toBe(true);
  });

  it('isPalindrome works in base 10', () => {
    expect(isPalindrome(11)).toBe(true);
    expect(isPalindrome(22)).toBe(true);
    expect(isPalindrome(121)).toBe(true);
    expect(isPalindrome(123)).toBe(false);
  });

  it('sequenceAlignment counts how many of three sequences hit a residue', () => {
    expect(sequenceAlignment(SAMPLE_GENOME, 7)).toBeCloseTo(2 / 3, 5); // red + blue
    expect(sequenceAlignment(SAMPLE_GENOME, 12)).toBeCloseTo(1 / 3, 5); // black only
    expect(sequenceAlignment(SAMPLE_GENOME, 0)).toBeCloseTo(1 / 3, 5); // 60 mod 60 === 0 in black60
    expect(sequenceAlignment(null, 7)).toBe(0);
  });
});

describe('tickMind', () => {
  it('increments tickCount and records prime/palindrome ticks', () => {
    const m = runN(SAMPLE_GENOME, 13);
    expect(m.tickCount).toBe(13);
    expect(m.lastPrimeTick).toBe(13);
    expect(m.lastPalindromeTick).toBe(11);
  });

  it('keeps every stat in [0, 100] over a 600-tick run with random genome', () => {
    let mind = DEFAULT_MIND;
    const genome: Genome = {
      red60: Array.from({ length: 20 }, () => Math.floor(Math.random() * 60)),
      blue60: Array.from({ length: 20 }, () => Math.floor(Math.random() * 60)),
      black60: Array.from({ length: 20 }, () => Math.floor(Math.random() * 60)),
    };
    for (let i = 0; i < 600; i++) {
      mind = tickMind(mind, DEFAULT_VITALS, genome, null, null);
      for (const stat of [
        mind.intelligence,
        mind.mentalHealth,
        mind.characterCoherence,
        mind.focus,
        mind.resilience,
        mind.empathy,
        mind.creativity,
      ]) {
        expect(stat).toBeGreaterThanOrEqual(0);
        expect(stat).toBeLessThanOrEqual(100);
      }
    }
  });

  it('intelligence rises faster on a prime-rich genome than a void-heavy one', () => {
    const primeRich: Genome = {
      red60: [2, 3, 5, 7, 11, 13],
      blue60: [17, 19, 23, 29, 31, 37],
      black60: [41, 43, 47, 53, 59, 7],
    };
    const voidish: Genome = {
      red60: [0, 0, 0],
      blue60: [0, 0, 0],
      black60: [0, 0, 0],
    };
    const a = runN(primeRich, 200);
    const b = runN(voidish, 200);
    expect(a.intelligence).toBeGreaterThan(b.intelligence);
  });

  it('characterCoherence climbs when genome covers many residues', () => {
    const dense: Genome = {
      red60: Array.from({ length: 60 }, (_, i) => i),
      blue60: Array.from({ length: 60 }, (_, i) => i),
      black60: Array.from({ length: 60 }, (_, i) => i),
    };
    const sparse: Genome = { red60: [1], blue60: [2], black60: [3] };
    const a = runN(dense, 200);
    const b = runN(sparse, 200);
    expect(a.characterCoherence).toBeGreaterThan(b.characterCoherence);
  });
});
