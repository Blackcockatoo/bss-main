import type { Vitals } from "@/lib/store";

const SHARED_PET_STATE_KEY = "metapet-shared-pet-state-v1";
const LEGACY_SHARED_PET_STATE_KEYS = ["metapet-shared-pet-state"] as const;
const GUARDIAN_STATE_KEY = "auralia_guardian_state";

export interface SharedPetIdentity {
  petId: string;
  crestHash: string;
  displayName: string;
  createdAt: number;
}

export interface SharedPetBondState {
  score: number;
  band: "low" | "medium" | "high";
  updatedAt: number;
}

export interface SharedPetPairingState {
  lastMentorHubId: string | null;
  lastBondedAt: number | null;
}

export interface SharedPetState {
  identity: SharedPetIdentity;
  vitals: Vitals;
  bond: SharedPetBondState;
  pairing: SharedPetPairingState;
  updatedAt: number;
}

interface GuardianSnapshot {
  seedName?: string;
  createdAt?: number;
  bond?: number;
}

const DEFAULT_VITALS: Vitals = {
  hunger: 30,
  hygiene: 70,
  mood: 60,
  energy: 80,
  isSick: false,
  sicknessSeverity: 0,
  sicknessType: "none",
  deathCount: 0,
};

function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toHexHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function deriveLongHash(seed: string, targetLength = 64): string {
  let out = "";
  let cursor = seed;
  while (out.length < targetLength) {
    const chunk = toHexHash(cursor);
    out += chunk;
    cursor = `${cursor}:${chunk}`;
  }
  return out.slice(0, targetLength);
}

function normalizeVitals(value: unknown): Vitals {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_VITALS };
  }

  const raw = value as Partial<Vitals>;
  return {
    hunger:
      typeof raw.hunger === "number"
        ? clamp(raw.hunger, 0, 100)
        : DEFAULT_VITALS.hunger,
    hygiene:
      typeof raw.hygiene === "number"
        ? clamp(raw.hygiene, 0, 100)
        : DEFAULT_VITALS.hygiene,
    mood:
      typeof raw.mood === "number"
        ? clamp(raw.mood, 0, 100)
        : DEFAULT_VITALS.mood,
    energy:
      typeof raw.energy === "number"
        ? clamp(raw.energy, 0, 100)
        : DEFAULT_VITALS.energy,
    isSick: raw.isSick === true,
    sicknessSeverity:
      typeof raw.sicknessSeverity === "number"
        ? clamp(raw.sicknessSeverity, 0, 100)
        : DEFAULT_VITALS.sicknessSeverity,
    sicknessType:
      raw.sicknessType === "hungry" ||
      raw.sicknessType === "dirty" ||
      raw.sicknessType === "exhausted" ||
      raw.sicknessType === "depressed"
        ? raw.sicknessType
        : "none",
    deathCount:
      typeof raw.deathCount === "number" && Number.isFinite(raw.deathCount)
        ? Math.max(0, Math.floor(raw.deathCount))
        : DEFAULT_VITALS.deathCount,
  };
}

function getBondBand(score: number): SharedPetBondState["band"] {
  if (score < 35) return "low";
  if (score < 70) return "medium";
  return "high";
}

function readGuardianSnapshot(): GuardianSnapshot | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(GUARDIAN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuardianSnapshot;
    return parsed;
  } catch {
    return null;
  }
}

function deriveIdentity(guardian: GuardianSnapshot | null): SharedPetIdentity {
  const seedName =
    typeof guardian?.seedName === "string" &&
    guardian.seedName.trim().length > 0
      ? guardian.seedName.trim()
      : "Auralia";
  const createdAt =
    typeof guardian?.createdAt === "number" ? guardian.createdAt : 0;
  const root = `${seedName}:${createdAt || "genesis"}`;

  return {
    petId: `pet-${deriveLongHash(`${root}:id`, 16)}`,
    crestHash: deriveLongHash(`${root}:crest`, 64),
    displayName: seedName,
    createdAt,
  };
}

function deriveBondState(
  guardian: GuardianSnapshot | null,
): SharedPetBondState {
  const score =
    typeof guardian?.bond === "number" && Number.isFinite(guardian.bond)
      ? clamp(guardian.bond, 0, 100)
      : 50;
  return {
    score,
    band: getBondBand(score),
    updatedAt: Date.now(),
  };
}

function createDefaultSharedState(): SharedPetState {
  const guardian = readGuardianSnapshot();
  return {
    identity: deriveIdentity(guardian),
    vitals: { ...DEFAULT_VITALS },
    bond: deriveBondState(guardian),
    pairing: {
      lastMentorHubId: null,
      lastBondedAt: null,
    },
    updatedAt: Date.now(),
  };
}

