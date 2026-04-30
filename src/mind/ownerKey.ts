import type { Genome } from '../genome/types';

const OWNER_KEY_STORAGE = 'metapet.ownerKey';
const DNA_SIG_STORAGE = 'metapet.dnaSig';

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getCryptoApi(): Crypto | null {
  if (typeof globalThis === 'undefined') return null;
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c ?? null;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function generateOwnerKey(): string {
  const crypto = getCryptoApi();
  if (crypto && 'getRandomValues' in crypto) {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    return bytesToHex(buf);
  }
  // Fallback — non-cryptographic but deterministic enough for local-only use
  let s = '';
  for (let i = 0; i < 64; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

export function loadOwnerKey(): string | null {
  const storage = safeLocalStorage();
  if (!storage) return null;
  return storage.getItem(OWNER_KEY_STORAGE);
}

export function ensureOwnerKey(): string | null {
  const storage = safeLocalStorage();
  if (!storage) return null;
  let key = storage.getItem(OWNER_KEY_STORAGE);
  if (!key) {
    key = generateOwnerKey();
    storage.setItem(OWNER_KEY_STORAGE, key);
  }
  return key;
}

function genomeToString(genome: Genome): string {
  return [genome.red60, genome.blue60, genome.black60]
    .map(seq => seq.join(','))
    .join('|');
}

// Synchronous, dependency-free FNV-1a 64-bit hash, expressed as hex.
// Not cryptographic — sufficient for local tamper-detection of a small genome.
export function fnv1aHex(input: string): string {
  let h1 = 0x84222325 >>> 0;
  let h2 = 0xcbf29ce4 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h2 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function computeDnaSig(genome: Genome, ownerKey: string): string {
  return fnv1aHex(`${genomeToString(genome)}::${ownerKey}`);
}

export function loadDnaSig(): string | null {
  const storage = safeLocalStorage();
  if (!storage) return null;
  return storage.getItem(DNA_SIG_STORAGE);
}

export function ensureDnaSig(genome: Genome, ownerKey: string): string {
  const storage = safeLocalStorage();
  const sig = computeDnaSig(genome, ownerKey);
  if (storage) {
    const existing = storage.getItem(DNA_SIG_STORAGE);
    if (!existing) {
      storage.setItem(DNA_SIG_STORAGE, sig);
    }
    return storage.getItem(DNA_SIG_STORAGE) ?? sig;
  }
  return sig;
}

export function reattest(genome: Genome, ownerKey: string): string {
  const storage = safeLocalStorage();
  const sig = computeDnaSig(genome, ownerKey);
  if (storage) {
    storage.setItem(DNA_SIG_STORAGE, sig);
  }
  return sig;
}
