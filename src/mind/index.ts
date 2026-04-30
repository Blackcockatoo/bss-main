import type { Genome } from '../genome/types';
import { getResidueMeta } from '../genome/elementResidue';
import type { Vitals } from '../vitals/index';
import { clamp, getVitalsAverage } from '../vitals/index';
import type { Sovereignty } from './sovereignty';
import { DEFAULT_SOVEREIGNTY, tickSovereignty } from './sovereignty';

export interface MindStats {
  intelligence: number;
  mentalHealth: number;
  characterCoherence: number;

  focus: number;
  resilience: number;
  empathy: number;
  creativity: number;

  tickCount: number;
  lastPrimeTick: number;
  lastPalindromeTick: number;
  recentVoidStreak: number;
  palindromeWindow: number[];

  sovereignty: Sovereignty;
}

export const DEFAULT_MIND: MindStats = {
  intelligence: 50,
  mentalHealth: 60,
  characterCoherence: 50,
  focus: 30,
  resilience: 50,
  empathy: 50,
  creativity: 30,
  tickCount: 0,
  lastPrimeTick: 0,
  lastPalindromeTick: 0,
  recentVoidStreak: 0,
  palindromeWindow: [],
  sovereignty: DEFAULT_SOVEREIGNTY,
};

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 60) return SMALL_PRIMES.includes(n);
  for (const p of SMALL_PRIMES) {
    if (n === p) return true;
    if (n % p === 0) return false;
  }
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 61; i <= limit; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

export function isPalindrome(n: number): boolean {
  if (n < 0) return false;
  const s = String(n);
  for (let i = 0, j = s.length - 1; i < j; i++, j--) {
    if (s[i] !== s[j]) return false;
  }
  return true;
}

export type ResidueClass = 'frontier' | 'bridge' | 'void' | 'normal';

export function residueClass(n: number): ResidueClass {
  const r = ((n % 60) + 60) % 60;
  const meta = getResidueMeta(r);
  if (meta.isVoid) return 'void';
  if (meta.isFrontierResidue) return 'frontier';
  if (meta.hasPair60) return 'bridge';
  return 'normal';
}

export function sequenceAlignment(genome: Genome | null, tickMod60: number): number {
  if (!genome) return 0;
  const target = ((tickMod60 % 60) + 60) % 60;
  let hits = 0;
  if (genome.red60.some(v => ((v % 60) + 60) % 60 === target)) hits += 1;
  if (genome.blue60.some(v => ((v % 60) + 60) % 60 === target)) hits += 1;
  if (genome.black60.some(v => ((v % 60) + 60) % 60 === target)) hits += 1;
  return hits / 3;
}

const PALINDROME_WINDOW_SIZE = 60;

export function tickMind(
  mind: MindStats,
  vitals: Vitals,
  genome: Genome | null,
  ownerKey: string | null,
  expectedDnaSig: string | null,
): MindStats {
  const nextTick = mind.tickCount + 1;
  const tickMod60 = nextTick % 60;

  const prime = isPrime(nextTick);
  const palin = isPalindrome(nextTick);
  const cls = residueClass(nextTick);
  const align = sequenceAlignment(genome, tickMod60);

  // Intelligence
  let intelligence = mind.intelligence - 0.05;
  if (prime) intelligence += 0.4;
  if (palin) intelligence += 0.2;
  if (cls === 'void') intelligence -= 0.3;
  intelligence += align * 0.5;

  // Palindrome rolling window for creativity
  const palindromeWindow = [...mind.palindromeWindow, palin ? 1 : 0].slice(-PALINDROME_WINDOW_SIZE);
  const palinDensity = palindromeWindow.reduce((s, v) => s + v, 0) / PALINDROME_WINDOW_SIZE;
  const creativity = mind.creativity * 0.9 + palinDensity * 100 * 0.1;

  // Mental health: vitals coupling + bridge-60 sinusoid
  const vitalsAvg = getVitalsAverage(vitals);
  const bridgePhase = Math.sin((tickMod60 / 60) * Math.PI * 2 * 4); // 4 peaks per 60-cycle (12,24,36,48)
  let mentalHealth = mind.mentalHealth * 0.95 + vitalsAvg * 0.05 + bridgePhase * 0.5;
  if (vitals.isSick) mentalHealth -= 0.4;
  if (mind.recentVoidStreak >= 5) mentalHealth -= 0.6;

  // Focus: streak counter
  let focus = cls === 'void' ? 0 : mind.focus + 1;
  focus = clamp(focus, 0, 100);

  // Void streak
  const recentVoidStreak = cls === 'void' ? mind.recentVoidStreak + 1 : 0;

  // Resilience: EMA of (100 - sicknessSeverity), bonus during recovery
  const sicknessTerm = 100 - vitals.sicknessSeverity;
  let resilience = mind.resilience * 0.95 + sicknessTerm * 0.05;
  if (mind.resilience < sicknessTerm) resilience += 0.2; // recovering

  // Empathy: how close mood tracks vitalsAvg
  const empathy = clamp(100 - Math.abs(vitals.mood - vitalsAvg));

  // Character coherence: EMA of sequenceAlignment * 100
  const characterCoherence = mind.characterCoherence * 0.95 + align * 100 * 0.05;

  // Sovereignty layer
  const sovereignty = tickSovereignty(
    mind.sovereignty,
    genome,
    ownerKey,
    expectedDnaSig,
    characterCoherence,
  );

  return {
    intelligence: clamp(intelligence),
    mentalHealth: clamp(mentalHealth),
    characterCoherence: clamp(characterCoherence),
    focus,
    resilience: clamp(resilience),
    empathy,
    creativity: clamp(creativity),
    tickCount: nextTick,
    lastPrimeTick: prime ? nextTick : mind.lastPrimeTick,
    lastPalindromeTick: palin ? nextTick : mind.lastPalindromeTick,
    recentVoidStreak,
    palindromeWindow,
    sovereignty,
  };
}
