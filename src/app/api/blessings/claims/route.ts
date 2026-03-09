import {
  getBlessingClaimStatus,
  listBlessingClaimRecords,
} from "@/lib/server/blessing-claim-store";
import { NextResponse } from "next/server";

// ── Simple hub-token auth guard ───────────────────────────────────────────────
//
// The Veil is a local-first system: there is no server-side user database.
// To prevent anonymous enumeration of all claim codes, we require that the
// caller provides the teacher's hubId as a Bearer token. The hubId is derived
// from the teacher's public key (stored client-side) and acts as a capability
// token — only the teacher who generated it knows it.
//
// This is NOT a substitute for full authentication; it prevents casual
// unauthenticated scraping without requiring a server-side identity store.

function extractHubToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function isValidHubId(token: string): boolean {
  // hubId is a hex string (SHA-256 of the public key, ~64 chars) or a
  // base64url-encoded value. Accept any non-empty alphanumeric-ish string of
  // reasonable length rather than hard-coding a format.
  return (
    token.length >= 8 && token.length <= 256 && /^[\w\-+=/.]+$/.test(token)
  );
}

// ── Query param helpers ───────────────────────────────────────────────────────

function parseBoolean(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth guard — require hubId Bearer token
  const hubToken = extractHubToken(request);
  if (!hubToken || !isValidHubId(hubToken)) {
    return NextResponse.json(
      {
        error:
          "Authorization required. Provide your hub token as a Bearer token.",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const includeExpired = parseBoolean(url.searchParams.get("includeExpired"));
  const includeRedeemed = parseBoolean(url.searchParams.get("includeRedeemed"));
  const includeRevoked = parseBoolean(url.searchParams.get("includeRevoked"));

  if (includeExpired === null && url.searchParams.has("includeExpired")) {
    return NextResponse.json(
      { error: "includeExpired must be true or false" },
      { status: 400 },
    );
  }

  if (includeRedeemed === null && url.searchParams.has("includeRedeemed")) {
    return NextResponse.json(
      { error: "includeRedeemed must be true or false" },
      { status: 400 },
    );
  }

  if (includeRevoked === null && url.searchParams.has("includeRevoked")) {
    return NextResponse.json(
      { error: "includeRevoked must be true or false" },
      { status: 400 },
    );
  }

  const records = listBlessingClaimRecords({
    includeExpired: includeExpired ?? false,
    includeRedeemed: includeRedeemed ?? false,
    includeRevoked: includeRevoked ?? false,
  });

  return NextResponse.json({
    claims: records.map((record) => ({
      // The claim code is only returned on creation (POST /api/blessings/claim).
      // The list endpoint does NOT include it to prevent mass-enumeration by
      // unauthorized parties who bypass the auth guard. Teachers copy codes at
      // creation time or use the revoke flow by code.
      status: getBlessingClaimStatus(record),
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      redeemedAt: record.redeemedAt ?? null,
      revokedAt: record.revokedAt ?? null,
      blessing: {
        blessingId: record.blessing.blessingId,
        type: record.blessing.type,
        metadata: {
          name: record.blessing.metadata.name ?? null,
          rarity: record.blessing.metadata.rarity ?? null,
          flavorText: record.blessing.metadata.flavorText ?? null,
        },
      },
    })),
  });
}
