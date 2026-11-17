import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { DATA_DIR } from "./db";

/**
 * Private photo storage. Files live outside /public, are named with random UUIDs,
 * and are encrypted at rest with AES-256-GCM. They are only ever served through an
 * authenticated route that checks ownership.
 */
const PHOTO_DIR = path.join(DATA_DIR, "photos");

function key(): Buffer {
  const k = process.env.APEX_ENCRYPTION_KEY;
  if (k && /^[0-9a-f]{64}$/i.test(k)) return Buffer.from(k, "hex");
  if (process.env.NODE_ENV === "production") throw new Error("APEX_ENCRYPTION_KEY must be set (64 hex chars) in production");
  // Development fallback: a key generated once and kept beside the data.
  const f = path.join(DATA_DIR, ".dev-key");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(f, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(f, "utf8").trim(), "hex");
}

const userDir = (userId: string) => path.join(PHOTO_DIR, createHash("sha256").update(userId).digest("hex").slice(0, 24));

export function writePhoto(userId: string, fileName: string, data: Buffer) {
  const dir = userDir(userId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(data), c.final()]);
  fs.writeFileSync(path.join(dir, fileName), Buffer.concat([iv, c.getAuthTag(), enc]), { mode: 0o600 });
}

export function readPhoto(userId: string, fileName: string): Buffer {
  const buf = fs.readFileSync(path.join(userDir(userId), fileName));
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

export function deletePhotoFile(userId: string, fileName: string) {
  try {
    fs.unlinkSync(path.join(userDir(userId), fileName));
  } catch {
    /* already gone */
  }
}

export function deleteAllPhotos(userId: string) {
  fs.rmSync(userDir(userId), { recursive: true, force: true });
}

/** Validate a base64 JPEG/PNG/WebP data URL and return its bytes + media type. */
export function decodeImage(dataUrl: string): { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Unsupported image");
  const data = Buffer.from(m[2], "base64");
  if (data.length > 6 * 1024 * 1024) throw new Error("Image too large");
  const sig = data.subarray(0, 4).toString("hex");
  const okSig = sig.startsWith("ffd8") || sig === "89504e47" || data.subarray(8, 12).toString() === "WEBP";
  if (!okSig) throw new Error("File is not a valid image");
  return { data, mediaType: m[1] as "image/jpeg" | "image/png" | "image/webp" };
}
