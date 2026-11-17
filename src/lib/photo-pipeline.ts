import "server-only";
import { db } from "./db";
import { HttpError, rateLimit, type User } from "./auth";
import { decodeImage, writePhoto } from "./storage";
import { id } from "./util";

/** Common checks for photo analysis: adults only, consent, daily limit, valid image. */
export function preparePhoto(user: User, dataUrl: string, consent: boolean) {
  if (user.isMinor) throw new HttpError(403, "Photo analysis is only available for adults (18+). This is an extra privacy safeguard for younger users.");
  if (!user.profile.photo_consent_at) {
    if (!consent) throw new HttpError(400, "Please review and accept the photo privacy notice first.");
    db.prepare("UPDATE profiles SET photo_consent_at = datetime('now') WHERE user_id = ?").run(user.id);
  }
  if (!rateLimit(`ai-photo:${user.id}`, 20, 24 * 3600 * 1000)) throw new HttpError(429, "Daily analysis limit reached (20). Try again tomorrow.");
  try {
    return decodeImage(dataUrl);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
}

export function savePhoto(user: User, kind: "face" | "body", data: Buffer): string {
  const pid = id();
  const file = `${id()}.bin`;
  writePhoto(user.id, file, data);
  db.prepare("INSERT INTO photos (id, user_id, kind, file_name) VALUES (?,?,?,?)").run(pid, user.id, kind, file);
  return pid;
}
