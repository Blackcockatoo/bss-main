/**
 * Teacher Vault - Cryptographic Identity for The Veil
 *
 * Generates and manages ECDSA P-256 keypair for signing blessings.
 * Keys are stored locally and optionally protected by passcode.
 */

import type {
  TeacherVault,
  TeacherVaultStore,
  VaultBackupMetadata,
  VaultBackupPayload,
} from "./types";
import { VEIL_STORAGE_KEYS, asHubId } from "./types";

// ============================================================================
// Utility Functions
// ============================================================================

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data),
  );
  return bufferToHex(hashBuffer);
}

function generateId(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

// ============================================================================
// Storage
// ============================================================================

function getVaultStore(): TeacherVaultStore {
  if (typeof window === "undefined") {
    return { vault: null, privateKeyEncrypted: null, isEncrypted: false };
  }

  try {
    const stored = localStorage.getItem(VEIL_STORAGE_KEYS.TEACHER_VAULT);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn("[Veil] Failed to load vault store");
  }

  return { vault: null, privateKeyEncrypted: null, isEncrypted: false };
}

function saveVaultStore(store: TeacherVaultStore): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      VEIL_STORAGE_KEYS.TEACHER_VAULT,
      JSON.stringify(store),
    );
  } catch (error) {
    console.warn("[Veil] Failed to save vault store:", error);
  }
}

// ============================================================================
// Key Derivation for Passcode Protection
// ============================================================================

async function deriveKeyFromPasscode(
  passcode: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function deriveBackupKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBackupMetadataAAD(
  metadata: VaultBackupMetadata,
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  return encoder.encode(
    `${metadata.version}:${metadata.createdAt}:${metadata.keyId}`,
  );
}

function normalizeVault(vault: TeacherVault): TeacherVault {
  return {
    publicKey: vault.publicKey,
    hubId: vault.hubId,
    mentorPetSeed: vault.mentorPetSeed,
    createdAt: vault.createdAt,
  };
}

function keyIdFromPublicKey(publicKeyB64: string): Promise<string> {
  return sha256(publicKeyB64);
}

async function encryptPrivateKey(
  privateKeyB64: string,
  passcode: string,
): Promise<{ encrypted: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPasscode(passcode, salt);

  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(privateKeyB64),
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(
    iv.length + new Uint8Array(ciphertext).length,
  );
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return {
    encrypted: bufferToBase64(combined.buffer),
    salt: bufferToBase64(salt.buffer),
  };
}

async function decryptPrivateKey(
  encryptedB64: string,
  salt: string,
  passcode: string,
): Promise<string> {
  const saltBuffer = new Uint8Array(base64ToBuffer(salt));
  const combined = new Uint8Array(base64ToBuffer(encryptedB64));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await deriveKeyFromPasscode(passcode, saltBuffer);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

// ============================================================================
// Vault Operations
// ============================================================================

/**
 * Check if a teacher vault exists
 */
export function hasVault(): boolean {
  const store = getVaultStore();
  return store.vault !== null;
}

/**
 * Check if the vault is protected by passcode
 */
export function isVaultLocked(): boolean {
  const store = getVaultStore();
  return store.isEncrypted;
}

/**
 * Get the teacher vault (public info only)
 */
export function getVault(): TeacherVault | null {
  const store = getVaultStore();
  return store.vault;
}

/**
 * Create a new teacher vault
 */
export async function createVault(passcode?: string): Promise<TeacherVault> {
  // Generate ECDSA P-256 keypair
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  // Export keys
  const publicKeyExport = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey,
  );
  const privateKeyExport = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );

  const publicKeyB64 = bufferToBase64(publicKeyExport);
  const privateKeyB64 = bufferToBase64(privateKeyExport);

  // Derive hub ID and mentor pet seed from public key
  const hubId = asHubId(`hub-${generateId(12)}`);
  const mentorPetSeed = await sha256(publicKeyB64);

  const vault: TeacherVault = {
    publicKey: publicKeyB64,
    hubId,
    mentorPetSeed,
    createdAt: Date.now(),
  };

  const store: TeacherVaultStore = {
    vault,
    privateKeyEncrypted: null,
    isEncrypted: false,
  };

  // Handle passcode protection
  if (passcode) {
    const passcodeHash = await sha256(passcode + hubId);
    const { encrypted, salt } = await encryptPrivateKey(
      privateKeyB64,
      passcode,
    );

    vault.passcodeHash = passcodeHash;
    vault.passcodeSalt = salt;
    store.privateKeyEncrypted = encrypted;
    store.isEncrypted = true;
  } else {
    store.privateKeyEncrypted = privateKeyB64;
    store.isEncrypted = false;
  }

  saveVaultStore(store);

  return vault;
}

