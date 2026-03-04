import { KID_SIGNATURE_SCHEME } from './signatures';

const KID_PUBLIC_KEY_KEY = 'veil-kid-public-key';
const KID_PRIVATE_KEY_KEY = 'veil-kid-private-key';

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

async function generateKidKeypair(): Promise<void> {
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKey = await crypto.subtle.exportKey('spki', keypair.publicKey);
  const privateKey = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);

  localStorage.setItem(KID_PUBLIC_KEY_KEY, bufferToBase64(publicKey));
  localStorage.setItem(KID_PRIVATE_KEY_KEY, bufferToBase64(privateKey));
}

async function getKidPrivateKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') {
    throw new Error('Kid keys unavailable outside browser runtime');
  }

  if (!localStorage.getItem(KID_PUBLIC_KEY_KEY) || !localStorage.getItem(KID_PRIVATE_KEY_KEY)) {
    await generateKidKeypair();
  }

  const privateKeyB64 = localStorage.getItem(KID_PRIVATE_KEY_KEY);
  if (!privateKeyB64) {
    throw new Error('Kid private key missing');
  }

  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(privateKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

export async function getKidPublicKey(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Kid keys unavailable outside browser runtime');
  }

  if (!localStorage.getItem(KID_PUBLIC_KEY_KEY) || !localStorage.getItem(KID_PRIVATE_KEY_KEY)) {
    await generateKidKeypair();
  }

  const publicKey = localStorage.getItem(KID_PUBLIC_KEY_KEY);
  if (!publicKey) {
    throw new Error('Kid public key missing');
  }

  return publicKey;
}

export async function signAsKid(payload: string): Promise<{ signature: string; kidPubKey: string; signatureScheme: typeof KID_SIGNATURE_SCHEME }> {
  const privateKey = await getKidPrivateKey();
  const kidPubKey = await getKidPublicKey();

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(payload)
  );

  return {
    signature: bufferToBase64(signature),
    kidPubKey,
    signatureScheme: KID_SIGNATURE_SCHEME,
  };
}
