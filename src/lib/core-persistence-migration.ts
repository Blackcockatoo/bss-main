import { migrateGuardianStateStorage } from "@/auralia/persistence";
import { migrateSharedPetStateStorage } from "@/lib/shared-pet-state";
import { migrateVeilRoleStorage } from "@/lib/veil/role-state";

export interface CorePersistenceMigrationResult {
  migrated: boolean;
  guardianMigrated: boolean;
  sharedPetMigrated: boolean;
  roleMigrated: boolean;
}

function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function runCorePersistenceMigration(): CorePersistenceMigrationResult {
  if (!canUseLocalStorage()) {
    return {
      migrated: false,
      guardianMigrated: false,
      sharedPetMigrated: false,
      roleMigrated: false,
    };
  }

  const guardian = migrateGuardianStateStorage();
  const sharedPet = migrateSharedPetStateStorage();
  const role = migrateVeilRoleStorage();

  const migrated = guardian.migrated || sharedPet.migrated || role.migrated;

  return {
    migrated,
    guardianMigrated: guardian.migrated,
    sharedPetMigrated: sharedPet.migrated,
    roleMigrated: role.migrated,
  };
}
