import { redeemBlessingClaimByCode } from "@/lib/server/blessing-claim-store";
import type { RedeemClaimResult } from "@/lib/server/blessing-claim-store";
import { NextResponse } from "next/server";

// ── Kid-friendly error messages ───────────────────────────────────────────────

const FRIENDLY_ERROR_MESSAGES: Record<
  Exclude<RedeemClaimResult, { ok: true }>["reason"],
  string
> = {
  malformed: "That code format looks off. Double-check letters and dashes.",
  typo: "We could not find that blessing code. Please check for a typo and try again.",
  expired: "That blessing code has expired. Ask your teacher for a fresh one.",
  already_redeemed:
    "That blessing was already claimed. Ask your teacher for another gift code.",
  revoked: "That blessing code was revoked by your teacher.",
};

// ── HTTP status mapping ───────────────────────────────────────────────────────

function statusForReason(
  reason: Exclude<RedeemClaimResult, { ok: true }>["reason"],
): number {
  switch (reason) {
    case "malformed":
      return 400; // Bad Request — client sent garbage
    case "typo":
      return 404; // Not Found — code doesn't exist
    case "expired":
      return 410; // Gone — existed but is no longer valid
    case "revoked":
      return 410; // Gone — explicitly withdrawn by teacher
    case "already_redeemed":
      return 409; // Conflict — valid code, already consumed
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
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

  const result = redeemBlessingClaimByCode(code.trim());

  if (!result.ok) {
    return NextResponse.json(
      { reason: result.reason, error: FRIENDLY_ERROR_MESSAGES[result.reason] },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({ blessing: result.blessing });
}
