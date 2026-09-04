import type { ZodTypeAny, output } from "zod";
import type { AiHealth } from "@civic-replay/shared";
import {
  AIProviderUnavailableError,
  AIStructuredOutputError,
  type AIProvider,
  type GenerateOptions,
} from "./types.js";

type Responder = (prompt: string) => unknown;

/**
 * Deterministic in-memory provider for tests. Register canned responders by a
 * substring match on the prompt; the first match wins.
 */
export class FakeProvider implements AIProvider {
  readonly name = "fake";
  private responders: Array<{ match: string; value: Responder }> = [];
  private available = true;
  private failNext = false;

  on(match: string, value: unknown | Responder): this {
    this.responders.push({
      match,
      value: typeof value === "function" ? (value as Responder) : () => value,
    });
    return this;
  }

  setAvailable(available: boolean): this {
    this.available = available;
    return this;
  }

  failOnce(): this {
    this.failNext = true;
    return this;
  }

  private resolve(prompt: string): unknown {
    if (this.failNext) {
      this.failNext = false;
      throw new AIProviderUnavailableError("FakeProvider: forced failure");
    }
    if (!this.available) {
      throw new AIProviderUnavailableError("FakeProvider: marked unavailable");
    }
    const hit = this.responders.find((r) => prompt.includes(r.match));
    if (!hit) throw new Error(`FakeProvider: no responder for prompt`);
    return hit.value(prompt);
  }

  async generateStructured<S extends ZodTypeAny>(
    schema: S,
    prompt: string,
    _options?: GenerateOptions,
  ): Promise<output<S>> {
    const raw = this.resolve(prompt);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    throw new AIStructuredOutputError("FakeProvider: canned value invalid", {
      raw: JSON.stringify(raw),
      issues: parsed.error.message,
    });
  }

  async complete(prompt: string, _options?: GenerateOptions): Promise<string> {
    const raw = this.resolve(prompt);
    return typeof raw === "string" ? raw : JSON.stringify(raw);
  }

  async health(): Promise<AiHealth> {
    return {
      provider: this.name,
      available: this.available,
      reason: this.available ? undefined : "marked unavailable",
    };
  }
}
