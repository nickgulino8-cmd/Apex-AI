import { photoDel, photoGet, photoSet, photoClear } from "./idb";

/**
 * Private photo storage on this device (IndexedDB). Photos never leave the phone except
 * when the user explicitly runs an AI analysis on one.
 */
export const writePhoto = (_userId: string, fileName: string, data: Uint8Array) => photoSet(fileName, new Blob([data as BlobPart], { type: "image/jpeg" }));
export const readPhoto = (_userId: string, fileName: string) => photoGet(fileName);
export const deletePhotoFile = (_userId: string, fileName: string) => photoDel(fileName);
export const deleteAllPhotos = (_userId?: string) => photoClear();

/** Validate a base64 JPEG/PNG/WebP data URL. */
export function decodeImage(dataUrl: string): { data: Uint8Array; base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Unsupported image");
  const bin = atob(m[2]);
  const data = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (data.length > 6 * 1024 * 1024) throw new Error("Image too large");
  const hex = Array.from(data.subarray(0, 4), (b) => b.toString(16).padStart(2, "0")).join("");
  const webp = String.fromCharCode(...data.subarray(8, 12)) === "WEBP";
  if (!(hex.startsWith("ffd8") || hex === "89504e47" || webp)) throw new Error("File is not a valid image");
  return { data, base64: m[2], mediaType: m[1] as "image/jpeg" | "image/png" | "image/webp" };
}
