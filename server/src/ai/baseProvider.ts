import type { ZodTypeAny, output } from "zod";
import {
  AIStructuredOutputError,
  type AIProvider,
  type GenerateOptions,
} from "./types.js";
import type { AiHealth } from "@civic-replay/shared";

const STRUCTURED_SYSTEM =
  "You are a backend for a civic-service simulation tool. " +
  "When asked for JSON, reply with a single JSON object and nothing else — " +
  "no prose, no markdown fences.";

/**
 * Shared structured-output behaviour: ask the model, extract JSON, validate
 * against the schema, and on failure retry ONCE with the validation error
 * embedded. A second failure raises `AIStructuredOutputError`.
 *
 * Concrete providers implement `chat()` (raw text) and `health()`.
 */
export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;

  protected abstract chat(
    system: string,
    prompt: string,
    options: GenerateOptions,
  ): Promise<string>;

  abstract health(): Promise<AiHealth>;

  async complete(prompt: string, options: GenerateOptions = {}): Promise<string> {
    return this.chat("", prompt, options);
  }

  async generateStructured<S extends ZodTypeAny>(
    schema: S,
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<output<S>> {
    const system = [STRUCTURED_SYSTEM, options.system].filter(Boolean).join("\n");
    const opts: GenerateOptions = { temperature: 0, ...options, system };

    const first = await this.chat(system, prompt, opts);
    const firstParsed = tryParse(schema, first);
    if (firstParsed.ok) return firstParsed.value;

    const repairPrompt =
      `${prompt}\n\n` +
      `Your previous answer failed validation:\n${firstParsed.issues}\n\n` +
      `Raw answer:\n${first}\n\n` +
      `Return a corrected JSON object that satisfies the schema.`;
    const second = await this.chat(system, repairPrompt, opts);
    const secondParsed = tryParse(schema, second);
    if (secondParsed.ok) return secondParsed.value;

    throw new AIStructuredOutputError(
      `${this.name}: structured output failed schema validation after repair`,
      { raw: second, issues: secondParsed.issues },
    );
  }
}

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: string };

function tryParse<S extends ZodTypeAny>(
  schema: S,
  text: string,
): ParseResult<output<S>> {
  const json = extractJson(text);
  if (json === null) {
    return { ok: false, issues: "Response did not contain a JSON object." };
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(json);
  } catch (err) {
    return { ok: false, issues: `Invalid JSON: ${(err as Error).message}` };
  }
  const result = schema.safeParse(candidate);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    issues: result.error.issues
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n"),
  };
}

/** Pull the first balanced `{...}` block out of a model response. */
export function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return null;
}
