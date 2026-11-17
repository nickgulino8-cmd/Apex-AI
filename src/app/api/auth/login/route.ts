import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { createSession, HttpError, rateLimit } from "@/lib/auth";

const Schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });
// Constant-time-ish: always run bcrypt, even for unknown emails.
const DUMMY = bcrypt.hashSync("not-a-real-password", 12);

export const POST = handle(async (req: Request) => {
  const b = await body(req, Schema);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`login:${b.email}`, 8, 15 * 60 * 1000) || !rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000))
    throw new HttpError(429, "Too many attempts. Wait 15 minutes and try again.");
  const u = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(b.email) as { id: string; password_hash: string } | undefined;
  const valid = await bcrypt.compare(b.password, u?.password_hash ?? DUMMY);
  if (!u || !valid) throw new HttpError(401, "Email or password is incorrect.");
  await createSession(u.id);
  return ok();
});