/**
 * Unlock the vault with passcode
 */
export async function unlockVault(passcode: string): Promise<boolean> {
  const store = getVaultStore();

  if (!store.vault || !store.isEncrypted) {
    return false;
  }

  // Verify passcode
  const expectedHash = store.vault.passcodeHash;
  const actualHash = await sha256(passcode + store.vault.hubId);

  if (actualHash !== expectedHash) {
    return false;
  }

  return true;
}

/**
 * Get the private key for signing (requires passcode if encrypted)
 */
export async function getPrivateKey(
  passcode?: string,
): Promise<CryptoKey | null> {
  const store = getVaultStore();

  if (!store.vault || !store.privateKeyEncrypted) {
    return null;
  }

  let privateKeyB64: string;

  if (store.isEncrypted) {
    if (!passcode || !store.vault.passcodeSalt) {
      throw new Error("Passcode required to unlock vault");
    }

    // Verify passcode first
    const isValid = await unlockVault(passcode);
    if (!isValid) {
      throw new Error("Invalid passcode");
    }

    privateKeyB64 = await decryptPrivateKey(
      store.privateKeyEncrypted,
      store.vault.passcodeSalt,
      passcode,
    );
  } else {
    privateKeyB64 = store.privateKeyEncrypted;
  }

  // Import private key
  const privateKeyBuffer = base64ToBuffer(privateKeyB64);
  return await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/**
 * Import public key for verification
 */
export async function importPublicKey(
  publicKeyB64: string,
): Promise<CryptoKey> {
  const publicKeyBuffer = base64ToBuffer(publicKeyB64);
  return await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
}

/**
 * Sign data with the teacher's private key
 */
export async function signData(
  data: string,
  passcode?: string,
): Promise<string> {
  const privateKey = await getPrivateKey(passcode);

  if (!privateKey) {
    throw new Error("No private key available");
  }

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    encoder.encode(data),
  );

  return bufferToBase64(signature);
}

/**
 * Verify a signature against a public key
 */
export async function verifySignature(
  data: string,
  signatureB64: string,
  publicKeyB64: string,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyB64);
    const encoder = new TextEncoder();
    const signatureBuffer = base64ToBuffer(signatureB64);

    return await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      signatureBuffer,
      encoder.encode(data),
    );
  } catch (error) {
    console.error("[Veil] Signature verification failed:", error);
    return false;
  }
}

/**
 * Delete the vault (destructive)
 */
export function deleteVault(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VEIL_STORAGE_KEYS.TEACHER_VAULT);
  localStorage.removeItem(VEIL_STORAGE_KEYS.MENTOR_PET);
}

/**
 * Change the vault passcode
 */
export async function changePasscode(
  currentPasscode: string | null,
  newPasscode: string | null,
): Promise<boolean> {
  const store = getVaultStore();

  if (!store.vault || !store.privateKeyEncrypted) {
    return false;
  }

  // Get current private key
  let privateKeyB64: string;

  if (store.isEncrypted) {
    if (!currentPasscode || !store.vault.passcodeSalt) {
      return false;
    }

    const isValid = await unlockVault(currentPasscode);
    if (!isValid) {
      return false;
    }

    privateKeyB64 = await decryptPrivateKey(
      store.privateKeyEncrypted,
      store.vault.passcodeSalt,
      currentPasscode,
    );
  } else {
    privateKeyB64 = store.privateKeyEncrypted;
  }

  // Re-encrypt with new passcode (or store plainly if no new passcode)
  if (newPasscode) {
    const passcodeHash = await sha256(newPasscode + store.vault.hubId);
    const { encrypted, salt } = await encryptPrivateKey(
      privateKeyB64,
      newPasscode,
    );

    store.vault.passcodeHash = passcodeHash;
    store.vault.passcodeSalt = salt;
    store.privateKeyEncrypted = encrypted;
    store.isEncrypted = true;
  } else {
    delete store.vault.passcodeHash;
    delete store.vault.passcodeSalt;
    store.privateKeyEncrypted = privateKeyB64;
    store.isEncrypted = false;
  }

  saveVaultStore(store);
  return true;
}

/**
 * Export vault for backup (does not include private key)
 */
export function exportVaultInfo(): {
  vault: TeacherVault;
  hubId: string;
} | null {
  const store = getVaultStore();
  if (!store.vault) return null;

  return {
    vault: store.vault,
    hubId: store.vault.hubId,
  };
}

/**
 * Export encrypted backup package for vault private key material.
 */
