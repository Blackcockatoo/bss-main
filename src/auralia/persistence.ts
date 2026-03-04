export interface Offspring {
  name: string;
  genome: {
    red60: number;
    blue60: number;
    black60: number;
  };
  parents: string[];
  birthDate: number;
}

export interface DreamInsightEntry {
  timestamp: number;
  insight: string;
  energy: number;
  curiosity: number;
  bond: number;
  focusedSigils: number[];
}

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  audioOffByDefault: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  muted: boolean;
}

export interface AIConfigOverrides {
  idleMin?: number;
  idleMax?: number;
  observingMin?: number;
  observingMax?: number;
  focusingMin?: number;
  focusingMax?: number;
  playingMin?: number;
  playingMax?: number;
  dreamingMin?: number;
  dreamingMax?: number;
  idleToDreamProb?: number;
  idleToObserveProb?: number;
  idleToFocusProb?: number;
}

export interface GuardianSaveData {
  seedName: string;
  energy: number;
  curiosity: number;
  bond: number;
  health: number;
  bondHistory: { timestamp: number; bond: number; event: string }[];
  activatedPoints: number[];
  createdAt: number;
  lastSaved: number;
  totalInteractions: number;
  dreamCount: number;
  gamesWon: number;
  highContrast: boolean;
  offspring: Offspring[];
  breedingPartner?: string;
  dreamJournal?: DreamInsightEntry[];
  unlockedLore?: string[];
  accessibility?: AccessibilitySettings;
  audioSettings?: AudioSettings;
  aiConfigOverrides?: AIConfigOverrides;
  sigilAffinities?: Record<number, number>;
  focusHistory?: number[];
}

export const STORAGE_KEY = "auralia_guardian_state";
const LEGACY_STORAGE_KEYS = [
  "metapet_guardian_state",
  "guardian_state",
] as const;

interface GuardianMigrationResult {
  migrated: boolean;
  state: GuardianSaveData | null;
}

function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNonNegativeInt(value: unknown, fallback = 0): number {
  const candidate = asFiniteNumber(value, fallback);
  return Math.max(0, Math.floor(candidate));
}

function asText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeNumberList(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const out: number[] = [];
  const seen = new Set<number>();

  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    const next = Math.floor(value);
    if (seen.has(next)) {
      continue;
    }

    seen.add(next);
    out.push(next);
  }

  return out;
}

function normalizeTextList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const next = value.trim();
    if (!next || seen.has(next)) {
      continue;
    }

    seen.add(next);
    out.push(next);
  }

  return out;
}

function normalizeBondHistory(value: unknown): GuardianSaveData["bondHistory"] {
  if (!Array.isArray(value)) return [];

  const out: GuardianSaveData["bondHistory"] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;

    const raw = entry as {
      timestamp?: unknown;
      bond?: unknown;
      event?: unknown;
    };
    const timestamp = asFiniteNumber(raw.timestamp, Date.now());
    const bond = clamp(asFiniteNumber(raw.bond, 50), 0, 100);
    const event = asText(raw.event, "interaction");
    const fingerprint = `${Math.floor(timestamp)}|${event}|${Math.round(bond)}`;

    if (seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    out.push({ timestamp, bond, event });
  }

  return out;
}

function normalizeOffspring(value: unknown): Offspring[] {
  if (!Array.isArray(value)) return [];

  const out: Offspring[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;

    const raw = entry as {
      name?: unknown;
      genome?: { red60?: unknown; blue60?: unknown; black60?: unknown };
      parents?: unknown;
      birthDate?: unknown;
    };

    const name = asText(raw.name, "Offspring");
    const birthDate = asFiniteNumber(raw.birthDate, Date.now());
    const fingerprint = `${name}|${Math.floor(birthDate)}`;

    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    out.push({
      name,
      genome: {
        red60: clamp(asFiniteNumber(raw.genome?.red60, 0), 0, 100),
        blue60: clamp(asFiniteNumber(raw.genome?.blue60, 0), 0, 100),
        black60: clamp(asFiniteNumber(raw.genome?.black60, 0), 0, 100),
      },
      parents: normalizeTextList(raw.parents),
      birthDate,
    });
  }

  return out;
}

