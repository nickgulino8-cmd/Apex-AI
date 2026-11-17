import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, HttpError, rateLimit } from "@/lib/auth";
import { aiConfigured, chatStream, AiUnavailableError } from "@/lib/ai";
import { buildContext, localAnswer } from "@/lib/engine/assistant";
import { systemPrompt } from "@/lib/prompts";

export const maxDuration = 300;
const Mode = z.enum(["assistant", "appearance"]);

export const GET = handle(async (req: Request) => {
  const user = await apiUser(req);
  const mode = Mode.parse(new URL(req.url).searchParams.get("mode") ?? "assistant");
  const rows = db.prepare("SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? AND mode = ? ORDER BY id DESC LIMIT 60").all(user.id, mode);
  return ok({ messages: rows.reverse(), ai: aiConfigured() });
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  const mode = Mode.parse(new URL(req.url).searchParams.get("mode") ?? "assistant");
  db.prepare("DELETE FROM chat_messages WHERE user_id = ? AND mode = ?").run(user.id, mode);
  return ok();
});

/** Streams the reply as plain text. Falls back to the local assistant when AI isn't configured. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ message: z.string().trim().min(1).max(4000), mode: Mode }));
  if (!rateLimit(`chat:${user.id}`, 200, 24 * 3600 * 1000)) throw new HttpError(429, "Daily message limit reached.");
  const save = db.prepare("INSERT INTO chat_messages (user_id, role, content, mode) VALUES (?,?,?,?)");
  save.run(user.id, "user", b.message, b.mode);

  const enc = new TextEncoder();
  if (!aiConfigured()) {
    const text = localAnswer(user, b.message);
    save.run(user.id, "assistant", text, b.mode);
    return new Response(enc.encode(text), { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Apex-Mode": "local" } });
  }

  const history = (db.prepare("SELECT role, content FROM chat_messages WHERE user_id = ? AND mode = ? ORDER BY id DESC LIMIT 20").all(user.id, b.mode) as {
    role: "user" | "assistant";
    content: string;
  }[]).reverse();
  // The API requires alternating turns starting with a user message.
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    if (!messages.length && m.role !== "user") continue;
    const prev = messages.at(-1);
    if (prev && prev.role === m.role) prev.content = `${prev.content as string}\n\n${m.content}`;
    else messages.push({ role: m.role, content: m.content });
  }
  const system = systemPrompt(b.mode, buildContext(user), user.profile.ai_memory && !user.isMinor);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of chatStream({ system, messages })) {
          full += chunk;
          controller.enqueue(enc.encode(chunk));
        }
      } catch (e) {
        const msg = e instanceof AiUnavailableError ? e.message : "The AI response failed. Please try again.";
        const fallback = `\n\n_${msg}_\n\n${localAnswer(user, b.message)}`;
        full += fallback;
        controller.enqueue(enc.encode(fallback));
      }
      const stored = full.replace(/\n?REMEMBER:.*$/s, "").trim();
      if (stored) save.run(user.id, "assistant", stored, b.mode);
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Apex-Mode": "ai", "Cache-Control": "no-store" } });
});
