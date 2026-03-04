import { VEIL_STORAGE_KEYS, type TeacherVault } from './types';

const BACKUP_VERSION = 1;
const BACKUP_META_KEY = 'veil-backup-meta';
const INDEXED_DB_NAME = 'veil-backup-store';
const INDEXED_DB_STORE = 'bundles';
const INDEXED_DB_KEY = 'latest-encrypted-bundle';

const BACKUP_STORAGE_KEYS = [
  VEIL_STORAGE_KEYS.TEACHER_VAULT,
  VEIL_STORAGE_KEYS.MENTOR_PET,
  VEIL_STORAGE_KEYS.BOND_MARKS,
  'veil-redeemed-blessings',
  'veil-care-capsules',
] as const;

type BackupStorageKey = (typeof BACKUP_STORAGE_KEYS)[number];

export interface VaultBackupBundle {
  type: 'veil-vault-backup';
  version: number;
  createdAt: number;
  storage: Partial<Record<BackupStorageKey, string>>;
  integrity: string;
}

interface BackupMeta {
  lastBackupAt?: number;
  lastRecoveryDrillAt?: number;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
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
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return bufferToHex(hash);
}

function getMeta(): BackupMeta {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BackupMeta;
  } catch {
    return {};
  }
}

function saveMeta(meta: BackupMeta): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

function canonicalStorage(storage: Partial<Record<BackupStorageKey, string>>): Partial<Record<BackupStorageKey, string>> {
  const sorted = [...Object.keys(storage)].sort();
  const canonical: Partial<Record<BackupStorageKey, string>> = {};

  for (const key of sorted) {
    const value = storage[key as BackupStorageKey];
    if (typeof value === 'string') {
      canonical[key as BackupStorageKey] = value;
    }
  }

  return canonical;
}

async function computeIntegrity(createdAt: number, storage: Partial<Record<BackupStorageKey, string>>): Promise<string> {
  return sha256(
    JSON.stringify({
      type: 'veil-vault-backup',
      version: BACKUP_VERSION,
      createdAt,
      storage: canonicalStorage(storage),
    })
  );
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function getLastBackupAt(): number | null {
  return getMeta().lastBackupAt ?? null;
}

export function getLastRecoveryDrillAt(): number | null {
  return getMeta().lastRecoveryDrillAt ?? null;
}

export function markRecoveryDrillCompleted(): void {
  const meta = getMeta();
  meta.lastRecoveryDrillAt = Date.now();
  saveMeta(meta);
}

export async function createBackupBundle(): Promise<VaultBackupBundle> {
  if (typeof window === 'undefined') {
    throw new Error('Backup export is only available in browser');
  }

  const storage: Partial<Record<BackupStorageKey, string>> = {};

  for (const key of BACKUP_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      storage[key] = value;
    }
  }

  const createdAt = Date.now();
  const integrity = await computeIntegrity(createdAt, storage);

  const bundle: VaultBackupBundle = {
    type: 'veil-vault-backup',
    version: BACKUP_VERSION,
    createdAt,
    storage: canonicalStorage(storage),
    integrity,
  };

  const meta = getMeta();
  meta.lastBackupAt = createdAt;
  saveMeta(meta);

  return bundle;
}

export async function createEncryptedBackupBlob(bundle: VaultBackupBundle, passphrase: string): Promise<string> {
  if (!passphrase.trim()) {
    throw new Error('Passphrase is required for encrypted export');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return JSON.stringify({
    type: 'veil-vault-backup-encrypted',
    version: BACKUP_VERSION,
    encryptedAt: Date.now(),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
  });
}

async function decodeBundlePayload(payload: string, passphrase?: string): Promise<VaultBackupBundle> {
  const parsed = JSON.parse(payload) as Record<string, string | number>;

  if (parsed.type === 'veil-vault-backup') {
    return parsed as unknown as VaultBackupBundle;
  }

  if (parsed.type !== 'veil-vault-backup-encrypted') {
    throw new Error('Invalid backup payload type');
  }

  if (!passphrase) {
    throw new Error('Passphrase required to import encrypted backup');
  }

  const salt = new Uint8Array(base64ToBuffer(String(parsed.salt)));
  const iv = new Uint8Array(base64ToBuffer(String(parsed.iv)));
  const ciphertext = base64ToBuffer(String(parsed.ciphertext));
  const key = await deriveKey(passphrase, salt);

  let plaintext: ArrayBuffer;

  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('Failed to decrypt backup (invalid passphrase or corrupted payload)');
  }

  return JSON.parse(new TextDecoder().decode(plaintext)) as VaultBackupBundle;
}

function hasExistingVault(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(VEIL_STORAGE_KEYS.TEACHER_VAULT) !== null;
}

export async function restoreFromBackupPayload(
  payload: string,
  options: { passphrase?: string; overwriteConfirmed: boolean }
): Promise<{ restored: boolean; hubId?: string }> {
  if (typeof window === 'undefined') {
    throw new Error('Restore is only available in browser');
  }

  const bundle = await decodeBundlePayload(payload, options.passphrase);

  if (bundle.type !== 'veil-vault-backup' || bundle.version !== BACKUP_VERSION) {
    throw new Error('Unsupported backup version');
  }

  const expectedIntegrity = await computeIntegrity(bundle.createdAt, bundle.storage);
  if (expectedIntegrity !== bundle.integrity) {
    throw new Error('Backup integrity check failed');
  }

  if (hasExistingVault() && !options.overwriteConfirmed) {
    throw new Error('Overwrite confirmation required before restore');
  }

  for (const key of BACKUP_STORAGE_KEYS) {
    const value = bundle.storage[key];
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }

  const parsedVault = bundle.storage[VEIL_STORAGE_KEYS.TEACHER_VAULT];
  let hubId: string | undefined;

  if (parsedVault) {
    try {
      const store = JSON.parse(parsedVault) as { vault?: TeacherVault };
      hubId = store.vault?.hubId;
    } catch {
      hubId = undefined;
    }
  }

  return { restored: true, hubId };
}

function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);

    request.onerror = () => reject(new Error('Failed to open IndexedDB backup store'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE);
      }
    };
  });
}

export async function persistEncryptedBackupToIndexedDB(encryptedPayload: string): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error('IndexedDB is unavailable in this environment');
  }

  const db = await openBackupDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_STORE);

    tx.onerror = () => reject(new Error('Failed to persist encrypted backup to IndexedDB'));
    tx.oncomplete = () => resolve();

    store.put(
      {
        payload: encryptedPayload,
        storedAt: Date.now(),
      },
      INDEXED_DB_KEY
    );
  });

  db.close();
}

export async function loadEncryptedBackupFromIndexedDB(): Promise<string | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  const db = await openBackupDb();

  const result = await new Promise<{ payload?: string } | undefined>((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
    const store = tx.objectStore(INDEXED_DB_STORE);
    const request = store.get(INDEXED_DB_KEY);

    request.onerror = () => reject(new Error('Failed to read encrypted backup from IndexedDB'));
    request.onsuccess = () => resolve(request.result as { payload?: string } | undefined);
  });

  db.close();
  return result?.payload ?? null;
}