function normalizeSharedPetState(value: unknown): SharedPetState {
  const fallback = createDefaultSharedState();
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Partial<SharedPetState>;
  const identity = raw.identity;
  const bond = raw.bond;
  const pairing = raw.pairing;

  return {
    identity: {
      petId:
        typeof identity?.petId === "string" && identity.petId.trim().length > 0
          ? identity.petId
          : fallback.identity.petId,
      crestHash:
        typeof identity?.crestHash === "string" &&
        identity.crestHash.trim().length > 0
          ? identity.crestHash
          : fallback.identity.crestHash,
      displayName:
        typeof identity?.displayName === "string" &&
        identity.displayName.trim().length > 0
          ? identity.displayName
          : fallback.identity.displayName,
      createdAt:
        typeof identity?.createdAt === "number" &&
        Number.isFinite(identity.createdAt)
          ? identity.createdAt
          : fallback.identity.createdAt,
    },
    vitals: normalizeVitals(raw.vitals),
    bond: {
      score:
        typeof bond?.score === "number" && Number.isFinite(bond.score)
          ? clamp(bond.score, 0, 100)
          : fallback.bond.score,
      band:
        bond?.band === "low" || bond?.band === "medium" || bond?.band === "high"
          ? bond.band
          : fallback.bond.band,
      updatedAt:
        typeof bond?.updatedAt === "number" && Number.isFinite(bond.updatedAt)
          ? bond.updatedAt
          : fallback.bond.updatedAt,
    },
    pairing: {
      lastMentorHubId:
        typeof pairing?.lastMentorHubId === "string" &&
        pairing.lastMentorHubId.trim().length > 0
          ? pairing.lastMentorHubId
          : null,
      lastBondedAt:
        typeof pairing?.lastBondedAt === "number" &&
        Number.isFinite(pairing.lastBondedAt)
          ? pairing.lastBondedAt
          : null,
    },
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : fallback.updatedAt,
  };
}

function writeSharedPetState(value: SharedPetState): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(SHARED_PET_STATE_KEY, JSON.stringify(value));
  } catch {
    // no-op; app should continue even if persistence is blocked
  }
}

function removeLegacySharedPetStateKeys(): boolean {
  if (!canUseLocalStorage()) return false;

  let removed = false;

  for (const key of LEGACY_SHARED_PET_STATE_KEYS) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removed = true;
      }
    } catch {
      // no-op
    }
  }

  return removed;
}

interface SharedStateCandidate {
  key: string;
  raw: string;
  state: SharedPetState;
}

function getSharedStateCandidates(): SharedStateCandidate[] {
  return [
    readSharedStateCandidate(SHARED_PET_STATE_KEY),
    ...LEGACY_SHARED_PET_STATE_KEYS.map((key) => readSharedStateCandidate(key)),
  ].filter((value): value is SharedStateCandidate => value !== null);
}

function isSharedPetStatePayload(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.identity !== undefined ||
    payload.vitals !== undefined ||
    payload.bond !== undefined ||
    payload.pairing !== undefined ||
    payload.updatedAt !== undefined
  );
}

function readSharedStateCandidate(key: string): SharedStateCandidate | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const decoded = JSON.parse(raw);
    if (!isSharedPetStatePayload(decoded)) {
      return null;
    }
    const parsed = normalizeSharedPetState(decoded);
    return {
      key,
      raw,
      state: parsed,
    };
  } catch {
    return null;
  }
}

export function migrateSharedPetStateStorage(): {
  migrated: boolean;
  state: SharedPetState | null;
} {
  if (!canUseLocalStorage()) {
    return { migrated: false, state: null };
  }

  const candidates = getSharedStateCandidates();

  if (candidates.length === 0) {
    return { migrated: removeLegacySharedPetStateKeys(), state: null };
  }

  const winner = candidates.reduce((best, candidate) =>
    candidate.state.updatedAt > best.state.updatedAt ? candidate : best,
  );

  let migrated = false;
  const canonicalSerialized = JSON.stringify(winner.state);
  const canonicalCandidate = candidates.find(
    (candidate) => candidate.key === SHARED_PET_STATE_KEY,
  );

  if (!canonicalCandidate || canonicalCandidate.raw !== canonicalSerialized) {
    writeSharedPetState(winner.state);
    migrated = true;
  }

  migrated = removeLegacySharedPetStateKeys() || migrated;

  return {
    migrated,
    state: winner.state,
  };
}

export function getSharedPetState(): SharedPetState | null {
  if (!canUseLocalStorage()) return null;

  const candidates = getSharedStateCandidates();
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) =>
    candidate.state.updatedAt > best.state.updatedAt ? candidate : best,
  ).state;
}

export function ensureSharedPetState(): SharedPetState {
  const existing = getSharedPetState();
  if (existing) return existing;

  const created = createDefaultSharedState();
  writeSharedPetState(created);
  return created;
}

export function syncSharedPetFromPetRoute(vitals: Vitals): SharedPetState {
  const guardian = readGuardianSnapshot();
  const previous = ensureSharedPetState();
  const nextBond = deriveBondState(guardian);
  const nextIdentity = deriveIdentity(guardian);

  const next: SharedPetState = {
    ...previous,
    identity: {
      ...previous.identity,
      ...nextIdentity,
    },
    vitals: normalizeVitals(vitals),
    bond: nextBond,
    updatedAt: Date.now(),
  };

  writeSharedPetState(next);
  return next;
}

export function markSharedPetPaired(mentorHubId: string): SharedPetState {
  const current = ensureSharedPetState();
  const normalizedHubId = mentorHubId.trim();

  const next: SharedPetState = {
    ...current,
    pairing: {
      lastMentorHubId:
        normalizedHubId.length > 0
          ? normalizedHubId
          : current.pairing.lastMentorHubId,
      lastBondedAt: Date.now(),
    },
    updatedAt: Date.now(),
  };

  writeSharedPetState(next);
  return next;
}

export function getSharedPetCrestHash(fallback = "pet-crest-local"): string {
  const state = ensureSharedPetState();
  return state.identity.crestHash || fallback;
}
