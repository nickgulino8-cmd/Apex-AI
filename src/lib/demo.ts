import { db } from "./db";
import { id, today, addDays } from "./util";
import { generateProgram, type ProgramConfig } from "./engine/program";
import { buildRoutine } from "./engine/routine";
import { ensureHabits } from "./repo";

/**
 * Fills this device with ~8 weeks of sample history so every screen can be explored.
 * Only offered when no profile exists yet; "Erase everything" in Profile removes it.
 */
export function loadDemoData() {
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);


  const uid = id();
  const cfg: ProgramConfig = {
    experience: "intermediate", days: 4, minutes: 70, equipment: ["barbell", "dumbbell", "bench", "cable", "machine", "pull-up bar"],
    goal: "hypertrophy", split: "upper-lower", emphasis: [], avoid: [], likes: [],
  };
  const plan = generateProgram(cfg);
  const routine = buildRoutine({ skinType: "combination", concerns: ["acne", "texture"], sensitive: false, pregnancy: false, age: 27 });

  db.transaction(() => {
    db.prepare("INSERT INTO users (id, email, password_hash, name, birth_date) VALUES (?,?,?,?,?)").run(uid, "demo@device.local", "", "Alex Demo", "1999-03-14");
    db.prepare(
      `INSERT INTO profiles (user_id, experience, equipment, days_per_week, session_minutes, goals, skin_type, skin_concerns, onboarded, rating_reference)
       VALUES (?,?,?,?,?,?,?,?,1,'male')`,
    ).run(uid, cfg.experience, JSON.stringify(cfg.equipment), 4, 70, JSON.stringify(["hypertrophy", "strength"]), "combination", JSON.stringify(["acne", "texture"]));
    db.prepare("INSERT INTO programs (id, user_id, config, plan) VALUES (?,?,?,?)").run(id(), uid, JSON.stringify(cfg), JSON.stringify(plan));
    db.prepare("INSERT INTO skincare_routines (user_id, routine) VALUES (?,?)").run(uid, JSON.stringify(routine));

    // Starting loads (kg) by exercise; progress ~1–2% per week with noise.
    const start: Record<string, number> = {};
    const baseFor = (exId: string) => (start[exId] ??= /squat|deadlift|leg-press|hack/.test(exId) ? 90 : /bench|row|press/.test(exId) ? 55 : /pull|chin|dip|push-up|plank|hang|crunch|raise$/.test(exId) ? 0 : 22);
    const t = today();
    const insW = db.prepare("INSERT INTO workouts (id, user_id, date, title, program_day, duration_min, session_rpe) VALUES (?,?,?,?,?,?,?)");
    const insS = db.prepare("INSERT INTO workout_sets (workout_id, exercise_id, set_index, weight, reps, rpe) VALUES (?,?,?,?,?,?)");
    let dayIdx = 0;
    for (let d = 56; d >= 1; d--) {
      const date = addDays(t, -d);
      const dow = new Date(date + "T12:00:00").getDay();
      const scheduled = [1, 2, 4, 5].includes(dow);
      if (!scheduled || rnd() < 0.12) continue; // ~88% adherence
      const day = plan.days[dayIdx++ % plan.days.length];
      const wid = id();
      const week = (56 - d) / 7;
      insW.run(wid, uid, date, day.name.replace(/^Day \d+ · /, ""), day.key, 55 + Math.round(rnd() * 25), 7 + Math.round(rnd() * 2));
      let k = 0;
      for (const ex of day.exercises) {
        const base = baseFor(ex.exerciseId);
        const w = base ? Math.round((base * (1 + 0.015 * week + (rnd() - 0.5) * 0.02)) / 2.5) * 2.5 : 0;
        for (let s = 0; s < ex.sets; s++) insS.run(wid, ex.exerciseId, k++, w, 6 + Math.floor(rnd() * 5), 7.5 + Math.round(rnd() * 2) / 2);
      }
    }

    const insR = db.prepare("INSERT INTO recovery_logs (user_id, date, sleep_hours, sleep_quality, energy, soreness) VALUES (?,?,?,?,?,?)");
    const insSk = db.prepare("INSERT INTO skincare_logs (user_id, date, slot) VALUES (?,?,?)");
    for (let d = 30; d >= 1; d--) {
      const date = addDays(t, -d);
      insR.run(uid, date, Math.round((6.2 + rnd() * 2.3) * 2) / 2, 2 + Math.floor(rnd() * 3), 2 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 3));
      if (rnd() < 0.85) insSk.run(uid, date, "am");
      if (rnd() < 0.7) insSk.run(uid, date, "pm");
    }
    const insG = db.prepare("INSERT INTO goals (id, user_id, title, category, target_date, progress) VALUES (?,?,?,?,?,?)");
    insG.run(id(), uid, "Train 4× a week for 12 weeks", "fitness", addDays(t, 28), 66);
    insG.run(id(), uid, "Clear skin routine streak: 60 days", "skin", addDays(t, 45), 40);
    insG.run(id(), uid, "Read 12 books this year", "personal", null, 75);
  })();

  ensureHabits(uid, true);
  const habits = db.prepare("SELECT id FROM habits WHERE user_id = ?").all(uid) as { id: string }[];
  const insH = db.prepare("INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?,?)");
  for (let d = 84; d >= 1; d--) for (const h of habits) if (rnd() < 0.45 + (84 - d) / 84 * 0.4) insH.run(h.id, addDays(today(), -d));


}
