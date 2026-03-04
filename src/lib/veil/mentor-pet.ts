/**
 * Mentor Pet - The Teacher's Familiar
 *
 * A guardian creature that evolves from mentorship, not monitoring.
 * Appearance derived from vault seed. Growth from aggregate actions.
 */

import type {
  MentorPet,
  MentorTraits,
  MentorGrowth,
  MentorTier,
  BondedCrest,
  ForgedBlessingRecord,
  BlessingType,
  LastSeenBand,
  CareCapsuleSubmissionEvent,
  CareCapsuleSyncState,
} from './types';
import {
  VEIL_STORAGE_KEYS,
  MENTOR_TIER_THRESHOLDS,
  MENTOR_XP_REWARDS,
  BOND_DORMANT_THRESHOLD_MS,
} from './types';
import { getVault } from './vault';
import { calculateOverallWellbeing } from './care-capsule';

const CAPSULE_STALE_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;

// ============================================================================
// Storage
// ============================================================================

function getMentorPetStore(): MentorPet | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(VEIL_STORAGE_KEYS.MENTOR_PET);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('[Veil] Failed to load mentor pet');
  }

  return null;
}

function saveMentorPet(pet: MentorPet): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(VEIL_STORAGE_KEYS.MENTOR_PET, JSON.stringify(pet));
  } catch (error) {
    console.warn('[Veil] Failed to save mentor pet:', error);
  }
}

// ============================================================================
// Trait Derivation
// ============================================================================

/**
 * Derive visual traits from the mentor pet seed (deterministic)
 */
function deriveTraitsFromSeed(seed: string): MentorTraits {
  // Use different parts of the seed hash for different traits
  const hexToNum = (hex: string, max: number): number => {
    const num = parseInt(hex, 16);
    return num % max;
  };

  return {
    primaryHue: hexToNum(seed.slice(0, 4), 360),
    secondaryHue: hexToNum(seed.slice(4, 8), 360),
    bodyShape: hexToNum(seed.slice(8, 10), 8),
    eyeStyle: hexToNum(seed.slice(10, 12), 8),
    patternType: hexToNum(seed.slice(12, 14), 8),
    specialFeature: hexToNum(seed.slice(14, 16), 8),
  };
}

/**
 * Generate a simple HeptaTag from the seed (42 base-7 digits)
 */
function generateHeptaTag(seed: string): string {
  const digits: number[] = [];

  for (let i = 0; i < 42; i++) {
    // Use rolling window of seed characters
    const hexPair = seed.slice((i * 2) % 64, ((i * 2) % 64) + 2) || seed.slice(0, 2);
    const num = parseInt(hexPair, 16);
    digits.push(num % 7);
  }

  return digits.join('');
}

// ============================================================================
// Tier Calculation
// ============================================================================

/**
 * Calculate tier from XP
 */
function calculateTier(xp: number): MentorTier {
  if (xp >= MENTOR_TIER_THRESHOLDS[4]) return 4;
  if (xp >= MENTOR_TIER_THRESHOLDS[3]) return 3;
  if (xp >= MENTOR_TIER_THRESHOLDS[2]) return 2;
  if (xp >= MENTOR_TIER_THRESHOLDS[1]) return 1;
  return 0;
}

/**
 * Calculate XP from stats
 */
function calculateXP(stats: MentorGrowth['stats']): number {
  return (
    stats.pairingsCount * MENTOR_XP_REWARDS.pairing +
    stats.blessingsForged * MENTOR_XP_REWARDS.blessingForged +
    stats.blessingsRedeemed * MENTOR_XP_REWARDS.blessingRedeemed
  );
}

// ============================================================================
// Last Seen Band Calculation
// ============================================================================

function calculateLastSeenBand(lastSyncAt: number): LastSeenBand {
  const now = Date.now();
  const diff = now - lastSyncAt;

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_WEEK = 7 * ONE_DAY;
  const ONE_MONTH = 30 * ONE_DAY;

  if (diff < ONE_DAY) return 'today';
  if (diff < ONE_WEEK) return 'thisWeek';
  if (diff < ONE_MONTH) return 'thisMonth';
  return 'dormant';
}

// ============================================================================
// Mentor Pet Operations
// ============================================================================

/**
 * Check if a mentor pet exists
 */
export function hasMentorPet(): boolean {
  return getMentorPetStore() !== null;
}

/**
 * Get the mentor pet
 */
export function getMentorPet(): MentorPet | null {
  return getMentorPetStore();
}

/**
 * Create or initialize the mentor pet from the vault
 */
export function initializeMentorPet(): MentorPet | null {
  const vault = getVault();

  if (!vault) {
    console.warn('[Veil] Cannot initialize mentor pet: no vault');
    return null;
  }

  // Check if already exists
  const existing = getMentorPetStore();
  if (existing) {
    return existing;
  }

  // Create new mentor pet
  const traits = deriveTraitsFromSeed(vault.mentorPetSeed);
  const heptaTag = generateHeptaTag(vault.mentorPetSeed);

  const pet: MentorPet = {
    crestHash: vault.mentorPetSeed.slice(0, 32),
    heptaTag,
    traits,
    growth: {
      xp: 0,
      tier: 0,
      stats: {
        pairingsCount: 0,
        blessingsForged: 0,
        blessingsRedeemed: 0,
      },
    },
    constellation: [],
    forgedBlessings: [],
  };

  saveMentorPet(pet);
  return pet;
}

