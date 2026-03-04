import type { Blessing, PairingInvite, PairingResponse } from '@/lib/veil/types';

export type TransportPayloadKind = 'pair-invite' | 'pair-accept' | 'blessing-claim-request';

export interface PairInvitePayload {
  type: 'pair-invite';
  invite: PairingInvite;
}

export interface PairAcceptPayload {
  type: 'pair-accept';
  response: PairingResponse;
}

export interface BlessingClaimRequestPayload {
  type: 'blessing-claim-request';
  blessing: Blessing;
}

export type TransportPayload = PairInvitePayload | PairAcceptPayload | BlessingClaimRequestPayload;

export interface TransportEnvelope<TPayload extends TransportPayload = TransportPayload> {
  id: string;
  expiresAt: number;
  payload: TPayload;
}

export type TransportErrorCode =
  | 'invalid-token'
  | 'expired-token'
  | 'already-used-token'
  | 'invalid-payload'
  | 'not-found';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isPairingInvite(value: unknown): value is PairingInvite {
  if (!isRecord(value)) return false;
  return value.type === 'veil-pair-invite'
    && typeof value.hubId === 'string'
    && typeof value.teacherPubKey === 'string'
    && typeof value.expiresAt === 'number'
    && typeof value.signature === 'string';
}

function isPairingResponse(value: unknown): value is PairingResponse {
  if (!isRecord(value)) return false;
  return value.type === 'veil-pair-response'
    && typeof value.petCrestHash === 'string'
    && Array.isArray(value.consentFlags)
    && typeof value.expiresAt === 'number'
    && typeof value.signature === 'string'
    && (value.alias === undefined || typeof value.alias === 'string');
}

function isBlessing(value: unknown): value is Blessing {
  if (!isRecord(value)) return false;
  return typeof value.blessingId === 'string'
    && typeof value.type === 'string'
    && isRecord(value.metadata)
    && typeof value.issuedBy === 'string'
    && typeof value.forgedAt === 'number'
    && typeof value.signature === 'string';
}

export function isTransportPayload(value: unknown): value is TransportPayload {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'pair-invite':
      return isPairingInvite(value.invite);
    case 'pair-accept':
      return isPairingResponse(value.response);
    case 'blessing-claim-request':
      return isBlessing(value.blessing);
    default:
      return false;
  }
}
