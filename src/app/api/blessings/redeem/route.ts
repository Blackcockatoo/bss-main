import { NextResponse } from 'next/server';
import { redeemBlessingClaimByCode } from '@/lib/server/blessing-claim-store';

const FRIENDLY_ERROR_MESSAGES = {
  malformed: 'That code format looks off. Double-check letters and dashes.',
  typo: 'We could not find that blessing code. Please check for a typo and try again.',
  expired: 'That blessing code has expired. Ask your teacher for a fresh one.',
  already_redeemed: 'That blessing was already claimed. Ask your teacher for another gift code.',
  revoked: 'That blessing code was revoked by your teacher.',
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (typeof code !== 'string') {
      return NextResponse.json(
        { reason: 'malformed', error: FRIENDLY_ERROR_MESSAGES.malformed },
        { status: 400 }
      );
    }

    const result = redeemBlessingClaimByCode(code);

    if (!result.ok) {
      const status = result.reason === 'malformed' ? 400 : 404;
      return NextResponse.json(
        { reason: result.reason, error: FRIENDLY_ERROR_MESSAGES[result.reason] },
        { status }
      );
    }

    return NextResponse.json({ blessing: result.blessing });
  } catch {
    return NextResponse.json(
      { reason: 'malformed', error: FRIENDLY_ERROR_MESSAGES.malformed },
      { status: 400 }
    );
  }
}