export async function exportVaultBackup(
  backupPassphrase: string,
  vaultPasscode?: string,
): Promise<VaultBackupPayload> {
  const store = getVaultStore();

  if (!store.vault || !store.privateKeyEncrypted) {
    throw new Error("No vault available to back up");
  }

  const trimmedPassphrase = backupPassphrase.trim();
  if (trimmedPassphrase.length < 8) {
    throw new Error("Backup passphrase must be at least 8 characters");
  }

  const privateKey = await getPrivateKey(vaultPasscode);
  if (!privateKey) {
    throw new Error("Unable to read private key for backup");
  }

  const privateKeyExport = await crypto.subtle.exportKey("pkcs8", privateKey);
  const privateKeyB64 = bufferToBase64(privateKeyExport);

  const metadata: VaultBackupMetadata = {
    version: "veil-vault-backup-v1",
    createdAt: Date.now(),
    keyId: await keyIdFromPublicKey(store.vault.publicKey),
  };

  const payloadToEncrypt = JSON.stringify({
    vault: normalizeVault(store.vault),
    privateKey: privateKeyB64,
  });

  const iterations = 210000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = toBackupMetadataAAD(metadata);
  const key = await deriveBackupKey(trimmedPassphrase, salt, iterations);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad,
    },
    key,
    new TextEncoder().encode(payloadToEncrypt),
  );

  return {
    metadata,
    kdf: {
      salt: bufferToBase64(salt.buffer),
      iterations,
      hash: "SHA-256",
    },
    encryption: {
      algorithm: "AES-GCM",
      iv: bufferToBase64(iv.buffer),
      ciphertext: bufferToBase64(ciphertext),
    },
  };
}

/**
 * Restore an encrypted vault backup package.
 */
export async function restoreVaultBackup(
  backup: VaultBackupPayload | string,
  backupPassphrase: string,
  options?: { allowOverwrite?: boolean },
): Promise<{ restored: TeacherVault; replacedExisting: boolean }> {
  const parsed =
    typeof backup === "string"
      ? (JSON.parse(backup) as VaultBackupPayload)
      : backup;
  const allowOverwrite = options?.allowOverwrite ?? false;
  const existing = getVaultStore();

  if (existing.vault && !allowOverwrite) {
    throw new Error(
      "Existing vault detected; explicit consent is required to replace keys",
    );
  }

  if (parsed.metadata?.version !== "veil-vault-backup-v1") {
    throw new Error("Unsupported backup format version");
  }

  if (
    parsed.encryption?.algorithm !== "AES-GCM" ||
    parsed.kdf?.hash !== "SHA-256"
  ) {
    throw new Error("Unsupported backup cryptography parameters");
  }

  const salt = new Uint8Array(base64ToBuffer(parsed.kdf.salt));
  const iv = new Uint8Array(base64ToBuffer(parsed.encryption.iv));
  const aad = toBackupMetadataAAD(parsed.metadata);
  const key = await deriveBackupKey(
    backupPassphrase.trim(),
    salt,
    parsed.kdf.iterations,
  );

  let decryptedPayload: string;
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: aad,
      },
      key,
      base64ToBuffer(parsed.encryption.ciphertext),
    );
    decryptedPayload = new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Backup integrity check failed or passphrase is incorrect");
  }

  const decoded = JSON.parse(decryptedPayload) as {
    vault: TeacherVault;
    privateKey: string;
  };
  if (!decoded?.vault || !decoded.privateKey) {
    throw new Error("Backup payload is missing required key material");
  }

  const vault = normalizeVault(decoded.vault);
  const expectedKeyId = await keyIdFromPublicKey(vault.publicKey);
  if (expectedKeyId !== parsed.metadata.keyId) {
    throw new Error("Backup metadata key identifier mismatch");
  }

  let privateKey: CryptoKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      base64ToBuffer(decoded.privateKey),
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"],
    );
  } catch {
    throw new Error("Backup private key is invalid");
  }

  const importedPublic = await crypto.subtle.exportKey(
    "spki",
    await crypto.subtle.importKey(
      "spki",
      base64ToBuffer(vault.publicKey),
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    ),
  );

  const privateAsJwk = await crypto.subtle.exportKey("jwk", privateKey);
  const derivedPublic = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: privateAsJwk.x,
      y: privateAsJwk.y,
      ext: true,
      key_ops: ["verify"],
    },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  const derivedPublicSpki = await crypto.subtle.exportKey(
    "spki",
    derivedPublic,
  );

  if (bufferToBase64(importedPublic) !== bufferToBase64(derivedPublicSpki)) {
    throw new Error("Backup private key does not match vault public key");
  }

  const replacedExisting = Boolean(existing.vault);
  const nextStore: TeacherVaultStore = {
    vault,
    privateKeyEncrypted: decoded.privateKey,
    isEncrypted: false,
  };
  saveVaultStore(nextStore);

  return {
    restored: vault,
    replacedExisting,
  };
}