function normalizeDreamJournal(value: unknown): DreamInsightEntry[] {
  if (!Array.isArray(value)) return [];

  const out: DreamInsightEntry[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;

    const raw = entry as {
      timestamp?: unknown;
      insight?: unknown;
      energy?: unknown;
      curiosity?: unknown;
      bond?: unknown;
      focusedSigils?: unknown;
    };

    out.push({
      timestamp: asFiniteNumber(raw.timestamp, Date.now()),
      insight: asText(raw.insight, ""),
      energy: clamp(asFiniteNumber(raw.energy, 50), 0, 100),
      curiosity: clamp(asFiniteNumber(raw.curiosity, 50), 0, 100),
      bond: clamp(asFiniteNumber(raw.bond, 50), 0, 100),
      focusedSigils: normalizeNumberList(raw.focusedSigils),
    });
  }

  return out;
}

function normalizeAccessibility(
  value: unknown,
): AccessibilitySettings | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Partial<AccessibilitySettings>;
  return {
    reduceMotion: raw.reduceMotion === true,
    highContrast: raw.highContrast === true,
    audioOffByDefault: raw.audioOffByDefault === true,
  };
}

function normalizeAudioSettings(value: unknown): AudioSettings | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Partial<AudioSettings>;
  return {
    masterVolume: clamp(asFiniteNumber(raw.masterVolume, 0.8), 0, 1),
    muted: raw.muted === true,
  };
}

function normalizeAIConfig(value: unknown): AIConfigOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as AIConfigOverrides;
  const next: AIConfigOverrides = {};

  const keys: Array<keyof AIConfigOverrides> = [
    "idleMin",
    "idleMax",
    "observingMin",
    "observingMax",
    "focusingMin",
    "focusingMax",
    "playingMin",
    "playingMax",
    "dreamingMin",
    "dreamingMax",
    "idleToDreamProb",
    "idleToObserveProb",
    "idleToFocusProb",
  ];

  for (const key of keys) {
    const valueAtKey = raw[key];
    if (typeof valueAtKey === "number" && Number.isFinite(valueAtKey)) {
      next[key] = valueAtKey;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeSigilAffinities(
  value: unknown,
): Record<number, number> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<number, number> = {};

  for (const [rawKey, rawValue] of entries) {
    const key = Number(rawKey);
    if (!Number.isFinite(key) || !Number.isInteger(key)) continue;
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) continue;
    next[key] = rawValue;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeGuardianSaveData(value: unknown): GuardianSaveData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const now = Date.now();
  const raw = value as Partial<GuardianSaveData>;
  const createdAt = asFiniteNumber(raw.createdAt, now);
  const lastSaved = asFiniteNumber(raw.lastSaved, now);
  const dreamJournal = normalizeDreamJournal(raw.dreamJournal);
  const unlockedLore = normalizeTextList(raw.unlockedLore);
  const focusHistory = normalizeNumberList(raw.focusHistory);

  return {
    seedName: asText(raw.seedName, "AURALIA"),
    energy: clamp(asFiniteNumber(raw.energy, 50), 0, 100),
    curiosity: clamp(asFiniteNumber(raw.curiosity, 50), 0, 100),
    bond: clamp(asFiniteNumber(raw.bond, 50), 0, 100),
    health: clamp(asFiniteNumber(raw.health, 80), 0, 100),
    bondHistory: normalizeBondHistory(raw.bondHistory),
    activatedPoints: normalizeNumberList(raw.activatedPoints),
    createdAt,
    lastSaved,
    totalInteractions: asNonNegativeInt(raw.totalInteractions),
    dreamCount: asNonNegativeInt(raw.dreamCount),
    gamesWon: asNonNegativeInt(raw.gamesWon),
    highContrast: raw.highContrast === true,
    offspring: normalizeOffspring(raw.offspring),
    breedingPartner:
      typeof raw.breedingPartner === "string" ? raw.breedingPartner : undefined,
    dreamJournal: dreamJournal.length > 0 ? dreamJournal : undefined,
    unlockedLore: unlockedLore.length > 0 ? unlockedLore : undefined,
    accessibility: normalizeAccessibility(raw.accessibility),
    audioSettings: normalizeAudioSettings(raw.audioSettings),
    aiConfigOverrides: normalizeAIConfig(raw.aiConfigOverrides),
    sigilAffinities: normalizeSigilAffinities(raw.sigilAffinities),
    focusHistory: focusHistory.length > 0 ? focusHistory : undefined,
  };
}

function removeLegacyGuardianStateKeys(): boolean {
  let removed = false;

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed = true;
      }
    } catch {
      // no-op
    }
  }

  return removed;
}

