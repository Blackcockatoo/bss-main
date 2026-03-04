import { NextResponse } from 'next/server';
import { consumeReplyMessage } from '@/lib/server/transport-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ replyTo: string }> },
) {
  const { replyTo } = await context.params;
  const result = consumeReplyMessage(replyTo);

  if (!result.ok) {
    if (result.code === 'not-found') {
      return NextResponse.json({ error: 'not-found', code: 'not-found' }, { status: 404 });
    }
    const status = result.code === 'invalid-token' ? 404 : 410;
    return NextResponse.json({ error: result.code, code: result.code }, { status });
  }

  return NextResponse.json(result.envelope);
}
