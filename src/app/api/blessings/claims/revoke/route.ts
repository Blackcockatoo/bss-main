import { revokeBlessingClaimByCode } from "@/lib/server/blessing-claim-store";
import type { RevokeBlessingClaimResult } from "@/lib/server/blessing-claim-store";
import { NextResponse } from "next/server";

// ── Simple hub-token auth guard ───────────────────────────────────────────────
//
// Revoke is a teacher-only action. Require a hub Bearer token to prevent
// anonymous clients from revoking codes they learned by other means.

function extractHubToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function isValidHubId(token: string): boolean {
  return (
    token.length >= 8 && token.length <= 256 && /^[\w\-+=/.]+$/.test(token)
  );
}

// ── Teacher-facing error messages ─────────────────────────────────────────────

const FRIENDLY_ERROR_MESSAGES: Record<
  Exclude<RevokeBlessingClaimResult, { ok: true }>["reason"],
  string
> = {
  malformed: "That code format looks off. Double-check letters and dashes.",
  typo: "We could not find that blessing code. Please check for a typo and try again.",
  expired: "That blessing code already expired and can no longer be revoked.",
  already_redeemed:
    "That blessing was already redeemed, so it cannot be revoked.",
  already_revoked: "That blessing code was already revoked.",
};

// ── HTTP status mapping ───────────────────────────────────────────────────────

function statusForReason(
  reason: Exclude<RevokeBlessingClaimResult, { ok: true }>["reason"],
): number {
  switch (reason) {
    case "malformed":
      return 400; // Bad Request
    case "typo":
      return 404; // Not Found — code doesn't exist
    case "expired":
      return 410; // Gone — already expired, revoke is moot
    case "already_redeemed":
      return 409; // Conflict — redeemed codes can't be un-redeemed
    case "already_revoked":
      return 409; // Conflict — idempotent revoke re-attempted
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth guard — only the teacher who holds the hub token may revoke
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { reason: "malformed", error: FRIENDLY_ERROR_MESSAGES.malformed },
      { status: 400 },
    );
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = raw.code;

  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { reason: "malformed", error: FRIENDLY_ERROR_MESSAGES.malformed },
      { status: 400 },
    );
  }

  const result = revokeBlessingClaimByCode(code.trim());

  if (!result.ok) {
    return NextResponse.json(
      { reason: result.reason, error: FRIENDLY_ERROR_MESSAGES[result.reason] },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({
    code: result.record.code,
    status: "revoked",
    revokedAt: result.record.revokedAt,
  });
}
