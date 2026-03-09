/**
 * The Veil - Teacher Meta-Pet Hub Types
 *
 * "Teachers work behind The Veil. They enchant, they bless, they whisper. They never watch."
 *
 * Core principles:
 * - Privacy is the product
 * - Pet = identity (no real names)
 * - Consent is sacred (opt-in, revocable)
 * - Pull-only model (kids redeem voluntarily)
 * - Local-first (no central server)
 */

// ============================================================================
// Branded Primitive Types
// ============================================================================

/** Opaque hub identifier derived from a teacher's public key. */
export type HubId = string & { readonly __brand: "HubId" };

/** Opaque bond identifier — unique per teacher/kid pair. */
export type BondId = string & { readonly __brand: "BondId" };

/** A validated, formatted blessing claim code (e.g. "ABCD-EFGH-12"). */
export type ClaimCode = string & { readonly __brand: "ClaimCode" };

/** Safe cast helpers — use only at validated boundaries (API layer, claim-code.ts). */
export function asHubId(raw: string): HubId {
  return raw as HubId;
}
export function asBondId(raw: string): BondId {
  return raw as BondId;
}
export function asClaimCode(raw: string): ClaimCode {
  return raw as ClaimCode;
}

// ============================================================================
// Role System
// ============================================================================

/** Who is currently operating the UI. */
export type VeilRole = "teacher" | "kid";

/**
 * Typed context object flowing through role-guarded surfaces.
 * Passed via React Context or derived from role-state helpers.
 */
export interface RoleContext {
  role: VeilRole;
  /** Teacher's hub identifier, present when role === 'teacher'. */
  hubId?: HubId;
  /** Hash of the kid's pet crest, present when role === 'kid'. */
  petCrestHash?: string;
}

// ============================================================================
// Validated Pairing Invite (discriminated union — post-verification)
// ============================================================================

/**
 * Result of verifying a raw PairingInvite payload.
 * Always check `valid` before accessing `invite`.
 */
export type ValidatedPairingInviteResult =
  | { valid: true; invite: PairingInvite }
  | { valid: false; reason: "expired" | "bad-signature" | "malformed" };

// ============================================================================
// Teacher Vault (Cryptographic Identity)
// ============================================================================

export interface TeacherVault {
  /** Exported public key (SPKI format, base64) */
  publicKey: string;
  /** Hub identifier derived from public key */
  hubId: HubId;
  /** Seed for mentor pet appearance (SHA-256 of public key) */
  mentorPetSeed: string;
  /** Creation timestamp */
  createdAt: number;
  /** Optional passcode protection (hashed) */
  passcodeHash?: string;
  /** Salt for passcode hashing */
  passcodeSalt?: string;
}

export interface TeacherVaultStore {
  vault: TeacherVault | null;
  /** Private key stored separately (PKCS8 format, base64, optionally encrypted) */
  privateKeyEncrypted: string | null;
  /** Whether private key is encrypted with passcode */
  isEncrypted: boolean;
}

export interface VaultBackupMetadata {
  version: "veil-vault-backup-v1";
  createdAt: number;
  keyId: string;
}

export interface VaultBackupPayload {
  metadata: VaultBackupMetadata;
  kdf: {
    salt: string;
    iterations: number;
    hash: "SHA-256";
  };
  encryption: {
    algorithm: "AES-GCM";
    iv: string;
    ciphertext: string;
  };
}

// ============================================================================
// Pairing Protocol
// ============================================================================

export interface PairingInvite {
  type: "veil-pair-invite";
  /** Teacher's hub identifier */
  hubId: HubId;
  /** Teacher's public key (for verification) */
  teacherPubKey: string;
  /** Expiration timestamp (15 minutes from creation) */
  expiresAt: number;
  /** ECDSA signature of above fields */
  signature: string;
}

export interface PairingResponse {
  type: "veil-pair-response";
  /** Hash of kid's pet crest (identity) */
  petCrestHash: string;
  /** Optional alias chosen by kid */
  alias?: string;
  /** What the teacher is allowed to do/see */
  consentFlags: ConsentFlag[];
  /** Expiration timestamp */
  expiresAt: number;
  /** Kid device public key (SPKI base64) */
  kidPubKey?: string;
  /** Signature format identifier */
  signatureScheme?: "ecdsa-p256-sha256-v1";
  /** Signature by kid's device key */
  signature: string;
}

export type ConsentFlag =
  | "viewWellbeing" // Teacher can see wellbeing bands
  | "receiveBlessings" // Kid can receive teacher blessings
  | "receiveKeys"; // Kid can receive evolution keys (future)

// ============================================================================
// Constellation (Bonded Crests)
// ============================================================================

export interface BondedCrest {
  /** Hash of kid's pet crest */
  petCrestHash: string;
  /** Optional alias (kid-chosen) */
  alias?: string;
  /** Week of bonding (ISO format: "2026-W06") */
  bondedAt: string;
  /** Coarse last-seen indicator */
  lastSeenBand: LastSeenBand;
  /** Coarse wellbeing indicator (if consent granted) */
  wellbeingBand?: WellbeingBand;
  /** Last care-capsule sync metadata */
  careCapsuleSync?: CareCapsuleSyncState;
  /** What this kid consented to */
  consentFlags: ConsentFlag[];
  /** When the bond was last refreshed/synced */
  lastSyncAt: number;
}

export type LastSeenBand = "today" | "thisWeek" | "thisMonth" | "dormant";
export type WellbeingBand = 0 | 1 | 2; // Low / Med / High

export interface CareCapsuleIndicators {
  streakBand: 0 | 1 | 2;
  stabilityBand: 0 | 1 | 2;
  varietyBand: 0 | 1 | 2;
  overallBand: WellbeingBand;
}

export interface CareCapsuleSyncState {
  status: "synced" | "stale" | "pending" | "error";
  weekOf?: string;
  syncedAt?: number;
  receivedAt?: number;
  error?: string;
  indicators?: CareCapsuleIndicators;
}

/**
 * Shared event contract used by Care Capsule producers and Constellation consumers.
 */
export interface CareCapsuleSubmissionEvent {
  type: "veil-care-capsule-submission";
  submittedAt: number;
  capsule: CareCapsule;
}

// ============================================================================
// Blessing System
// ============================================================================

export interface Blessing {
  /** 16-character alphanumeric code */
  blessingId: string;
  /** What type of cosmetic this unlocks */
  type: BlessingType;
  /** Additional metadata */
  metadata: BlessingMetadata;
  /** Teacher's public key (for verification) */
  issuedBy: string;
  /** When forged */
  forgedAt: number;
  /** ECDSA signature */
  signature: string;
}

export type BlessingType = "sticker" | "aura" | "accessory";

export interface BlessingMetadata {
  /** Display name for the blessing */
  name?: string;
  /** Rarity indicator */
  rarity?: "common" | "uncommon" | "rare" | "epic";
  /** Flavor text */
  flavorText?: string;
  /** Specific cosmetic ID to unlock (optional) */
  cosmeticId?: string;
}

export interface BlessingRedemption {
  /** The blessing code redeemed */
  blessingId: string;
  /** Which mentor this came from */
  mentorHubId: HubId;
  /** When redeemed */
  redeemedAt: number;
  /** What was unlocked */
  type: BlessingType;
}

export interface BlessingVerificationResult {
  valid: boolean;
  blessing?: Blessing;
  error?: string;
}

// ============================================================================
// Care Capsule (Wellbeing Signal)
// ============================================================================

export interface CareCapsule {
  /** Hash of pet crest */
  petCrestHash: string;
  /** ISO week: "2026-W06" */
  weekOf: string;
  /** Care streak band: 0-1 / 2-4 / 5-7 days */
  streakBand: 0 | 1 | 2;
  /** Stability band: Low / Med / High */
  stabilityBand: 0 | 1 | 2;
  /** Variety band: 1 / 2 / 3+ interaction types */
  varietyBand: 0 | 1 | 2;
  /** Kid device public key (SPKI base64) */
  kidPubKey?: string;
  /** Signature format identifier */
  signatureScheme?: "ecdsa-p256-sha256-v1";
  /** Verification status for migration/legacy handling */
  verificationStatus?: "verifiable" | "legacy-unverifiable";
  /** Signature by pet's device key */
  signature: string;
}

// ============================================================================
// Mentor Pet (Teacher's Familiar)
// ============================================================================

export interface MentorPet {
  /** Crest hash (derived from teacher public key) */
  crestHash: string;
  /** HeptaTag for display (42 base-7 digits) */
  heptaTag: string;
  /** Visual traits derived from seed */
  traits: MentorTraits;
  /** XP and tier progression */
  growth: MentorGrowth;
  /** All bonded crests */
  constellation: BondedCrest[];
  /** All forged blessings (for reference, not tracking) */
  forgedBlessings: ForgedBlessingRecord[];
}

export interface MentorTraits {
  /** Primary color hue (0-360) */
  primaryHue: number;
  /** Secondary color hue */
  secondaryHue: number;
  /** Body shape variant (0-7) */
  bodyShape: number;
  /** Eye style variant (0-7) */
  eyeStyle: number;
  /** Pattern type (0-7) */
  patternType: number;
  /** Special feature (0-7, unlocked by tier) */
  specialFeature: number;
}

export interface MentorGrowth {
  /** Total XP accumulated */
  xp: number;
  /** Current tier (0-4) */
  tier: MentorTier;
  /** Stats for XP calculation */
  stats: {
    pairingsCount: number;
    blessingsForged: number;
    blessingsRedeemed: number; // Aggregate, no "who"
  };
}

export type MentorTier = 0 | 1 | 2 | 3 | 4;

/** XP thresholds for each tier */
export const MENTOR_TIER_THRESHOLDS: Record<MentorTier, number> = {
  0: 0, // Base
  1: 50, // Tail grows
  2: 150, // Aura shimmer
  3: 350, // Crown appears
  4: 700, // Forge token unlocked
};

/** XP rewards for actions */
export const MENTOR_XP_REWARDS = {
  pairing: 10,
  blessingForged: 5,
  blessingRedeemed: 2,
};

export interface ForgedBlessingRecord {
  blessingId: string;
  type: BlessingType;
  forgedAt: number;
  /** Whether we know it was redeemed (aggregate signal only) */
  wasRedeemed?: boolean;
}

// ============================================================================
// Storage Keys
// ============================================================================

export const VEIL_STORAGE_KEYS = {
  TEACHER_VAULT: "veil-teacher-vault",
  PRIVATE_KEY: "veil-teacher-private-key",
  MENTOR_PET: "veil-mentor-pet",
  BOND_MARKS: "veil-bond-marks",
} as const;

// ============================================================================
// Pairing Expiry
// ============================================================================

export const PAIRING_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const BOND_DORMANT_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
