import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { createSession, HttpError, rateLimit } from "@/lib/auth";
import { ageFrom, id } from "@/lib/util";
import { ensureHabits } from "@/lib/repo";

const Schema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acceptTerms: z.literal(true),
});

export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
  const b = await body(req, Schema);
  const age = ageFrom(b.birthDate);
  if (Number.isNaN(age) || age > 120) throw new HttpError(400, "Enter a valid date of birth.");
  if (age < 13) throw new HttpError(403, "APEX AI is for people aged 13 and older.");
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(b.email)) throw new HttpError(409, "An account with that email already exists.");
  const uid = id();
  const hash = await bcrypt.hash(b.password, 12);
  db.transaction(() => {
    db.prepare("INSERT INTO users (id, email, password_hash, name, birth_date) VALUES (?,?,?,?,?)").run(uid, b.email, hash, b.name, b.birthDate);
    db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(uid);
  })();
  ensureHabits(uid, true);
  await createSession(uid);
  return ok({ ok: true, minor: age < 18 }, 201);
});
