import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { HttpError, currentUser } from "@/lib/auth";
import { ageFrom, id } from "@/lib/util";
import { ensureHabits } from "@/lib/repo";
import { loadDemoData } from "@/lib/demo";

/** Creates the single on-device profile (or loads sample data). */
export const POST = handle(async (req: Request) => {
  const b = await body(
    req,
    z.union([
      z.object({ demo: z.literal(true) }),
      z.object({ name: z.string().trim().min(1).max(60), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    ]),
  );
  if (currentUser()) throw new HttpError(409, "A profile already exists on this device.");
  if ("demo" in b) {
    loadDemoData();
    return ok({ ok: true, demo: true }, 201);
  }
  const age = ageFrom(b.birthDate);
  if (Number.isNaN(age) || age > 120) throw new HttpError(400, "Enter a valid date of birth.");
  if (age < 13) throw new HttpError(403, "APEX AI is for people aged 13 and older.");
  const uid = id();
  db.transaction(() => {
    db.prepare("INSERT INTO users (id, email, password_hash, name, birth_date) VALUES (?,?,?,?,?)").run(uid, `${uid}@device.local`, "", b.name, b.birthDate);
    db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(uid);
  })();
  ensureHabits(uid, true);
  return ok({ ok: true, minor: age < 18 }, 201);
});
