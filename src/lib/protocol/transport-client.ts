import type { TransportEnvelope, TransportPayload } from '@/lib/protocol/schema';

export type TransportFetchErrorCode =
  | 'invalid-token'
  | 'expired-token'
  | 'already-used-token'
  | 'not-found'
  | 'invalid-payload'
  | 'network-error';

export class TransportError extends Error {
  code: TransportFetchErrorCode;

  constructor(code: TransportFetchErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function parseJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

export async function createTransportToken(payload: TransportPayload, ttlMs?: number) {
  const response = await fetch('/api/transport/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, ttlMs }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new TransportError(data.code ?? 'network-error', data.error);
  }

  return data as { id: string; expiresAt: number };
}

export async function fetchTransportMessage(messageId: string): Promise<TransportEnvelope> {
  const response = await fetch(`/api/transport/messages/${encodeURIComponent(messageId)}`);
  const data = await parseJson(response);

  if (!response.ok) {
    throw new TransportError(data.code ?? 'network-error', data.error);
  }

  return data as TransportEnvelope;
}

export async function createReplyToken(replyTo: string, payload: TransportPayload, ttlMs?: number) {
  const response = await fetch('/api/transport/replies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyTo, payload, ttlMs }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new TransportError(data.code ?? 'network-error', data.error);
  }

  return data as { id: string; expiresAt: number };
}

export async function fetchReplyMessage(replyTo: string): Promise<TransportEnvelope | null> {
  const response = await fetch(`/api/transport/replies/${encodeURIComponent(replyTo)}`);
  const data = await parseJson(response);

  if (response.status === 404 && data.code === 'not-found') {
    return null;
  }

  if (!response.ok) {
    throw new TransportError(data.code ?? 'network-error', data.error);
  }

  return data as TransportEnvelope;
}
