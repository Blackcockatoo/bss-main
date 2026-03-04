export type {
  GuardianSaveData,
  Offspring,
} from "@metapet/core/auralia/persistence";
export {
  STORAGE_KEY,
  saveGuardianState,
  loadGuardianState,
  migrateGuardianStateStorage,
  clearGuardianState,
  exportGuardianState,
  importGuardianState,
  createSnapshot,
  isLocalStorageAvailable,
} from "@metapet/core/auralia/persistence";
