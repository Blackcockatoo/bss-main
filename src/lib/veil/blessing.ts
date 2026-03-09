/**
 * Blessing System - Pull Gifts
 *
 * Teacher forges signed unlock codes. Kids redeem voluntarily.
 * Default redemption is anonymous. Teacher only sees aggregate growth.
 */

import { recordBlessingRedemption, recordForgedBlessing } from "./mentor-pet";
import { getActiveKidBondMarks } from "./pairing";
import {
  serializeBlessingForSignature,
  verifyBlessingSignature,
} from "./signatures";
import type {
  Blessing,
  BlessingMetadata,
  BlessingRedemption,
  BlessingType,
  BlessingVerificationResult,
} from "./types";
import { asHubId } from "./types";
import { getVault, signData } from "./vault";

// ============================================================================
// Code Generation
// ============================================================================

function generateBlessingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);

  const code = Array.from(values, (v) => chars[v % chars.length]).join("");

  // Format as XXXX-XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ============================================================================
// Blessing Forge (Teacher Side)
// ============================================================================

/**
 * Forge a new blessing code
 */
export async function forgeBlessing(
  type: BlessingType,
  metadata: BlessingMetadata = {},
  passcode?: string,
): Promise<Blessing | null> {
  const vault = getVault();
  if (!vault) {
    console.warn("[Veil] Cannot forge blessing: no vault");
    return null;
  }

  const blessingId = generateBlessingCode();
  const forgedAt = Date.now();

  const blessing: Omit<Blessing, "signature"> = {
    blessingId,
    type,
    metadata,
    issuedBy: vault.publicKey,
    forgedAt,
  };

  // Create canonical payload for signing
  const payload = serializeBlessingForSignature(blessing);

  const signature = await signData(payload, passcode);

  const signedBlessing: Blessing = {
    ...blessing,
    signature,
  };

  // Record in mentor pet (for local reference, not tracking)
  recordForgedBlessing(blessingId, type);

  return signedBlessing;
}

/**
 * Get display name for blessing type
 */
export function getBlessingTypeName(type: BlessingType): string {
  switch (type) {
    case "sticker":
      return "Sticker";
    case "aura":
      return "Glow Aura";
    case "accessory":
      return "Accessory";
    default:
      return "Unknown";
  }
}

/**
 * Get default metadata for blessing type
 */
export function getDefaultBlessingMetadata(
  type: BlessingType,
): BlessingMetadata {
  switch (type) {
    case "sticker":
      return {
        name: "Mentor Sticker",
        rarity: "common",
        flavorText: "A gift from your mentor.",
      };
    case "aura":
      return {
        name: "Mentor Glow",
        rarity: "uncommon",
        flavorText: "A gentle glow of encouragement.",
      };
    case "accessory":
      return {
        name: "Mentor Token",
        rarity: "rare",
        flavorText: "A symbol of mentorship.",
      };
    default:
      return {};
  }
}

// ============================================================================
// Blessing Verification (Kid Side)
// ============================================================================

/**
 * Verify a blessing code
 */
export async function verifyBlessing(
  code: string,
  blessing?: Blessing,
): Promise<BlessingVerificationResult> {
  // If blessing object provided, verify it
  if (blessing) {
    return verifyBlessingObject(blessing);
  }

  // If just code provided, we can't verify without the full blessing
  return {
    valid: false,
    error: "Full blessing data required for verification",
  };
}

/**
 * Verify a blessing object against its signature
 */
export async function verifyBlessingObject(
  blessing: Blessing,
): Promise<BlessingVerificationResult> {
  const verification = await verifyBlessingSignature(blessing);
  if (!verification.valid) {
    return {
      valid: false,
      error: "Invalid blessing signature",
    };
  }

  return {
    valid: true,
    blessing,
  };
}

/**
 * Check if a blessing is from a bonded mentor
 */
export function isBlessingFromBondedMentor(blessing: Blessing): boolean {
  const bonds = getActiveKidBondMarks();
  return bonds.some((bond) => bond.mentorPubKey === blessing.issuedBy);
}

// ============================================================================
// Blessing Redemption (Kid Side)
// ============================================================================

const REDEEMED_BLESSINGS_KEY = "veil-redeemed-blessings";

