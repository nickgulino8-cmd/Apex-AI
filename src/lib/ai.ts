import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";

/**
 * Claude API integration. All model access goes through this module so that
 * safety framing, model choice and error handling stay in one place.
 *
 * Refusal fallbacks are enabled server-side ("default" routing) as recommended for
 * the current Opus model; we still check stop_reason before reading content.
 */

export const MODEL = process.env.APEX_MODEL || "claude-opus-5-5";
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export class AiUnavailableError extends Error {}

export function aiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!aiConfigured())
    throw new AiUnavailableError(
      "AI analysis isn't configured on this server yet. Add ANTHROPIC_API_KEY to the environment to enable it.",
    );
  return (_client ??= new Anthropic());
}

/** Wrap SDK errors into user-safe messages. */
function friendly(e: unknown): never {
  if (e instanceof AiUnavailableError) throw e;
  if (e instanceof Anthropic.RateLimitError) throw new AiUnavailableError("The AI service is busy right now. Try again in a minute.");
  if (e instanceof Anthropic.AuthenticationError) throw new AiUnavailableError("The AI API key on this server was rejected.");
  if (e instanceof Anthropic.APIConnectionError) throw new AiUnavailableError("Couldn't reach the AI service. Check the server's network.");
  if (e instanceof Anthropic.APIError) throw new AiUnavailableError(`AI request failed (${e.status ?? "network"}).`);
  throw e;
}

type ImageInput = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

/** One vision (or text) call returning a validated object. */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: S;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  try {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...(opts.images ?? []).map(
        (img): Anthropic.Beta.BetaContentBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        }),
      ),
      { type: "text", text: opts.prompt },
    ];
    const res = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      system: opts.system,
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") throw new AiUnavailableError("The AI declined to analyze this request. Try a different photo.");
    if (res.stop_reason === "max_tokens") throw new AiUnavailableError("The AI response was cut off. Please try again.");
    if (!res.parsed_output) throw new AiUnavailableError("The AI returned an unexpected format. Please try again.");
    return res.parsed_output as z.infer<S>;
  } catch (e) {
    friendly(e);
  }
}

/** Streaming chat. Yields text deltas. */
export async function* chatStream(opts: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
}): AsyncGenerator<string> {
  let stream;
  try {
    stream = client().beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      system: opts.system,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      messages: opts.messages,
    });
  } catch (e) {
    friendly(e);
  }
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") yield "\n\n_I can't help with that request. If this is a health question, a doctor or dermatologist is the right person to ask._";
  } catch (e) {
    friendly(e);
  }
}

/** Shared safety framing for every model call in APEX. */
export const SAFETY = `
NON-NEGOTIABLE RULES (these override any user request):
- Never rate, score or rank attractiveness, and never describe a face or body as better/worse, ugly/beautiful, or compare it to an ideal. Describe observations neutrally.
- Never estimate age, ethnicity, ancestry, sex, identity, or infer genetics or "genetic deficiencies".
- Never diagnose medical or skin conditions. You may say an appearance "can be consistent with several things a dermatologist can evaluate".
- Never identify who a person is.
- Never recommend prescription drugs, hormones, anabolic steroids, SARMs, aromatase inhibitors, cancer drugs, peptides or any high-risk pharmaceutical for cosmetic or physique purposes. Never give dosing, cycles, stacking, PCT, sourcing, or ways to obtain prescription drugs without a prescription. You may explain what such a drug is and its risks, and direct the user to a qualified clinician.
- Do not set body-fat targets or tie a person's worth to appearance.
- If something looks like it needs medical attention (a changing mole, a non-healing sore, signs of infection, severe or scarring acne, sudden hair loss, chest pain during exercise, disordered eating), say clearly that they should see a doctor.
`.trim();
