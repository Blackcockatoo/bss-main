/**
 * Care Capsule - Wellbeing Signal
 *
 * Weekly signed summary of pet wellbeing. Shared only if kid consents.
 * Band-level only (never raw values). No timestamps, no logs, no sequences.
 */

import type { CareCapsule, CareCapsuleSubmissionEvent, WellbeingBand } from './types';
import { getISOWeek } from './helpers';
import { getKidPublicKey, signAsKid } from './kid-keys';
import { KID_SIGNATURE_SCHEME, serializeCareCapsuleForSignature } from './signatures';

// ============================================================================
// Band Calculation
// ============================================================================

/**
 * Calculate streak band from number of days with care
 * 0 = 0-1 days, 1 = 2-4 days, 2 = 5-7 days
 */
export function calculateStreakBand(daysWithCare: number): 0 | 1 | 2 {
  if (daysWithCare <= 1) return 0;
  if (daysWithCare <= 4) return 1;
  return 2;
}

/**
 * Calculate stability band from average vitals stability
 * 0 = unstable, 1 = moderate, 2 = stable
 */
export function calculateStabilityBand(stabilityScore: number): 0 | 1 | 2 {
  // stabilityScore is 0-100 (higher = more stable)
  if (stabilityScore < 33) return 0;
  if (stabilityScore < 66) return 1;
  return 2;
}

/**
 * Calculate variety band from number of interaction types used
 * 0 = 1 type, 1 = 2 types, 2 = 3+ types
 */
export function calculateVarietyBand(interactionTypes: number): 0 | 1 | 2 {
  if (interactionTypes <= 1) return 0;
  if (interactionTypes === 2) return 1;
  return 2;
}

/**
 * Calculate overall wellbeing band from care capsule
 */
export function calculateOverallWellbeing(capsule: CareCapsule): WellbeingBand {
  const total = capsule.streakBand + capsule.stabilityBand + capsule.varietyBand;
  // Total ranges from 0-6
  if (total <= 2) return 0; // Low
  if (total <= 4) return 1; // Medium
  return 2; // High
}

// ============================================================================
// Care Capsule Generation (Kid Side)
// ============================================================================

export interface WeeklyStats {
  /** Days this week where the pet was cared for (0-7) */
  daysWithCare: number;
  /** Stability score 0-100 (how consistent were vitals) */
  stabilityScore: number;
  /** Number of different interaction types used (feed, clean, play, etc.) */
  interactionTypesUsed: number;
}

/**
 * Generate a care capsule from weekly stats
 * Note: In production, this would use the kid's device key for signing
 */
export async function generateCareCapsule(
  petCrestHash: string,
  stats: WeeklyStats,
  signFn?: (data: string) => Promise<string>
): Promise<CareCapsule> {
  const kidPubKey = await getKidPublicKey();

  const capsule: Omit<CareCapsule, 'signature'> = {
    petCrestHash,
    weekOf: getISOWeek(),
    streakBand: calculateStreakBand(stats.daysWithCare),
    stabilityBand: calculateStabilityBand(stats.stabilityScore),
    varietyBand: calculateVarietyBand(stats.interactionTypesUsed),
    kidPubKey,
    signatureScheme: KID_SIGNATURE_SCHEME,
    verificationStatus: 'verifiable',
  };

  const payload = serializeCareCapsuleForSignature(capsule);

  const signature = signFn
    ? await signFn(payload)
    : (await signAsKid(payload)).signature;

  return {
    ...capsule,
    signature,
  };
}

/**
 * Generate a care capsule from pet vitals data
 */
export async function generateCareCapsuleFromVitals(
  petCrestHash: string,
  vitalsHistory: Array<{
    date: Date;
    avgHunger: number;
    avgHygiene: number;
    avgMood: number;
    avgEnergy: number;
    interactionTypes: string[];
  }>,
  signFn?: (data: string) => Promise<string>
): Promise<CareCapsule> {
  // Calculate days with care (any day with interactions)
  const daysWithCare = vitalsHistory.filter(
    day => day.interactionTypes.length > 0
  ).length;

  // Calculate stability from vitals variance
  const calculateVariance = (values: number[]): number => {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const allVitals = vitalsHistory.flatMap(day => [
    day.avgHunger,
    day.avgHygiene,
    day.avgMood,
    day.avgEnergy,
  ]);

  const variance = calculateVariance(allVitals);
  // Convert variance to stability score (lower variance = higher stability)
  // Variance of 0-10 = high stability, 10-25 = medium, 25+ = low
  const stabilityScore = Math.max(0, Math.min(100, 100 - variance * 4));

  // Calculate unique interaction types across the week
  const allInteractionTypes = new Set(
    vitalsHistory.flatMap(day => day.interactionTypes)
  );

  const stats: WeeklyStats = {
    daysWithCare,
    stabilityScore,
    interactionTypesUsed: allInteractionTypes.size,
  };

  return generateCareCapsule(petCrestHash, stats, signFn);
}

// ============================================================================
// Care Capsule Storage (Kid Side - for sharing)
// ============================================================================

const CARE_CAPSULES_KEY = 'veil-care-capsules';

function getStoredCapsules(): CareCapsule[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CARE_CAPSULES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CareCapsule[];
      const migrated = parsed.map(capsule => {
        if (capsule.kidPubKey && capsule.signatureScheme === KID_SIGNATURE_SCHEME) {
          return {
            ...capsule,
            verificationStatus: 'verifiable' as const,
          };
        }

        return {
          ...capsule,
          verificationStatus: 'legacy-unverifiable' as const,
        };
      });

      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        saveCapsules(migrated);
      }

      return migrated;
    }
  } catch {
    console.warn('[Veil] Failed to load care capsules');
  }

  return [];
}

