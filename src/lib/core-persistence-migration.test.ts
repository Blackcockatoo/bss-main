import { beforeEach, describe, expect, it } from "vitest";

import { runCorePersistenceMigration } from "./core-persistence-migration";

const GUARDIAN_KEY = "auralia_guardian_state";
const LEGACY_GUARDIAN_KEY = "metapet_guardian_state";
const SHARED_PET_KEY = "metapet-shared-pet-state-v1";
const LEGACY_SHARED_PET_KEY = "metapet-shared-pet-state";
const ROLE_KEY = "veil-role";
const LEGACY_ROLE_KEY = "metapet-veil-role";

describe("core persistence migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates all known legacy local-storage keys", () => {
    window.localStorage.setItem(
      LEGACY_GUARDIAN_KEY,
      JSON.stringify({
        seedName: "Legacy Guardian",
        energy: 60,
        curiosity: 55,
        bond: 65,
        health: 75,
        bondHistory: [],
        activatedPoints: [],
        createdAt: 1,
        lastSaved: 2,
        totalInteractions: 0,
        dreamCount: 0,
        gamesWon: 0,
        highContrast: false,
        offspring: [],
      }),
    );

    window.localStorage.setItem(
      LEGACY_SHARED_PET_KEY,
      JSON.stringify({
        identity: {
          petId: "pet-legacy",
          crestHash: "123".padEnd(64, "0"),
          displayName: "Legacy",
          createdAt: 10,
        },
        vitals: {
          hunger: 10,
          hygiene: 20,
          mood: 30,
          energy: 40,
          isSick: false,
          sicknessSeverity: 0,
          sicknessType: "none",
          deathCount: 0,
        },
        bond: {
          score: 52,
          band: "medium",
          updatedAt: 3,
        },
        pairing: {
          lastMentorHubId: null,
          lastBondedAt: null,
        },
        updatedAt: 3,
      }),
    );

    window.localStorage.setItem(LEGACY_ROLE_KEY, "kid");

    const result = runCorePersistenceMigration();

    expect(result.migrated).toBe(true);
    expect(result.guardianMigrated).toBe(true);
    expect(result.sharedPetMigrated).toBe(true);
    expect(result.roleMigrated).toBe(true);

    expect(window.localStorage.getItem(GUARDIAN_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(SHARED_PET_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(ROLE_KEY)).toBe("kid");

    expect(window.localStorage.getItem(LEGACY_GUARDIAN_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_SHARED_PET_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_ROLE_KEY)).toBeNull();
  });
});