/**
 * Add a bonded crest to the constellation
 */
export function addBondedCrest(crest: Omit<BondedCrest, 'lastSeenBand'>): boolean {
  const pet = getMentorPetStore();
  if (!pet) return false;

  // Check if already bonded
  const existingIndex = pet.constellation.findIndex(
    c => c.petCrestHash === crest.petCrestHash
  );

  const fullCrest: BondedCrest = {
    ...crest,
    lastSeenBand: 'today',
    lastSyncAt: Date.now(),
    careCapsuleSync: crest.careCapsuleSync ?? {
      status: 'pending',
      receivedAt: Date.now(),
    },
  };

  if (existingIndex >= 0) {
    // Update existing bond
    pet.constellation[existingIndex] = fullCrest;
  } else {
    // New bond
    pet.constellation.push(fullCrest);
    pet.growth.stats.pairingsCount++;
    pet.growth.xp = calculateXP(pet.growth.stats);
    pet.growth.tier = calculateTier(pet.growth.xp);
  }

  saveMentorPet(pet);
  return true;
}

/**
 * Remove a bonded crest (unpair)
 */
export function removeBondedCrest(petCrestHash: string): boolean {
  const pet = getMentorPetStore();
  if (!pet) return false;

  const index = pet.constellation.findIndex(c => c.petCrestHash === petCrestHash);
  if (index < 0) return false;

  pet.constellation.splice(index, 1);
  // Note: We don't decrement pairingsCount - XP earned stays earned
  saveMentorPet(pet);

  return true;
}

/**
 * Update a crest's last seen time
 */
export function touchCrest(petCrestHash: string): void {
  const pet = getMentorPetStore();
  if (!pet) return;

  const crest = pet.constellation.find(c => c.petCrestHash === petCrestHash);
  if (!crest) return;

  crest.lastSyncAt = Date.now();
  crest.lastSeenBand = 'today';

  saveMentorPet(pet);
}

/**
 * Update all crest last-seen bands (call periodically)
 */
export function refreshConstellationBands(): void {
  const pet = getMentorPetStore();
  if (!pet) return;

  const now = Date.now();
  let changed = false;
  for (const crest of pet.constellation) {
    const newBand = calculateLastSeenBand(crest.lastSyncAt);
    if (crest.lastSeenBand !== newBand) {
      crest.lastSeenBand = newBand;
      changed = true;
    }

    const capsuleSync = crest.careCapsuleSync;
    if (
      capsuleSync?.status === 'synced' &&
      capsuleSync.syncedAt &&
      now - capsuleSync.syncedAt > CAPSULE_STALE_THRESHOLD_MS
    ) {
      crest.careCapsuleSync = {
        ...capsuleSync,
        status: 'stale',
      };
      changed = true;
    }
  }

  if (changed) {
    saveMentorPet(pet);
  }
}

/**
 * Apply a shared care capsule submission event to a bonded crest.
 */
export function applyCareCapsuleSubmission(event: CareCapsuleSubmissionEvent): {
  applied: boolean;
  reason?: string;
} {
  const pet = getMentorPetStore();
  if (!pet) return { applied: false, reason: 'no-mentor-pet' };

  const crest = pet.constellation.find(c => c.petCrestHash === event.capsule.petCrestHash);
  if (!crest) return { applied: false, reason: 'crest-not-found' };

  const syncedAt = Date.now();
  const indicators = {
    streakBand: event.capsule.streakBand,
    stabilityBand: event.capsule.stabilityBand,
    varietyBand: event.capsule.varietyBand,
    overallBand: calculateOverallWellbeing(event.capsule),
  };

  if (!crest.consentFlags.includes('viewWellbeing')) {
    crest.careCapsuleSync = {
      status: 'error',
      weekOf: event.capsule.weekOf,
      receivedAt: event.submittedAt,
      syncedAt,
      error: 'missing-view-wellbeing-consent',
    };
    saveMentorPet(pet);
    return { applied: false, reason: 'missing-view-wellbeing-consent' };
  }

  crest.lastSyncAt = syncedAt;
  crest.lastSeenBand = calculateLastSeenBand(syncedAt);
  crest.wellbeingBand = indicators.overallBand;
  crest.careCapsuleSync = {
    status: 'synced',
    weekOf: event.capsule.weekOf,
    receivedAt: event.submittedAt,
    syncedAt,
    indicators,
  };

  saveMentorPet(pet);
  return { applied: true };
}

/**
 * Record a forged blessing
 */
