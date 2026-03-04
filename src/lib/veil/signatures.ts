import type { Blessing, CareCapsule, PairingInvite, PairingResponse } from './types';
import { verifySignature } from './vault';

export const KID_SIGNATURE_SCHEME = 'ecdsa-p256-sha256-v1' as const;

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value !== null && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortValue(nested)]);

    return Object.fromEntries(sortedEntries);
  }

  return value;
}

export function canonicalizeMessage(payload: Record<string, unknown>): string {
  return JSON.stringify(sortValue(payload));
}

export function serializeBlessingForSignature(blessing: Omit<Blessing, 'signature'>): string {
  return canonicalizeMessage({
    blessingId: blessing.blessingId,
    forgedAt: blessing.forgedAt,
    issuedBy: blessing.issuedBy,
    metadata: blessing.metadata,
    type: blessing.type,
  });
}

export function serializePairingInviteForSignature(invite: Omit<PairingInvite, 'signature'>): string {
  return canonicalizeMessage({
    expiresAt: invite.expiresAt,
    hubId: invite.hubId,
    teacherPubKey: invite.teacherPubKey,
    type: invite.type,
  });
}

export function serializePairingResponseForSignature(response: Omit<PairingResponse, 'signature'>): string {
  return canonicalizeMessage({
    alias: response.alias,
    consentFlags: response.consentFlags,
    expiresAt: response.expiresAt,
    kidPubKey: response.kidPubKey,
    petCrestHash: response.petCrestHash,
    signatureScheme: response.signatureScheme,
    type: response.type,
  });
}

export function serializeCareCapsuleForSignature(capsule: Omit<CareCapsule, 'signature'>): string {
  return canonicalizeMessage({
    kidPubKey: capsule.kidPubKey,
    petCrestHash: capsule.petCrestHash,
    signatureScheme: capsule.signatureScheme,
    stabilityBand: capsule.stabilityBand,
    streakBand: capsule.streakBand,
    varietyBand: capsule.varietyBand,
    weekOf: capsule.weekOf,
  });
}

async function isLegacyPlaceholderSignature(payload: string, signature: string): Promise<boolean> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const bytes = new Uint8Array(hash);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary) === signature;
}

interface VerificationResult {
  valid: boolean;
  error?: string;
}

async function verifySignatureRequired(
  payload: string,
  signature?: string,
  publicKey?: string
): Promise<VerificationResult> {
  if (!signature) {
    return { valid: false, error: 'Missing signature' };
  }

  if (!publicKey) {
    if (await isLegacyPlaceholderSignature(payload, signature)) {
      return { valid: false, error: 'Legacy placeholder signatures are no longer trusted' };
    }
    return { valid: false, error: 'Missing signer public key' };
  }

  const valid = await verifySignature(payload, signature, publicKey);
  return valid
    ? { valid: true }
    : { valid: false, error: 'Invalid signature' };
}

export async function verifyBlessingSignature(blessing: Blessing): Promise<VerificationResult> {
  const payload = serializeBlessingForSignature({
    blessingId: blessing.blessingId,
    type: blessing.type,
    metadata: blessing.metadata,
    issuedBy: blessing.issuedBy,
    forgedAt: blessing.forgedAt,
  });

  return verifySignatureRequired(payload, blessing.signature, blessing.issuedBy);
}

export async function verifyPairingInviteSignature(invite: PairingInvite): Promise<VerificationResult> {
  const payload = serializePairingInviteForSignature({
    type: invite.type,
    hubId: invite.hubId,
    teacherPubKey: invite.teacherPubKey,
    expiresAt: invite.expiresAt,
  });

  return verifySignatureRequired(payload, invite.signature, invite.teacherPubKey);
}

export async function verifyPairingResponseSignature(response: PairingResponse): Promise<VerificationResult> {
  const payload = serializePairingResponseForSignature({
    type: response.type,
    petCrestHash: response.petCrestHash,
    alias: response.alias,
    consentFlags: response.consentFlags,
    expiresAt: response.expiresAt,
    kidPubKey: response.kidPubKey,
    signatureScheme: response.signatureScheme,
  });

  return verifySignatureRequired(payload, response.signature, response.kidPubKey);
}

export async function verifyCareCapsuleSignature(capsule: CareCapsule): Promise<VerificationResult> {
  const payload = serializeCareCapsuleForSignature({
    petCrestHash: capsule.petCrestHash,
    weekOf: capsule.weekOf,
    streakBand: capsule.streakBand,
    stabilityBand: capsule.stabilityBand,
    varietyBand: capsule.varietyBand,
    kidPubKey: capsule.kidPubKey,
    signatureScheme: capsule.signatureScheme,
    verificationStatus: capsule.verificationStatus,
  });

  return verifySignatureRequired(payload, capsule.signature, capsule.kidPubKey);
}