function saveCapsules(capsules: CareCapsule[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only last 4 weeks
    const recent = capsules.slice(-4);
    localStorage.setItem(CARE_CAPSULES_KEY, JSON.stringify(recent));
  } catch (error) {
    console.warn('[Veil] Failed to save care capsules:', error);
  }
}

/**
 * Shared write-path contract from Care Capsule producer to Constellation consumer.
 */
export function createCareCapsuleSubmissionEvent(capsule: CareCapsule): CareCapsuleSubmissionEvent {
  return {
    type: 'veil-care-capsule-submission',
    submittedAt: Date.now(),
    capsule,
  };
}

/**
 * Persist capsule and emit submission event for downstream consumers.
 */
export function submitCareCapsule(capsule: CareCapsule): CareCapsuleSubmissionEvent {
  storeCareCapsule(capsule);
  return createCareCapsuleSubmissionEvent(capsule);
}

/**
 * Store a care capsule for sharing
 */
export function storeCareCapsule(capsule: CareCapsule): void {
  const capsules = getStoredCapsules();

  // Replace if same week exists
  const existingIndex = capsules.findIndex(c => c.weekOf === capsule.weekOf);
  if (existingIndex >= 0) {
    capsules[existingIndex] = capsule;
  } else {
    capsules.push(capsule);
  }

  saveCapsules(capsules);
}

/**
 * Get the most recent care capsule
 */
export function getLatestCareCapsule(): CareCapsule | null {
  const capsules = getStoredCapsules();
  if (capsules.length === 0) return null;
  return capsules[capsules.length - 1];
}

/**
 * Get care capsule for a specific week
 */
export function getCareCapsuleForWeek(weekOf: string): CareCapsule | null {
  const capsules = getStoredCapsules();
  return capsules.find(c => c.weekOf === weekOf) || null;
}

/**
 * Get all stored care capsules
 */
export function getAllCareCapsules(): CareCapsule[] {
  return getStoredCapsules();
}

// ============================================================================
// Serialization for Sharing
// ============================================================================

/**
 * Serialize a care capsule for sharing
 */
export function serializeCareCapsule(capsule: CareCapsule): string {
  return JSON.stringify(capsule);
}

/**
 * Deserialize a care capsule
 */
export function deserializeCareCapsule(data: string): CareCapsule | null {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.petCrestHash || !parsed.weekOf || parsed.streakBand === undefined ||
        parsed.stabilityBand === undefined || parsed.varietyBand === undefined || !parsed.signature) {
      return null;
    }

    if (parsed.kidPubKey && parsed.signatureScheme === KID_SIGNATURE_SCHEME) {
      parsed.verificationStatus = 'verifiable';
    } else {
      parsed.verificationStatus = 'legacy-unverifiable';
    }

    return parsed as CareCapsule;
  } catch {
    return null;
  }
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get human-readable description for a band
 */
export function getBandDescription(band: 0 | 1 | 2, type: 'streak' | 'stability' | 'variety'): string {
  const descriptions = {
    streak: ['Minimal Care', 'Regular Care', 'Consistent Care'],
    stability: ['Fluctuating', 'Moderate', 'Stable'],
    variety: ['Limited', 'Moderate', 'Diverse'],
  };

  return descriptions[type][band];
}

/**
 * Get wellbeing summary for display
 */
export function getWellbeingSummary(capsule: CareCapsule): string {
  const overall = calculateOverallWellbeing(capsule);
  const summaries = [
    'Needs attention',
    'Doing okay',
    'Thriving',
  ];
  return summaries[overall];
}

/**
 * Get color for wellbeing band (for UI)
 */
export function getWellbeingColor(band: WellbeingBand): string {
  const colors = ['#ef4444', '#f59e0b', '#22c55e']; // red, amber, green
  return colors[band];
}

// ============================================================================
// Clear Data (Testing)
// ============================================================================

/**
 * Clear all care capsules (for testing/reset)
 */
export function clearCareCapsules(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CARE_CAPSULES_KEY);
}
