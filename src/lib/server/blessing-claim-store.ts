import { generateClaimCode, validateClaimCode } from "@/lib/veil/claim-code";
import type { Blessing } from "@/lib/veil/types";

const CLAIM_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

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
  var __veilBlessingClaimStore: ClaimStore | undefined;
}

function getStore(): ClaimStore {
  if (!globalThis.__veilBlessingClaimStore) {
    globalThis.__veilBlessingClaimStore = new Map();
  }

  return globalThis.__veilBlessingClaimStore;
}

function cleanupExpiredRecords(store: ClaimStore): void {
  const now = Date.now();

  for (const [key, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function getUniqueCode(store: ClaimStore): string {
  let code = generateClaimCode();
  let validation = validateClaimCode(code);

  while (!validation.valid || store.has(validation.normalized)) {
    code = generateClaimCode();
    validation = validateClaimCode(code);
  }

  return validation.formatted;
}

export function createBlessingClaimRecord(
  blessing: Blessing,
): BlessingClaimRecord {
  const store = getStore();
  cleanupExpiredRecords(store);

  const now = Date.now();
  const code = getUniqueCode(store);
  const validation = validateClaimCode(code);

  if (!validation.valid) {
    throw new Error("Generated blessing code was invalid");
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
