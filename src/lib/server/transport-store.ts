import { randomBytes } from 'crypto';
import type { TransportEnvelope, TransportErrorCode, TransportPayload } from '@/lib/protocol/schema';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type MessageRecord = {
  envelope: TransportEnvelope;
  usedAt?: number;
};

const messageStore = new Map<string, MessageRecord>();
const repliesByParent = new Map<string, string[]>();

function now() {
  return Date.now();
}

function base62Token(length = 12): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(length);
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += alphabet[bytes[i] % alphabet.length];
  }
  return output;
}

function cleanupExpired() {
  const timestamp = now();
  for (const [id, record] of messageStore.entries()) {
    if (record.envelope.expiresAt < timestamp) {
      messageStore.delete(id);
    }
  }
}

export function createTransportMessage<TPayload extends TransportPayload>(
  payload: TPayload,
  ttlMs = DEFAULT_TTL_MS,
): TransportEnvelope<TPayload> {
  cleanupExpired();
  const id = base62Token(10);
  const envelope: TransportEnvelope<TPayload> = {
    id,
    expiresAt: now() + ttlMs,
    payload,
  };
  messageStore.set(id, { envelope });
  return envelope;
}

export function consumeTransportMessage(id: string):
  | { ok: true; envelope: TransportEnvelope }
  | { ok: false; code: TransportErrorCode } {
  cleanupExpired();
  const record = messageStore.get(id);

  if (!record) {
    return { ok: false, code: 'invalid-token' };
  }

  if (record.envelope.expiresAt < now()) {
    messageStore.delete(id);
    return { ok: false, code: 'expired-token' };
  }

  if (record.usedAt) {
    return { ok: false, code: 'already-used-token' };
  }

  record.usedAt = now();
  return { ok: true, envelope: record.envelope };
}

export function createReplyMessage<TPayload extends TransportPayload>(
  replyTo: string,
  payload: TPayload,
  ttlMs = DEFAULT_TTL_MS,
): TransportEnvelope<TPayload> {
  const envelope = createTransportMessage(payload, ttlMs);
  const existing = repliesByParent.get(replyTo) ?? [];
  existing.push(envelope.id);
  repliesByParent.set(replyTo, existing);
  return envelope;
}

export function consumeReplyMessage(replyTo: string):
  | { ok: true; envelope: TransportEnvelope }
  | { ok: false; code: TransportErrorCode } {
  cleanupExpired();
  const queue = repliesByParent.get(replyTo);

  if (!queue || queue.length === 0) {
    return { ok: false, code: 'not-found' };
  }

  while (queue.length > 0) {
    const replyId = queue.shift();
    if (!replyId) {
      break;
    }

    const consumed = consumeTransportMessage(replyId);
    if (consumed.ok) {
      return consumed;
    }

    if (consumed.code === 'invalid-token' || consumed.code === 'expired-token') {
      continue;
    }

    return consumed;
  }

  return { ok: false, code: 'not-found' };
}
