import { randomUUID } from "node:crypto";

export const id = () => randomUUID();

/** Local calendar date as YYYY-MM-DD (server time zone; client passes its own date where it matters). */
export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return today(d);
}

export function ageFrom(birthDate: string, now = new Date()): number {
  const b = new Date(birthDate + "T12:00:00");
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