function getRedeemedBlessings(): BlessingRedemption[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(REDEEMED_BLESSINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn("[Veil] Failed to load redeemed blessings");
  }

  return [];
}

function saveRedeemedBlessings(redemptions: BlessingRedemption[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(REDEEMED_BLESSINGS_KEY, JSON.stringify(redemptions));
  } catch (error) {
    console.warn("[Veil] Failed to save redeemed blessings:", error);
  }
}

/**
 * Check if a blessing has already been redeemed
 */
export function isBlessingRedeemed(blessingId: string): boolean {
  const normalizedId = normalizeCode(blessingId);
  const redeemed = getRedeemedBlessings();
  return redeemed.some((r) => normalizeCode(r.blessingId) === normalizedId);
}

/**
 * Redeem a blessing
 */
export async function redeemBlessing(blessing: Blessing): Promise<{
  success: boolean;
  redemption?: BlessingRedemption;
  error?: string;
}> {
  // Verify the blessing
  const verification = await verifyBlessingObject(blessing);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Check if already redeemed
  if (isBlessingRedeemed(blessing.blessingId)) {
    return { success: false, error: "This blessing has already been redeemed" };
  }

  // Check if from bonded mentor (optional - could allow any valid blessing)
  const bonds = getActiveKidBondMarks();
  const mentorBond = bonds.find(
    (bond) => bond.mentorPubKey === blessing.issuedBy,
  );

  // Record the redemption
  const redemption: BlessingRedemption = {
    blessingId: blessing.blessingId,
    mentorHubId: mentorBond
      ? asHubId(mentorBond.mentorHubId)
      : asHubId(`unbonded-${blessing.issuedBy.slice(0, 16)}`),
    redeemedAt: Date.now(),
    type: blessing.type,
  };

  const redeemed = getRedeemedBlessings();
  redeemed.push(redemption);
  saveRedeemedBlessings(redeemed);

  return { success: true, redemption };
}

/**
 * Get all redeemed blessings
 */
export function getAllRedeemedBlessings(): BlessingRedemption[] {
  return getRedeemedBlessings();
}

/**
 * Get redeemed blessings from a specific mentor
 */
export function getRedeemedBlessingsFromMentor(
  mentorHubId: string,
): BlessingRedemption[] {
  return getRedeemedBlessings().filter((r) => r.mentorHubId === mentorHubId);
}

/**
 * Get redemption count by type
 */
export function getRedemptionCountByType(): Record<BlessingType, number> {
  const redeemed = getRedeemedBlessings();
  const counts: Record<BlessingType, number> = {
    sticker: 0,
    aura: 0,
    accessory: 0,
  };

  for (const r of redeemed) {
    if (r.type in counts) {
      counts[r.type]++;
    }
  }

  return counts;
}

// ============================================================================
// Redemption Confirmation (Teacher Side)
// ============================================================================

/**
 * Process a redemption confirmation (teacher side)
 * Called when teacher receives signal that *a* blessing was redeemed
 */
export function processRedemptionConfirmation(blessingId?: string): void {
  recordBlessingRedemption(blessingId);
}

// ============================================================================
// Serialization for QR/Sharing
// ============================================================================

/**
 * Serialize a blessing for QR code or sharing
 */
export function serializeBlessing(blessing: Blessing): string {
  return JSON.stringify(blessing);
}

/**
 * Deserialize a blessing from QR data
 */
export function deserializeBlessing(data: string): Blessing | null {
  try {
    const parsed = JSON.parse(data);
    if (
      !parsed.blessingId ||
      !parsed.type ||
      !parsed.signature ||
      !parsed.issuedBy ||
      !parsed.forgedAt
    ) {
      return null;
    }
    return parsed as Blessing;
  } catch {
    return null;
  }
}

/**
 * Create a compact blessing code for manual entry
 * (Just the code, without full blessing data)
 */
export function getBlessingCodeForDisplay(blessing: Blessing): string {
  return blessing.blessingId;
}

// ============================================================================
// Clear Data (Testing)
// ============================================================================

/**
 * Clear all redeemed blessings (for testing/reset)
 */
export function clearRedeemedBlessings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REDEEMED_BLESSINGS_KEY);
}
