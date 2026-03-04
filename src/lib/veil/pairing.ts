/**
 * Pairing Protocol - Two-Step QR Handshake
 *
 * Step 1: Teacher displays QR with signed invite
 * Step 2: Kid scans, consents, returns signed response
 *
 * Expiry: 15 minutes. Revocable. No names.
 */

import type {
  PairingInvite,
  PairingResponse,
  ConsentFlag,
  BondedCrest,
} from './types';
import { PAIRING_EXPIRY_MS } from './types';
import { getVault, signData } from './vault';
import { getKidPublicKey, signAsKid } from './kid-keys';
import { KID_SIGNATURE_SCHEME } from './signatures';
import {
  serializePairingInviteForSignature,
  serializePairingResponseForSignature,
  verifyPairingInviteSignature,
  verifyPairingResponseSignature,
} from './signatures';
import { addBondedCrest, touchCrest } from './mentor-pet';
import { getISOWeek } from './helpers';

// ============================================================================
// Teacher Side: Create Pairing Invite
// ============================================================================

/**
 * Create a signed pairing invite for QR display
 */
export async function createPairingInvite(passcode?: string): Promise<PairingInvite | null> {
  const vault = getVault();
  if (!vault) {
    console.warn('[Veil] Cannot create invite: no vault');
    return null;
  }

  const invite: Omit<PairingInvite, 'signature'> = {
    type: 'veil-pair-invite',
    hubId: vault.hubId,
    teacherPubKey: vault.publicKey,
    expiresAt: Date.now() + PAIRING_EXPIRY_MS,
  };

  const payload = serializePairingInviteForSignature(invite);

  const signature = await signData(payload, passcode);

  return {
    ...invite,
    signature,
  };
}

/**
 * Serialize invite for QR code
 */
export function serializeInvite(invite: PairingInvite): string {
  return JSON.stringify(invite);
}

/**
 * Deserialize invite from QR data
 */
export function deserializeInvite(data: string): PairingInvite | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type !== 'veil-pair-invite') {
      return null;
    }
    return parsed as PairingInvite;
  } catch {
    return null;
  }
}

// ============================================================================
// Kid Side: Verify Invite and Create Response
// ============================================================================

/**
 * Verify a pairing invite from a teacher
 */
export async function verifyPairingInvite(invite: PairingInvite): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check expiry
  if (Date.now() > invite.expiresAt) {
    return { valid: false, error: 'Invite has expired' };
  }

  const verification = await verifyPairingInviteSignature(invite);
  if (!verification.valid) {
    return { valid: false, error: verification.error ?? 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Create a pairing response (kid side)
 */
export async function createPairingResponse(
  petCrestHash: string,
  consentFlags: ConsentFlag[],
  alias?: string,
  signFn?: (data: string) => Promise<string>
): Promise<PairingResponse> {
  const kidPubKey = await getKidPublicKey();

  const response: Omit<PairingResponse, 'signature'> = {
    type: 'veil-pair-response',
    petCrestHash,
    consentFlags,
    expiresAt: Date.now() + PAIRING_EXPIRY_MS,
    kidPubKey,
    signatureScheme: KID_SIGNATURE_SCHEME,
  };

  if (alias) {
    response.alias = alias;
  }

  const payload = serializePairingResponseForSignature(response);

  const signature = signFn
    ? await signFn(payload)
    : (await signAsKid(payload)).signature;

  return {
    ...response,
    signature,
  };
}

/**
 * Serialize response for QR code
 */
export function serializeResponse(response: PairingResponse): string {
  return JSON.stringify(response);
}

/**
 * Deserialize response from QR data
 */
export function deserializeResponse(data: string): PairingResponse | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type !== 'veil-pair-response' || !parsed.signature) {
      return null;
    }

    if (!parsed.kidPubKey || parsed.signatureScheme !== KID_SIGNATURE_SCHEME) {
      parsed.signatureScheme = undefined;
    }

    return parsed as PairingResponse;
  } catch {
    return null;
  }
}

// ============================================================================
// Teacher Side: Process Response and Complete Pairing
// ============================================================================

/**
 * Process a pairing response and add to constellation
 */