interface GuardianStateCandidate {
  key: string;
  raw: string;
  state: GuardianSaveData;
}

function isGuardianSavePayload(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.seedName !== undefined ||
    payload.energy !== undefined ||
    payload.curiosity !== undefined ||
    payload.bond !== undefined ||
    payload.health !== undefined ||
    payload.lastSaved !== undefined ||
    payload.createdAt !== undefined
  );
}

function readGuardianStateCandidate(
  key: string,
): GuardianStateCandidate | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const decoded = JSON.parse(raw);
    if (!isGuardianSavePayload(decoded)) {
      return null;
    }

    const parsed = normalizeGuardianSaveData(decoded);
    if (!parsed) return null;

    return {
      key,
      raw,
      state: parsed,
    };
  } catch {
    return null;
  }
}

export function migrateGuardianStateStorage(): GuardianMigrationResult {
  if (!canUseLocalStorage()) {
    return {
      migrated: false,
      state: null,
    };
  }

  const candidates = [
    readGuardianStateCandidate(STORAGE_KEY),
    ...LEGACY_STORAGE_KEYS.map((key) => readGuardianStateCandidate(key)),
  ].filter((value): value is GuardianStateCandidate => value !== null);

  if (candidates.length === 0) {
    return {
      migrated: removeLegacyGuardianStateKeys(),
      state: null,
    };
  }

  const winner = candidates.reduce((best, candidate) =>
    candidate.state.lastSaved > best.state.lastSaved ? candidate : best,
  );

  let migrated = false;
  const canonicalSerialized = JSON.stringify(winner.state);
  const canonicalCandidate = candidates.find(
    (candidate) => candidate.key === STORAGE_KEY,
  );

  try {
    if (!canonicalCandidate || canonicalCandidate.raw !== canonicalSerialized) {
      localStorage.setItem(STORAGE_KEY, canonicalSerialized);
      migrated = true;
    }
  } catch (error) {
    console.error("Failed to save Guardian state migration:", error);
  }

  migrated = removeLegacyGuardianStateKeys() || migrated;

  return {
    migrated,
    state: winner.state,
  };
}

export function saveGuardianState(data: GuardianSaveData): void {
  if (!canUseLocalStorage()) return;

  const normalized = normalizeGuardianSaveData(data);
  if (!normalized) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    removeLegacyGuardianStateKeys();
  } catch (error) {
    console.error("Failed to save Guardian state:", error);
  }
}

export function loadGuardianState(): GuardianSaveData | null {
  const result = migrateGuardianStateStorage();
  return result.state;
}

export function clearGuardianState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    removeLegacyGuardianStateKeys();
  } catch (error) {
    console.error("Failed to clear Guardian state:", error);
  }
}

export function exportGuardianState(data: GuardianSaveData): string {
  return JSON.stringify(data, null, 2);
}

export function importGuardianState(json: string): GuardianSaveData | null {
  try {
    const data = normalizeGuardianSaveData(JSON.parse(json));

    if (!data || !isValidGuardianSaveData(data)) {
      throw new Error("Invalid Guardian state data");
    }

    return data;
  } catch (error) {
    console.error("Failed to import Guardian state:", error);
    return null;
  }
}

export function createSnapshot(data: GuardianSaveData): GuardianSaveData {
  return {
    ...data,
    lastSaved: Date.now(),
  };
}

export function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function isValidGuardianSaveData(data: GuardianSaveData): boolean {
  return (
    typeof data.seedName === "string" &&
    data.seedName.trim().length > 0 &&
    typeof data.energy === "number" &&
    typeof data.curiosity === "number" &&
    typeof data.bond === "number" &&
    typeof data.health === "number"
  );
}
