import { generateClaimCode, validateClaimCode } from "@/lib/veil/claim-code";
import type { Blessing } from "@/lib/veil/types";

const CLAIM_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Maximum blessing claim records kept in the in-memory store.
 * Old expired/revoked records are evicted first. If the store is still
 * full of active records, creation is rejected to prevent unbounded growth.
 */
const MAX_STORE_SIZE = 2_000;

/**
 * Maximum attempts to generate a unique, valid code before giving up.
 * Prevents an infinite loop if the code-space is somehow exhausted.
 */
const MAX_CODE_GEN_ATTEMPTS = 32;

export type BlessingClaimRecord = {
  code: string;
  blessing: Blessing;
  createdAt: number;
  expiresAt: number;
  redeemedAt?: number;
  revokedAt?: number;
};

type ClaimStore = Map<string, BlessingClaimRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __veilBlessingClaimStore: ClaimStore | undefined;
}

function getStore(): ClaimStore {
  if (!globalThis.__veilBlessingClaimStore) {
    globalThis.__veilBlessingClaimStore = new Map();
  }

  return globalThis.__veilBlessingClaimStore;
}

/**
 * Remove expired records from the store. Called on every write and on every
 * read (list/lookup) so the store doesn't accumulate stale entries.
 */
function cleanupExpiredRecords(store: ClaimStore): void {
  const now = Date.now();

  for (const [key, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Generate a code that is both structurally valid and unique within the store.
 * Throws if a unique code cannot be found within MAX_CODE_GEN_ATTEMPTS.
 */
function getUniqueCode(store: ClaimStore): string {
  for (let attempt = 0; attempt < MAX_CODE_GEN_ATTEMPTS; attempt++) {
    const code = generateClaimCode();
    const validation = validateClaimCode(code);

    if (validation.valid && !store.has(validation.normalized)) {
      return validation.formatted;
    }
  }

  throw new Error(
    `Could not generate a unique blessing code after ${MAX_CODE_GEN_ATTEMPTS} attempts`,
  );
}

export function createBlessingClaimRecord(
  blessing: Blessing,
): BlessingClaimRecord {
  const store = getStore();
  // Always clean up before writing so the size cap reflects live records only.
  cleanupExpiredRecords(store);

  if (store.size >= MAX_STORE_SIZE) {
    throw new Error(
      "Blessing claim store is full. Too many active claims outstanding.",
    );
  }

  const now = Date.now();
  const formattedCode = getUniqueCode(store);
  const validation = validateClaimCode(formattedCode);

  if (!validation.valid) {
    throw new Error("Generated blessing code was invalid after formatting");
  }

  const record: BlessingClaimRecord = {
    code: validation.formatted,
    blessing,
    createdAt: now,
    expiresAt: now + CLAIM_TTL_MS,
  };

  store.set(validation.normalized, record);

  return record;
}

export type RedeemClaimResult =
  | { ok: true; blessing: Blessing }
  | {
      ok: false;
      reason: "malformed" | "typo" | "expired" | "already_redeemed" | "revoked";
    };

export type BlessingClaimStatus = "active" | "expired" | "redeemed" | "revoked";

export function getBlessingClaimStatus(
  record: BlessingClaimRecord,
  now = Date.now(),
): BlessingClaimStatus {
  if (record.revokedAt) {
    return "revoked";
  }

  if (record.redeemedAt) {
    return "redeemed";
  }

  if (record.expiresAt <= now) {
    return "expired";
  }

  return "active";
}

type ListBlessingClaimOptions = {
  includeExpired?: boolean;
  includeRedeemed?: boolean;
  includeRevoked?: boolean;
};

export function listBlessingClaimRecords(
  options: ListBlessingClaimOptions = {},
): BlessingClaimRecord[] {
  const store = getStore();
  // Clean up on reads too — keeps memory usage bounded between write operations.
  cleanupExpiredRecords(store);

  const now = Date.now();
  const includeExpired = options.includeExpired ?? false;
  const includeRedeemed = options.includeRedeemed ?? false;
  const includeRevoked = options.includeRevoked ?? false;

  return [...store.values()]
    .filter((record) => {
      const status = getBlessingClaimStatus(record, now);

      if (status === "expired") {
        return includeExpired;
      }

      if (status === "redeemed") {
        return includeRedeemed;
      }

      if (status === "revoked") {
        return includeRevoked;
      }

      return true;
    })
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function listActiveUnredeemedBlessingClaimRecords(): BlessingClaimRecord[] {
  return listBlessingClaimRecords();
}

export function getBlessingClaimRecordByCode(
  rawCode: string,
): BlessingClaimRecord | null {
  const store = getStore();
  cleanupExpiredRecords(store);

  const validation = validateClaimCode(rawCode);

  if (!validation.valid) {
    return null;
  }

  return store.get(validation.normalized) ?? null;
}

export type RevokeBlessingClaimResult =
  | { ok: true; record: BlessingClaimRecord }
  | {
      ok: false;
      reason:
        | "malformed"
        | "typo"
        | "expired"
        | "already_redeemed"
        | "already_revoked";
    };

export function revokeBlessingClaimByCode(
  rawCode: string,
): RevokeBlessingClaimResult {
  const store = getStore();

  const validation = validateClaimCode(rawCode);
  if (!validation.valid) {
    return { ok: false, reason: validation.reason };
  }

  const record = store.get(validation.normalized);

  if (!record) {
    return { ok: false, reason: "typo" };
  }

  const status = getBlessingClaimStatus(record);

  if (status === "expired") {
    return { ok: false, reason: "expired" };
  }

  if (status === "redeemed") {
    return { ok: false, reason: "already_redeemed" };
  }

  if (status === "revoked") {
    return { ok: false, reason: "already_revoked" };
  }

  record.revokedAt = Date.now();
  store.set(validation.normalized, record);

  return { ok: true, record };
}

export function redeemBlessingClaimByCode(rawCode: string): RedeemClaimResult {
  const store = getStore();

  const validation = validateClaimCode(rawCode);
  if (!validation.valid) {
    return { ok: false, reason: validation.reason };
  }

  const record = store.get(validation.normalized);

  if (!record) {
    return { ok: false, reason: "typo" };
  }

  if (record.expiresAt <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (record.revokedAt) {
    return { ok: false, reason: "revoked" };
  }

  if (record.redeemedAt) {
    return { ok: false, reason: "already_redeemed" };
  }

  record.redeemedAt = Date.now();
  store.set(validation.normalized, record);

  return { ok: true, blessing: record.blessing };
}

/**
 * Check whether a blessingId already has an active (non-expired, non-revoked)
 * claim record. Used to prevent duplicate claim creation for the same blessing.
 */
export function hasActiveBlessingClaim(blessingId: string): boolean {
  const store = getStore();
  cleanupExpiredRecords(store);

  for (const record of store.values()) {
    if (
      record.blessing.blessingId === blessingId &&
      getBlessingClaimStatus(record) === "active"
    ) {
      return true;
    }
  }

  return false;
}
