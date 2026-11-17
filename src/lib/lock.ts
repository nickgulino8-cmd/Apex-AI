"use client";
/**
 * App lock. A privacy screen for an on-device app: a PIN (PBKDF2-hashed) plus optional
 * Face ID / Touch ID / fingerprint via the platform authenticator (WebAuthn). Nothing leaves
 * the phone. Note: this keeps people out of the app UI; it doesn't encrypt browser storage.
 */
const KEY = "apex-lock";
export type LockConfig = { salt: string; hash: string; credId?: string; timeoutMin: number };

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export function getLock(): LockConfig | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as LockConfig) : null;
  } catch {
    return null;
  }
}
function save(c: LockConfig | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked */ }
}

async function pbkdf2(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 200_000 }, key, 256));
}

export async function setPin(pin: string, timeoutMin = 1) {
  const salt = rand(16);
  const prev = getLock();
  save({ salt: b64(salt), hash: await pbkdf2(pin, salt), credId: prev?.credId, timeoutMin: prev?.timeoutMin ?? timeoutMin });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const c = getLock();
  if (!c) return true;
  return (await pbkdf2(pin, unb64(c.salt))) === c.hash;
}

export function setTimeoutMin(timeoutMin: number) {
  const c = getLock();
  if (c) save({ ...c, timeoutMin });
}

export const disableLock = () => save(null);

export async function biometricAvailable(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Register a device-bound credential that requires Face ID / fingerprint to use. */
export async function enrollBiometric(): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: "APEX AI" },
      user: { id: rand(16), name: "apex-lock", displayName: "APEX app lock" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Biometric setup was cancelled.");
  const c = getLock();
  if (c) save({ ...c, credId: b64(cred.rawId) });
}

export function removeBiometric() {
  const c = getLock();
  if (c) save({ ...c, credId: undefined });
}

/** Ask the phone to verify the user. Resolves true only if user verification (UV) happened. */
export async function unlockBiometric(): Promise<boolean> {
  const c = getLock();
  if (!c?.credId) return false;
  const res = (await navigator.credentials.get({
    publicKey: { challenge: rand(32), allowCredentials: [{ type: "public-key", id: unb64(c.credId) }], userVerification: "required", timeout: 60_000 },
  })) as PublicKeyCredential | null;
  if (!res) return false;
  const auth = new Uint8Array((res.response as AuthenticatorAssertionResponse).authenticatorData);
  return (auth[32] & 0x04) !== 0; // UV flag
}
