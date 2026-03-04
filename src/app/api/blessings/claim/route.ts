import { NextResponse } from 'next/server';
import type { Blessing } from '@/lib/veil/types';
import { createBlessingClaimRecord } from '@/lib/server/blessing-claim-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const blessing = body?.blessing as Blessing | undefined;

    if (!blessing || !blessing.blessingId || !blessing.signature || !blessing.issuedBy || !blessing.type) {
      return NextResponse.json({ error: 'Malformed blessing payload' }, { status: 400 });
    }

    const record = createBlessingClaimRecord(blessing);

    return NextResponse.json({
      code: record.code,
      expiresAt: record.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create blessing claim code' }, { status: 500 });
  }
}
