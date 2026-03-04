export type VeilRole = "teacher" | "kid";

export const VEIL_ROLE_STORAGE_KEY = "veil-role";
export const VEIL_ROLE_QUERY_KEY = "as";
const LEGACY_VEIL_ROLE_STORAGE_KEYS = ["metapet-veil-role"] as const;

export interface ResolveVeilRoleInput {
  requiredRole: VeilRole;
  queryRole: VeilRole | null;
  storedRole: VeilRole | null;
}

export interface ResolveVeilRoleResult {
  currentRole: VeilRole;
  shouldPersistRole: VeilRole | null;
}

function parseVeilRole(value: unknown): VeilRole | null {
  return value === "teacher" || value === "kid" ? value : null;
}

function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function readRoleForStorageKey(key: string): VeilRole | null {
  if (!canUseLocalStorage()) return null;

  try {
    return parseVeilRole(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

interface RoleMigrationResult {
  migrated: boolean;
  role: VeilRole | null;
}

function clearLegacyRoleKeys(): boolean {
  let removed = false;

  for (const key of LEGACY_VEIL_ROLE_STORAGE_KEYS) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removed = true;
      }
    } catch {
      // Ignore storage access failures and keep best effort behavior.
    }
  }

  return removed;
}

export function migrateVeilRoleStorage(): RoleMigrationResult {
  if (!canUseLocalStorage()) {
    return { migrated: false, role: null };
  }

  let migrated = false;

  let canonicalRaw: string | null = null;
  try {
    canonicalRaw = window.localStorage.getItem(VEIL_ROLE_STORAGE_KEY);
  } catch {
    canonicalRaw = null;
  }

  const canonicalRole = parseVeilRole(canonicalRaw);

  if (canonicalRole) {
    migrated = clearLegacyRoleKeys() || migrated;
    return { migrated, role: canonicalRole };
  }

  for (const key of LEGACY_VEIL_ROLE_STORAGE_KEYS) {
    try {
      const legacyRaw = window.localStorage.getItem(key);
      const legacyRole = parseVeilRole(legacyRaw);
      if (!legacyRole) {
        continue;
      }

      window.localStorage.setItem(VEIL_ROLE_STORAGE_KEY, legacyRole);
      window.localStorage.removeItem(key);
      clearLegacyRoleKeys();
      return { migrated: true, role: legacyRole };
    } catch {
      // Keep scanning legacy keys.
    }
  }

  return { migrated, role: null };
}

export function getVeilRoleFromSearch(search: string): VeilRole | null {
  const params = new URLSearchParams(search);
  return parseVeilRole(params.get(VEIL_ROLE_QUERY_KEY));
}

export function getStoredVeilRole(): VeilRole | null {
  const canonical = readRoleForStorageKey(VEIL_ROLE_STORAGE_KEY);
  if (canonical) {
    return canonical;
  }

  for (const key of LEGACY_VEIL_ROLE_STORAGE_KEYS) {
    const legacy = readRoleForStorageKey(key);
    if (legacy) {
      return legacy;
    }
  }

  return null;
}

export function setStoredVeilRole(role: VeilRole): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(VEIL_ROLE_STORAGE_KEY, role);
    clearLegacyRoleKeys();
  } catch {
    // no-op; role can still be carried via query parameter
  }
}

export function resolveVeilRole({
  requiredRole,
  queryRole,
  storedRole,
}: ResolveVeilRoleInput): ResolveVeilRoleResult {
  const currentRole = queryRole ?? storedRole ?? requiredRole;
  const shouldPersistRole = queryRole ?? (storedRole ? null : requiredRole);
  return {
    currentRole,
    shouldPersistRole,
  };
}

export function getVeilRoleSwitchPath(role: VeilRole): string {
  return role === "kid" ? "/veil/kid" : "/veil";
}

export function getVeilRoleSwitchHref(role: VeilRole): string {
  const params = new URLSearchParams();
  params.set(VEIL_ROLE_QUERY_KEY, role);
  return `${getVeilRoleSwitchPath(role)}?${params.toString()}`;
}
