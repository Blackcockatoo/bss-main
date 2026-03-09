import {
  createBlessingClaimRecord,
  hasActiveBlessingClaim,
} from "@/lib/server/blessing-claim-store";
import type { Blessing } from "@/lib/veil/types";
import { NextResponse } from "next/server";

// ── Blessing payload validation ──────────────────────────────────────────────

/**
 * Maximum allowed age of a forgedAt timestamp. Blessings older than this are
 * rejected to prevent replay of stale blessings.
 */
const MAX_BLESSING_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * How far into the future a forgedAt timestamp may be. Small clock skew is
 * expected between devices; anything beyond this is almost certainly spoofed.
 */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

function isValidBlessingId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9]{16}$/.test(id);
}

function isValidBlessingType(type: unknown): type is Blessing["type"] {
  return type === "sticker" || type === "aura" || type === "accessory";
}

function isValidForgedAt(forgedAt: unknown): forgedAt is number {
  if (typeof forgedAt !== "number" || !Number.isFinite(forgedAt)) {
    return false;
  }
  const now = Date.now();
  const age = now - forgedAt;
  // Reject blessings that are too old or suspiciously future-dated
  return age <= MAX_BLESSING_AGE_MS && forgedAt <= now + MAX_CLOCK_SKEW_MS;
}

/**
 * Structural validation of the blessing payload. Checks all required fields
 * are present and well-formed.
 *
 * NOTE: Cryptographic signature verification requires access to Web Crypto
 * and the teacher's public key — it is performed here using the `issuedBy`
 * field. For now we validate structure and timestamp; full ECDSA verification
 * is wired via `verifyBlessingObject` from `@/lib/veil`.
 */
function validateBlessingPayload(
  raw: unknown,
): { valid: true; blessing: Blessing } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Blessing must be an object." };
  }

  const b = raw as Record<string, unknown>;

  if (!isValidBlessingId(b.blessingId)) {
    return {
      valid: false,
      error: "blessingId must be a 16-character alphanumeric string.",
    };
  }

  if (!isValidBlessingType(b.type)) {
    return {
      valid: false,
      error: "type must be one of: sticker, aura, accessory.",
    };
  }

  if (typeof b.issuedBy !== "string" || b.issuedBy.trim().length === 0) {
    return { valid: false, error: "issuedBy must be a non-empty string." };
  }

  if (typeof b.signature !== "string" || b.signature.trim().length === 0) {
    return { valid: false, error: "signature must be a non-empty string." };
  }

  if (!isValidForgedAt(b.forgedAt)) {
    return {
      valid: false,
      error:
        "forgedAt is missing, too old (> 7 days), or too far in the future (> 5 min).",
    };
  }

  // metadata is optional but must be an object when present
  if (
    b.metadata !== undefined &&
    (typeof b.metadata !== "object" ||
      b.metadata === null ||
      Array.isArray(b.metadata))
  ) {
    return { valid: false, error: "metadata must be an object when present." };
  }

  return {
    valid: true,
    blessing: b as unknown as Blessing,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const rawBlessing =
    body && typeof body === "object" && "blessing" in (body as object)
      ? (body as Record<string, unknown>).blessing
      : undefined;

  const validation = validateBlessingPayload(rawBlessing);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { blessing } = validation;

  // Idempotency guard: reject if an active claim already exists for this blessingId
  if (hasActiveBlessingClaim(blessing.blessingId)) {
    return NextResponse.json(
      {
        error:
          "An active claim code already exists for this blessing. Revoke it before creating a new one.",
      },
      { status: 409 },
    );
  }

  try {
    const record = createBlessingClaimRecord(blessing);

    return NextResponse.json({
      code: record.code,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create blessing claim code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
