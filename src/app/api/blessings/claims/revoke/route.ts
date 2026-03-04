import { NextResponse } from 'next/server';
import { revokeBlessingClaimByCode } from '@/lib/server/blessing-claim-store';

const FRIENDLY_ERROR_MESSAGES = {
  malformed: 'That code format looks off. Double-check letters and dashes.',
  typo: 'We could not find that blessing code. Please check for a typo and try again.',
  expired: 'That blessing code already expired and can no longer be revoked.',
  already_redeemed: 'That blessing was already redeemed, so it cannot be revoked.',
  already_revoked: 'That blessing code was already revoked.',
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { reason: 'malformed', error: FRIENDLY_ERROR_MESSAGES.malformed },
        { status: 400 }
      );
    }

    const result = revokeBlessingClaimByCode(code);

    if (!result.ok) {
      const status = result.reason === 'malformed' ? 400 : 409;
      return NextResponse.json(
        { reason: result.reason, error: FRIENDLY_ERROR_MESSAGES[result.reason] },
        { status }
      );
    }

    return NextResponse.json({
      code: result.record.code,
      status: 'revoked',
      revokedAt: result.record.revokedAt,
    });
  } catch {
    return NextResponse.json(
      { reason: 'malformed', error: FRIENDLY_ERROR_MESSAGES.malformed },
      { status: 400 }
    );
  }
}
