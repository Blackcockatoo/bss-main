import { beforeEach, describe, expect, it } from "vitest";

import {
  ensureSharedPetState,
  getSharedPetCrestHash,
  getSharedPetState,
  markSharedPetPaired,
  migrateSharedPetStateStorage,
  syncSharedPetFromPetRoute,
} from "./shared-pet-state";

const GUARDIAN_STATE_KEY = "auralia_guardian_state";
const LEGACY_SHARED_STATE_KEY = "metapet-shared-pet-state";

describe("shared pet state", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a shared state from guardian snapshot", () => {
    window.localStorage.setItem(
      GUARDIAN_STATE_KEY,
      JSON.stringify({
        seedName: "Nova",
        createdAt: 123456,
        bond: 82,
      }),
    );

    const state = ensureSharedPetState();
    const reloaded = getSharedPetState();

    expect(state.identity.displayName).toBe("Nova");
    expect(state.identity.petId.startsWith("pet-")).toBe(true);
    expect(state.identity.crestHash).toHaveLength(64);
    expect(state.bond.score).toBe(82);
    expect(state.bond.band).toBe("high");
    expect(reloaded?.identity.petId).toBe(state.identity.petId);
  });

  it("syncs and clamps vitals from pet route updates", () => {
    window.localStorage.setItem(
      GUARDIAN_STATE_KEY,
      JSON.stringify({
        seedName: "Kiri",
        createdAt: 777,
        bond: 150,
      }),
    );

    const next = syncSharedPetFromPetRoute({
      hunger: -20,
      hygiene: 33,
      mood: 500,
      energy: 88,
      isSick: true,
      sicknessSeverity: 200,
      sicknessType: "hungry",
      deathCount: 3.9,
    });

    expect(next.vitals.hunger).toBe(0);
    expect(next.vitals.hygiene).toBe(33);
    expect(next.vitals.mood).toBe(100);
    expect(next.vitals.energy).toBe(88);
    expect(next.vitals.sicknessSeverity).toBe(100);
    expect(next.vitals.deathCount).toBe(3);
    expect(next.bond.score).toBe(100);
    expect(next.bond.band).toBe("high");
  });

  it("records pairing metadata", () => {
    ensureSharedPetState();

    const before = Date.now();
    const paired = markSharedPetPaired("hub-abc-123");

    expect(paired.pairing.lastMentorHubId).toBe("hub-abc-123");
    expect(paired.pairing.lastBondedAt).toBeGreaterThanOrEqual(before);
  });

  it("returns crest hash from shared source", () => {
    const crest = getSharedPetCrestHash();
    expect(crest).toHaveLength(64);
  });

  it("migrates shared state from legacy key without reset", () => {
    const legacyState = {
      identity: {
        petId: "pet-legacy",
        crestHash: "abc123".padEnd(64, "0"),
        displayName: "Legacy",
        createdAt: 99,
      },
      vitals: {
        hunger: 42,
        hygiene: 43,
        mood: 44,
        energy: 45,
        isSick: false,
        sicknessSeverity: 0,
        sicknessType: "none",
        deathCount: 0,
      },
      bond: {
        score: 88,
        band: "high",
        updatedAt: 123,
      },
      pairing: {
        lastMentorHubId: "hub-legacy",
        lastBondedAt: 321,
      },
      updatedAt: 999,
    };

    window.localStorage.setItem(
      LEGACY_SHARED_STATE_KEY,
      JSON.stringify(legacyState),
    );

    const migration = migrateSharedPetStateStorage();
    const migrated = getSharedPetState();

    expect(migration.migrated).toBe(true);
    expect(migrated?.identity.petId).toBe("pet-legacy");
    expect(migrated?.bond.score).toBe(88);
    expect(window.localStorage.getItem(LEGACY_SHARED_STATE_KEY)).toBeNull();
  });

  it("ignores malformed legacy payloads without clobbering canonical state", () => {
    const baseline = ensureSharedPetState();

    window.localStorage.setItem(
      LEGACY_SHARED_STATE_KEY,
      JSON.stringify({ foo: "bar" }),
    );

    const migration = migrateSharedPetStateStorage();
    const migrated = getSharedPetState();

    expect(migration.state?.identity.petId).toBe(baseline.identity.petId);
    expect(migrated?.identity.petId).toBe(baseline.identity.petId);
    expect(window.localStorage.getItem(LEGACY_SHARED_STATE_KEY)).toBeNull();
  });
});
