/**
 * The Veil - Teacher Meta-Pet Hub
 *
 * "Teachers work behind The Veil. They enchant, they bless, they whisper. They never watch."
 *
 * A privacy-respecting connection system between teachers and student pets.
 * Enables encouragement and symbolic gifting without surveillance.
 *
 * Core Principles:
 * - Privacy is the product
 * - Pet = identity (no real names)
 * - Consent is sacred (opt-in, revocable)
 * - Pull-only model (kids redeem voluntarily)
 * - Local-first (no central server)
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Teacher Vault
  TeacherVault,
  TeacherVaultStore,
  VaultBackupMetadata,
  VaultBackupPayload,
  // Pairing
  PairingInvite,
  PairingResponse,
  ConsentFlag,
  // Constellation
  BondedCrest,
  LastSeenBand,
  WellbeingBand,
  // Blessings
  Blessing,
  BlessingType,
  BlessingMetadata,
  BlessingRedemption,
  BlessingVerificationResult,
  // Care Capsule
  CareCapsule,
  CareCapsuleIndicators,
  CareCapsuleSyncState,
  CareCapsuleSubmissionEvent,
  // Mentor Pet
  MentorPet,
  MentorTraits,
  MentorGrowth,
  MentorTier,
  ForgedBlessingRecord,
} from "./types";

export {
  VEIL_STORAGE_KEYS,
  PAIRING_EXPIRY_MS,
  BOND_DORMANT_THRESHOLD_MS,
  MENTOR_TIER_THRESHOLDS,
  MENTOR_XP_REWARDS,
} from "./types";

// ============================================================================
// Shared Role State Contract
// ============================================================================

export type {
  VeilRole,
  ResolveVeilRoleInput,
  ResolveVeilRoleResult,
} from "./role-state";

export {
  VEIL_ROLE_STORAGE_KEY,
  VEIL_ROLE_QUERY_KEY,
  getVeilRoleFromSearch,
  getStoredVeilRole,
  setStoredVeilRole,
  migrateVeilRoleStorage,
  resolveVeilRole,
  getVeilRoleSwitchPath,
  getVeilRoleSwitchHref,
} from "./role-state";

// ============================================================================
// Vault Operations
// ============================================================================

export {
  hasVault,
  isVaultLocked,
  getVault,
  createVault,
  unlockVault,
  getPrivateKey,
  signData,
  verifySignature,
  importPublicKey,
  deleteVault,
  changePasscode,
  exportVaultInfo,
  exportVaultBackup,
  restoreVaultBackup,
} from "./vault";

export {
  createBackupBundle,
  createEncryptedBackupBlob,
  restoreFromBackupPayload,
  getLastBackupAt,
  getLastRecoveryDrillAt,
  markRecoveryDrillCompleted,
  persistEncryptedBackupToIndexedDB,
  loadEncryptedBackupFromIndexedDB,
} from "./vault-backup";

// ============================================================================
// Mentor Pet Operations
// ============================================================================

export {
  hasMentorPet,
  getMentorPet,
  initializeMentorPet,
  addBondedCrest,
  removeBondedCrest,
  touchCrest,
  refreshConstellationBands,
  recordForgedBlessing,
  recordBlessingRedemption,
  getConstellationStats,
  getGrowthInfo,
  getTierDescription,
  getDormantCrests,
  getActiveCrests,
  updateCrestWellbeing,
  applyCareCapsuleSubmission,
  getCrestCareCapsuleSyncState,
  clearMentorPet,
} from "./mentor-pet";

// ============================================================================
// Pairing Operations
// ============================================================================

export {
  // Teacher side
  createPairingInvite,
  serializeInvite,
  deserializeInvite,
  processPairingResponse,
  processRefreshSignal,
  // Kid side
  verifyPairingInvite,
  createPairingResponse,
  serializeResponse,
  deserializeResponse,
  addBondMark,
  getKidBondMarks,
  getActiveKidBondMarks,
  isBondedToMentor,
  getBondMark,
  releaseBond,
  updateBondConsent,
  clearBondMarks,
  createRefreshSignal,
} from "./pairing";

export type { KidBondMark } from "./pairing";

// ============================================================================
// Blessing Operations
// ============================================================================

export {
  // Teacher side
  forgeBlessing,
  getBlessingTypeName,
  getDefaultBlessingMetadata,
  processRedemptionConfirmation,
  // Kid side
  verifyBlessing,
  verifyBlessingObject,
  isBlessingFromBondedMentor,
  isBlessingRedeemed,
  redeemBlessing,
  getAllRedeemedBlessings,
  getRedeemedBlessingsFromMentor,
  getRedemptionCountByType,
  // Serialization
  serializeBlessing,
  deserializeBlessing,
  getBlessingCodeForDisplay,
  clearRedeemedBlessings,
} from "./blessing";

// ============================================================================
// Care Capsule Operations
// ============================================================================

export {
  // Band calculation
  calculateStreakBand,
  calculateStabilityBand,
  calculateVarietyBand,
  calculateOverallWellbeing,
  // Generation
  generateCareCapsule,
  generateCareCapsuleFromVitals,
  // Storage
  storeCareCapsule,
  createCareCapsuleSubmissionEvent,
  submitCareCapsule,
  getLatestCareCapsule,
  getCareCapsuleForWeek,
  getAllCareCapsules,
  // Serialization
  serializeCareCapsule,
  deserializeCareCapsule,
  // Display
  getBandDescription,
  getWellbeingSummary,
  getWellbeingColor,
  clearCareCapsules,
} from "./care-capsule";

export type { WeeklyStats } from "./care-capsule";

// ============================================================================
// Shared Signature Utilities
// ============================================================================

export {
  KID_SIGNATURE_SCHEME,
  canonicalizeMessage,
  serializeBlessingForSignature,
  serializePairingInviteForSignature,
  serializePairingResponseForSignature,
  serializeCareCapsuleForSignature,
  verifyBlessingSignature,
  verifyPairingInviteSignature,
  verifyPairingResponseSignature,
  verifyCareCapsuleSignature,
} from "./signatures";

// ============================================================================
// Convenience: Full Initialization
// ============================================================================

/**
 * Initialize The Veil for a teacher
 * Creates vault if needed, initializes mentor pet
 */
export async function initializeVeil(passcode?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { hasVault, createVault } = await import("./vault");
  const { initializeMentorPet } = await import("./mentor-pet");

  try {
    // Create vault if needed
    if (!hasVault()) {
      await createVault(passcode);
    }

    // Initialize mentor pet
    const pet = initializeMentorPet();
    if (!pet) {
      return { success: false, error: "Failed to initialize mentor pet" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clear all Veil data (for testing/reset)
 */
export async function clearAllVeilData(): Promise<void> {
  const { deleteVault } = await import("./vault");
  const { clearMentorPet } = await import("./mentor-pet");
  const { clearBondMarks } = await import("./pairing");
  const { clearRedeemedBlessings } = await import("./blessing");
  const { clearCareCapsules } = await import("./care-capsule");

  deleteVault();
  clearMentorPet();
  clearBondMarks();
  clearRedeemedBlessings();
  clearCareCapsules();
}
