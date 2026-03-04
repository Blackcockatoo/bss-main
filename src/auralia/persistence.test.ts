import { beforeEach, describe, expect, it } from "vitest";

import {
  STORAGE_KEY,
  loadGuardianState,
  migrateGuardianStateStorage,
} from "./persistence";

const LEGACY_GUARDIAN_STATE_KEY = "metapet_guardian_state";

describe("guardian persistence migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates a legacy guardian payload into canonical storage", () => {
    const payload = {
      seedName: "Legacy Guardian",
      energy: 62,
      curiosity: 58,
      bond: 71,
      health: 84,
      bondHistory: [],
      activatedPoints: [1, 2],
      createdAt: 10,
      lastSaved: 20,
      totalInteractions: 4,
      dreamCount: 1,
      gamesWon: 0,
      highContrast: false,
      offspring: [],
    };

    window.localStorage.setItem(
      LEGACY_GUARDIAN_STATE_KEY,
      JSON.stringify(payload),
    );

    const result = migrateGuardianStateStorage();

    expect(result.migrated).toBe(true);
    expect(result.state?.seedName).toBe("Legacy Guardian");
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(LEGACY_GUARDIAN_STATE_KEY)).toBeNull();
  });

  it("normalizes and deduplicates canonical guardian data", () => {
    const payload = {
      seedName: "Keeper",
      energy: 120,
      curiosity: -4,
      bond: 55,
      health: 101,
      bondHistory: [
        { timestamp: 1, bond: 40, event: "play" },
        { timestamp: 1, bond: 40, event: "play" },
      ],
      activatedPoints: [2, 2, 3],
      createdAt: 100,
      lastSaved: 200,
      totalInteractions: 8,
      dreamCount: 2,
      gamesWon: 1,
      highContrast: false,
      offspring: [],
      unlockedLore: ["alpha", "alpha", "beta"],
      focusHistory: [5, 5, 7],
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const loaded = loadGuardianState();

    expect(loaded?.energy).toBe(100);
    expect(loaded?.curiosity).toBe(0);
    expect(loaded?.health).toBe(100);
    expect(loaded?.activatedPoints).toEqual([2, 3]);
    expect(loaded?.bondHistory).toHaveLength(1);
    expect(loaded?.unlockedLore).toEqual(["alpha", "beta"]);
    expect(loaded?.focusHistory).toEqual([5, 7]);
  });

  it("ignores malformed legacy payloads without clobbering canonical data", () => {
    const canonical = {
      seedName: "Canonical",
      energy: 64,
      curiosity: 66,
      bond: 68,
      health: 70,
      bondHistory: [],
      activatedPoints: [1],
      createdAt: 10,
      lastSaved: 20,
      totalInteractions: 1,
      dreamCount: 0,
      gamesWon: 0,
      highContrast: false,
      offspring: [],
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
    window.localStorage.setItem(
      LEGACY_GUARDIAN_STATE_KEY,
      JSON.stringify({ foo: "bar" }),
    );

    const loaded = loadGuardianState();

    expect(loaded?.seedName).toBe("Canonical");
    expect(window.localStorage.getItem(LEGACY_GUARDIAN_STATE_KEY)).toBeNull();
  });
});
