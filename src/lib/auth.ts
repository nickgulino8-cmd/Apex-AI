import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db, json } from "./db";
import { ageFrom } from "./util";

const COOKIE = "apex_session";
const SESSION_DAYS = 30;

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

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)").run(hash(token), userId, expires);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(t));
  jar.delete(COOKIE);
}

type UserRow = { id: string; email: string; name: string; birth_date: string };
type ProfileRow = Record<string, unknown>;

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
  };
}

export async function currentUser(): Promise<User | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.birth_date FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hash(t), Date.now()) as UserRow | undefined;
  if (!row) return null;
  const age = ageFrom(row.birth_date);
  return { ...row, age, isMinor: age < 18, profile: loadProfile(row.id) };
}

/** For server components: redirect to login when signed out. */
export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * For route handlers: authenticated user + same-origin check on mutating requests
 * (SameSite=Lax cookies plus an Origin check gives CSRF protection without tokens).
 */
export async function apiUser(req: Request): Promise<User> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = (await headers()).get("host");
    if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
  }
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Not signed in");
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