export async function processPairingResponse(
  response: PairingResponse
): Promise<{ success: boolean; error?: string }> {
  // Check expiry
  if (Date.now() > response.expiresAt) {
    return { success: false, error: 'Response has expired' };
  }

  const verification = await verifyPairingResponseSignature(response);
  if (!verification.valid) {
    return { success: false, error: verification.error ?? 'Invalid response signature' };
  }


  // Add to constellation
  const crest: Omit<BondedCrest, 'lastSeenBand'> = {
    petCrestHash: response.petCrestHash,
    alias: response.alias,
    bondedAt: getISOWeek(),
    consentFlags: response.consentFlags,
    lastSyncAt: Date.now(),
  };

  const added = addBondedCrest(crest);
  if (!added) {
    return { success: false, error: 'Mentor pet not initialized' };
  }

  return { success: true };
}

// ============================================================================
// Kid Side: Bond Management
// ============================================================================

export interface KidBondMark {
  mentorHubId: string;
  mentorPubKey: string;
  bondedAt: string;
  consentFlags: ConsentFlag[];
  isActive: boolean;
}

const BOND_MARKS_KEY = 'veil-bond-marks';

function getBondMarks(): KidBondMark[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(BOND_MARKS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('[Veil] Failed to load bond marks');
  }

  return [];
}

function saveBondMarks(marks: KidBondMark[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(BOND_MARKS_KEY, JSON.stringify(marks));
  } catch (error) {
    console.warn('[Veil] Failed to save bond marks:', error);
  }
}

/**
 * Add a bond mark (kid side)
 */
export function addBondMark(invite: PairingInvite, consentFlags: ConsentFlag[]): void {
  const marks = getBondMarks();

  // Check if already bonded
  const existing = marks.find(m => m.mentorHubId === invite.hubId);
  if (existing) {
    // Update existing
    existing.consentFlags = consentFlags;
    existing.isActive = true;
  } else {
    // New bond
    marks.push({
      mentorHubId: invite.hubId,
      mentorPubKey: invite.teacherPubKey,
      bondedAt: getISOWeek(),
      consentFlags,
      isActive: true,
    });
  }

  saveBondMarks(marks);
}

/**
 * Get all bond marks (kid side)
 */
export function getKidBondMarks(): KidBondMark[] {
  return getBondMarks();
}

/**
 * Get active bond marks (kid side)
 */
export function getActiveKidBondMarks(): KidBondMark[] {
  return getBondMarks().filter(m => m.isActive);
}

/**
 * Check if kid is bonded to a specific mentor
 */
export function isBondedToMentor(mentorHubId: string): boolean {
  const marks = getBondMarks();
  return marks.some(m => m.mentorHubId === mentorHubId && m.isActive);
}

/**
 * Get bond mark for a specific mentor
 */
export function getBondMark(mentorHubId: string): KidBondMark | null {
  const marks = getBondMarks();
  return marks.find(m => m.mentorHubId === mentorHubId) || null;
}

/**
 * Release a bond (kid side - unpair)
 */
export function releaseBond(mentorHubId: string): boolean {
  const marks = getBondMarks();
  const mark = marks.find(m => m.mentorHubId === mentorHubId);

  if (!mark) return false;

  mark.isActive = false;
  saveBondMarks(marks);

  return true;
}

/**
 * Update consent flags for a bond
 */
export function updateBondConsent(mentorHubId: string, consentFlags: ConsentFlag[]): boolean {
  const marks = getBondMarks();
  const mark = marks.find(m => m.mentorHubId === mentorHubId);

  if (!mark) return false;

  mark.consentFlags = consentFlags;
  saveBondMarks(marks);

  return true;
}

/**
 * Clear all bond marks (for testing/reset)
 */
export function clearBondMarks(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BOND_MARKS_KEY);
}

// ============================================================================
// Refresh/Sync (future)
// ============================================================================

/**
 * Create a refresh signal (kid sends periodically to keep bond active)
 */
export async function createRefreshSignal(
  petCrestHash: string,
  mentorHubId: string
): Promise<{ petCrestHash: string; mentorHubId: string; timestamp: number }> {
  return {
    petCrestHash,
    mentorHubId,
    timestamp: Date.now(),
  };
}

/**
 * Process a refresh signal (teacher side)
 */
export function processRefreshSignal(
  signal: { petCrestHash: string; mentorHubId: string; timestamp: number }
): void {
  touchCrest(signal.petCrestHash);
}
