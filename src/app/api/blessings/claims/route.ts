import { NextResponse } from 'next/server';
import {
  getBlessingClaimStatus,
  listBlessingClaimRecords,
} from '@/lib/server/blessing-claim-store';

function parseBoolean(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const includeExpired = parseBoolean(url.searchParams.get('includeExpired'));
  const includeRedeemed = parseBoolean(url.searchParams.get('includeRedeemed'));
  const includeRevoked = parseBoolean(url.searchParams.get('includeRevoked'));

  if (includeExpired === null && url.searchParams.has('includeExpired')) {
    return NextResponse.json({ error: 'includeExpired must be true or false' }, { status: 400 });
  }

  if (includeRedeemed === null && url.searchParams.has('includeRedeemed')) {
    return NextResponse.json({ error: 'includeRedeemed must be true or false' }, { status: 400 });
  }

  if (includeRevoked === null && url.searchParams.has('includeRevoked')) {
    return NextResponse.json({ error: 'includeRevoked must be true or false' }, { status: 400 });
  }

  const records = listBlessingClaimRecords({
    includeExpired: includeExpired ?? false,
    includeRedeemed: includeRedeemed ?? false,
    includeRevoked: includeRevoked ?? false,
  });

  return NextResponse.json({
    claims: records.map(record => ({
      code: record.code,
      status: getBlessingClaimStatus(record),
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      redeemedAt: record.redeemedAt ?? null,
      revokedAt: record.revokedAt ?? null,
      blessing: {
        blessingId: record.blessing.blessingId,
        type: record.blessing.type,
        metadata: {
          name: record.blessing.metadata.name,
          flavorText: record.blessing.metadata.flavorText,
        },
      },
    })),
  });
}
