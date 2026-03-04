import { NextResponse } from 'next/server';
import { createReplyMessage } from '@/lib/server/transport-store';
import { isTransportPayload } from '@/lib/protocol/schema';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.replyTo !== 'string' || !isTransportPayload(body.payload)) {
    return NextResponse.json(
      { error: 'Invalid payload', code: 'invalid-payload' },
      { status: 400 },
    );
  }

  const ttlMs = typeof body.ttlMs === 'number' ? body.ttlMs : undefined;
  const envelope = createReplyMessage(body.replyTo, body.payload, ttlMs);

  return NextResponse.json({
    id: envelope.id,
    expiresAt: envelope.expiresAt,
  });
}
