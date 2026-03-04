import { NextResponse } from 'next/server';
import { consumeTransportMessage } from '@/lib/server/transport-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await context.params;
  const result = consumeTransportMessage(messageId);

  if (!result.ok) {
    const status = result.code === 'invalid-token' ? 404 : 410;
    return NextResponse.json({ error: result.code, code: result.code }, { status });
  }

  return NextResponse.json(result.envelope);
}
