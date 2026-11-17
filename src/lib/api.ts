import { ZodError, type ZodType } from "zod";
import { HttpError } from "./auth";
import { AiUnavailableError } from "./ai";

const jsonRes = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/** Wraps a local API handler with uniform JSON error handling. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return jsonRes({ error: e.message }, e.status);
      if (e instanceof ZodError) return jsonRes({ error: "Invalid input", issues: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
      if (e instanceof AiUnavailableError) return jsonRes({ error: e.message, code: "ai_unavailable" }, 503);
      console.error(e);
      return jsonRes({ error: "Something went wrong. Please try again." }, 500);
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

export const ok = (data: unknown = { ok: true }, status = 200) => jsonRes(data, status);
