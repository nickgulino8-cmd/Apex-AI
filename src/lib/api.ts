import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./auth";
import { AiUnavailableError } from "./ai";

/** Wraps a route handler with uniform JSON error handling. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: "Invalid input", issues: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
      if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message, code: "ai_unavailable" }, { status: 503 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  return schema.parse(raw);
}

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });
