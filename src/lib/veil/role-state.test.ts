import { beforeEach, describe, expect, it } from "vitest";

import {
  VEIL_ROLE_STORAGE_KEY,
  getStoredVeilRole,
  getVeilRoleFromSearch,
  getVeilRoleSwitchHref,
  getVeilRoleSwitchPath,
  migrateVeilRoleStorage,
  resolveVeilRole,
  setStoredVeilRole,
} from "./role-state";

const LEGACY_ROLE_KEY = "metapet-veil-role";

describe("veil role state contract", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parses role from query string", () => {
    expect(getVeilRoleFromSearch("?as=teacher")).toBe("teacher");
    expect(getVeilRoleFromSearch("?foo=1&as=kid")).toBe("kid");
    expect(getVeilRoleFromSearch("?as=student")).toBeNull();
  });

  it("prioritizes query role and persists query-driven switch", () => {
    const resolved = resolveVeilRole({
      requiredRole: "teacher",
      queryRole: "kid",
      storedRole: "teacher",
    });

    expect(resolved.currentRole).toBe("kid");
    expect(resolved.shouldPersistRole).toBe("kid");
  });

  it("uses stored role when query is absent", () => {
    const resolved = resolveVeilRole({
      requiredRole: "teacher",
      queryRole: null,
      storedRole: "kid",
    });

    expect(resolved.currentRole).toBe("kid");
    expect(resolved.shouldPersistRole).toBeNull();
  });

  it("falls back to required role when neither query nor storage exists", () => {
    const resolved = resolveVeilRole({
      requiredRole: "kid",
      queryRole: null,
      storedRole: null,
    });

    expect(resolved.currentRole).toBe("kid");
    expect(resolved.shouldPersistRole).toBe("kid");
  });

  it("reads and writes storage safely", () => {
    expect(getStoredVeilRole()).toBeNull();

    setStoredVeilRole("teacher");
    expect(getStoredVeilRole()).toBe("teacher");

    window.localStorage.setItem(VEIL_ROLE_STORAGE_KEY, "not-a-role");
    expect(getStoredVeilRole()).toBeNull();
  });

  it("migrates from legacy role key without duplication", () => {
    window.localStorage.setItem(LEGACY_ROLE_KEY, "kid");

    const result = migrateVeilRoleStorage();

    expect(result.migrated).toBe(true);
    expect(result.role).toBe("kid");
    expect(window.localStorage.getItem(VEIL_ROLE_STORAGE_KEY)).toBe("kid");
    expect(window.localStorage.getItem(LEGACY_ROLE_KEY)).toBeNull();
  });

  it("builds canonical role-switch links", () => {
    expect(getVeilRoleSwitchPath("teacher")).toBe("/veil");
    expect(getVeilRoleSwitchPath("kid")).toBe("/veil/kid");
    expect(getVeilRoleSwitchHref("teacher")).toBe("/veil?as=teacher");
    expect(getVeilRoleSwitchHref("kid")).toBe("/veil/kid?as=kid");
  });
});