export function recordForgedBlessing(
  blessingId: string,
  type: BlessingType
): void {
  const pet = getMentorPetStore();
  if (!pet) return;

  pet.forgedBlessings.push({
    blessingId,
    type,
    forgedAt: Date.now(),
  });

  pet.growth.stats.blessingsForged++;
  pet.growth.xp = calculateXP(pet.growth.stats);
  pet.growth.tier = calculateTier(pet.growth.xp);

  saveMentorPet(pet);
}

/**
 * Record a blessing redemption (aggregate signal only)
 * Called when teacher receives confirmation that *a* blessing was redeemed
 */
export function recordBlessingRedemption(blessingId?: string): void {
  const pet = getMentorPetStore();
  if (!pet) return;

  pet.growth.stats.blessingsRedeemed++;
  pet.growth.xp = calculateXP(pet.growth.stats);
  pet.growth.tier = calculateTier(pet.growth.xp);

  // Optionally mark specific blessing as redeemed
  if (blessingId) {
    const blessing = pet.forgedBlessings.find(b => b.blessingId === blessingId);
    if (blessing) {
      blessing.wasRedeemed = true;
    }
  }

  saveMentorPet(pet);
}

/**
 * Get constellation statistics
 */
export function getConstellationStats(): {
  total: number;
  active: number;
  dormant: number;
  capsuleSynced: number;
  capsuleStale: number;
  capsulePending: number;
} {
  const pet = getMentorPetStore();
  if (!pet) {
    return {
      total: 0,
      active: 0,
      dormant: 0,
      capsuleSynced: 0,
      capsuleStale: 0,
      capsulePending: 0,
    };
  }

  const dormant = pet.constellation.filter(c => c.lastSeenBand === 'dormant').length;
  const capsuleSynced = pet.constellation.filter(c => c.careCapsuleSync?.status === 'synced').length;
  const capsuleStale = pet.constellation.filter(c => c.careCapsuleSync?.status === 'stale').length;
  const capsulePending = pet.constellation.filter(c => !c.careCapsuleSync || c.careCapsuleSync.status === 'pending').length;

  return {
    total: pet.constellation.length,
    active: pet.constellation.length - dormant,
    dormant,
    capsuleSynced,
    capsuleStale,
    capsulePending,
  };
}

/**
 * Read latest capsule sync state for a crest.
 */
export function getCrestCareCapsuleSyncState(petCrestHash: string): CareCapsuleSyncState | null {
  const pet = getMentorPetStore();
  if (!pet) return null;

  const crest = pet.constellation.find(c => c.petCrestHash === petCrestHash);
  return crest?.careCapsuleSync ?? null;
}

/**
 * Get growth info for display
 */
export function getGrowthInfo(): {
  xp: number;
  tier: MentorTier;
  nextTierXP: number | null;
  progress: number; // 0-100
} | null {
  const pet = getMentorPetStore();
  if (!pet) return null;

  const currentTierXP = MENTOR_TIER_THRESHOLDS[pet.growth.tier];
  const nextTier = (pet.growth.tier + 1) as MentorTier;
  const nextTierXP = nextTier <= 4 ? MENTOR_TIER_THRESHOLDS[nextTier] : null;

  let progress = 100;
  if (nextTierXP !== null) {
    const range = nextTierXP - currentTierXP;
    const current = pet.growth.xp - currentTierXP;
    progress = Math.min(100, Math.floor((current / range) * 100));
  }

  return {
    xp: pet.growth.xp,
    tier: pet.growth.tier,
    nextTierXP,
    progress,
  };
}

/**
 * Get visual tier description
 */
export function getTierDescription(tier: MentorTier): string {
  switch (tier) {
    case 0:
      return 'Nascent Guardian';
    case 1:
      return 'Growing Familiar';
    case 2:
      return 'Shimmering Mentor';
    case 3:
      return 'Crowned Guide';
    case 4:
      return 'Master of the Forge';
    default:
      return 'Unknown';
  }
}

/**
 * Get crests that need attention (dormant)
 */
export function getDormantCrests(): BondedCrest[] {
  const pet = getMentorPetStore();
  if (!pet) return [];

  return pet.constellation.filter(c => c.lastSeenBand === 'dormant');
}

/**
 * Get active crests
 */
export function getActiveCrests(): BondedCrest[] {
  const pet = getMentorPetStore();
  if (!pet) return [];

  return pet.constellation.filter(c => c.lastSeenBand !== 'dormant');
}

/**
 * Update a crest's wellbeing band (manual teacher override)
 */
export function updateCrestWellbeing(petCrestHash: string, band: 0 | 1 | 2): boolean {
  const pet = getMentorPetStore();
  if (!pet) return false;

  const crest = pet.constellation.find(c => c.petCrestHash === petCrestHash);
  if (!crest) return false;

  crest.wellbeingBand = band;
  saveMentorPet(pet);
  return true;
}

/**
 * Clear all mentor pet data (for testing/reset)
 */
export function clearMentorPet(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VEIL_STORAGE_KEYS.MENTOR_PET);
}
