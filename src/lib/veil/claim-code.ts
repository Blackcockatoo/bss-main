const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 8;
const CHECKSUM_LENGTH = 2;

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function encodeTokenValue(value: number, length: number): string {
  let remaining = value;
  let encoded = '';

  for (let i = 0; i < length; i++) {
    encoded = TOKEN_ALPHABET[remaining % TOKEN_ALPHABET.length] + encoded;
    remaining = Math.floor(remaining / TOKEN_ALPHABET.length);
  }

  return encoded;
}

function computeChecksum(body: string): string {
  let hash = 0;

  for (const char of body) {
    const idx = TOKEN_ALPHABET.indexOf(char);
    hash = (hash * 33 + Math.max(idx, 0) + 1) % (TOKEN_ALPHABET.length ** CHECKSUM_LENGTH);
  }

  return encodeTokenValue(hash, CHECKSUM_LENGTH);
}

function formatCode(rawCode: string): string {
  return `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 10)}`;
}

export function generateClaimCode(): string {
  const random = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(random);

  const body = Array.from(random, value => TOKEN_ALPHABET[value % TOKEN_ALPHABET.length]).join('');
  const checksum = computeChecksum(body);

  return formatCode(`${body}${checksum}`);
}

export type ClaimCodeValidation =
  | { valid: true; normalized: string; formatted: string }
  | { valid: false; reason: 'malformed' | 'typo' };

export function validateClaimCode(input: string): ClaimCodeValidation {
  const normalized = normalize(input);

  if (normalized.length !== TOKEN_LENGTH + CHECKSUM_LENGTH) {
    return { valid: false, reason: 'malformed' };
  }

  const body = normalized.slice(0, TOKEN_LENGTH);
  const checksum = normalized.slice(TOKEN_LENGTH);

  if (![...normalized].every(char => TOKEN_ALPHABET.includes(char))) {
    return { valid: false, reason: 'malformed' };
  }

  if (computeChecksum(body) !== checksum) {
    return { valid: false, reason: 'typo' };
  }

  return {
    valid: true,
    normalized,
    formatted: formatCode(normalized),
  };
}

export function formatClaimCode(input: string): string {
  const normalized = normalize(input);
  if (normalized.length !== TOKEN_LENGTH + CHECKSUM_LENGTH) {
    return input;
  }

  return formatCode(normalized);
}
