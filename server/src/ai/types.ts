import type { ZodTypeAny, output } from "zod";
import type { AiHealth } from "@civic-replay/shared";

export interface GenerateOptions {
  /** Sampling temperature; low by default for structured output. */
  temperature?: number;
  /** Extra system framing appended to the base system prompt. */
  system?: string;
  /** Abort after this many milliseconds. */
  timeoutMs?: number;
}

/**
 * Provider-agnostic AI interface. Every consumer (sandbox generation, AI Engine)
 * depends on this — never on a concrete provider SDK.
 */
export interface AIProvider {
  readonly name: string;

  /** Return an object validated against `schema` (with one repair retry). */
  generateStructured<S extends ZodTypeAny>(
    schema: S,
    prompt: string,
    options?: GenerateOptions,
  ): Promise<output<S>>;

  /** Return free-form text. */
  complete(prompt: string, options?: GenerateOptions): Promise<string>;

  /** Report whether the provider is reachable and usable. */
  health(): Promise<AiHealth>;
}

/** Thrown when structured output still fails schema validation after a repair. */
export class AIStructuredOutputError extends Error {
  constructor(
    message: string,
    readonly detail: { raw: string; issues: string },
  ) {
    super(message);
    this.name = "AIStructuredOutputError";
  }
}

/** Thrown when the underlying provider is unreachable / errored. */
export class AIProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderUnavailableError";
  }
}
