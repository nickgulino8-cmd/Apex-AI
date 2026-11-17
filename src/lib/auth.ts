import { db, json } from "./db";
import { ageFrom } from "./util";

/**
 * Single-user, on-device "auth". APEX stores one person's data in this browser; the
 * phone's own lock screen protects it. There are no passwords or sessions to steal.
 */

export type Profile = {
  experience: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  days_per_week: number;
  session_minutes: number;
  goals: string[];
  preferences: { likes?: string[]; avoid?: string[]; injuries?: string; split?: string };
  skin_type: string;
  skin_concerns: string[];
  skin_sensitive: boolean;
  pregnancy_flag: boolean;
  faith_content: boolean;
  units: "kg" | "lb";
  ai_memory: boolean;
  save_photos: boolean;
  photo_consent_at: string | null;
  onboarded: boolean;
  show_ratings: boolean;
  rating_reference: "male" | "female" | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  birth_date: string;
  age: number;
  isMinor: boolean;
  profile: Profile;
};

type ProfileRow = Record<string, unknown>;
type UserRow = { id: string; email: string; name: string; birth_date: string };

export function loadProfile(userId: string): Profile {
  const r = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as ProfileRow | undefined;
  if (!r) throw new Error("profile missing");
  return {
    experience: r.experience as Profile["experience"],
    equipment: json(r.equipment as string, []),
    days_per_week: r.days_per_week as number,
    session_minutes: r.session_minutes as number,
    goals: json(r.goals as string, []),
    preferences: json(r.preferences as string, {}),
    skin_type: r.skin_type as string,
    skin_concerns: json(r.skin_concerns as string, []),
    skin_sensitive: !!r.skin_sensitive,
    pregnancy_flag: !!r.pregnancy_flag,
    faith_content: !!r.faith_content,
    units: r.units as Profile["units"],
    ai_memory: !!r.ai_memory,
    save_photos: !!r.save_photos,
    photo_consent_at: (r.photo_consent_at as string) ?? null,
    onboarded: !!r.onboarded,
    show_ratings: !!r.show_ratings,
    rating_reference: (r.rating_reference as Profile["rating_reference"]) ?? null,
  };
}

export function currentUser(): User | null {
  const row = db.prepare("SELECT id, email, name, birth_date FROM users ORDER BY created_at LIMIT 1").get() as UserRow | undefined;
  if (!row) return null;
  const age = ageFrom(row.birth_date);
  return { ...row, age, isMinor: age < 18, profile: loadProfile(row.id) };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For local API handlers. */
export async function apiUser(_req?: Request): Promise<User> {
  const u = currentUser();
  if (!u) throw new HttpError(401, "Set up your profile first.");
  return u;
}

/** Simple fixed-window rate limit stored in SQLite (survives dev reloads). */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const row = db.prepare("SELECT count, window_start FROM login_attempts WHERE key = ?").get(key) as
    | { count: number; window_start: number }
    | undefined;
  if (!row || now - row.window_start > windowMs) {
    db.prepare("INSERT OR REPLACE INTO login_attempts (key, count, window_start) VALUES (?,1,?)").run(key, now);
    return true;
  }
  if (row.count >= max) return false;
  db.prepare("UPDATE login_attempts SET count = count + 1 WHERE key = ?").run(key);
  return true;
}
