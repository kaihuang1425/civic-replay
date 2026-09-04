import type { AiHealth } from "@civic-replay/shared";
import { config } from "../../config.js";
import { BaseProvider } from "../baseProvider.js";
import { AIProviderUnavailableError, type GenerateOptions } from "../types.js";

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

/** Talks to a local Ollama instance via its /api/chat endpoint. */
export class OllamaProvider extends BaseProvider {
  readonly name = "ollama";

  constructor(
    private readonly host: string = config.ollama.host,
    private readonly model: string = config.ollama.model,
  ) {
    super();
  }

  protected async chat(
    system: string,
    prompt: string,
    options: GenerateOptions,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 60_000,
    );
    try {
      const res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: "json",
          options: { temperature: options.temperature ?? 0 },
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        throw new AIProviderUnavailableError(
          `Ollama responded ${res.status} ${res.statusText}`,
        );
      }
      const data = (await res.json()) as OllamaChatResponse;
      if (data.error) throw new AIProviderUnavailableError(data.error);
      return data.message?.content ?? "";
    } catch (err) {
      if (err instanceof AIProviderUnavailableError) throw err;
      throw new AIProviderUnavailableError(
        `Ollama request failed: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(): Promise<AiHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const res = await fetch(`${this.host}/api/tags`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      if (!res.ok) {
        return {
          provider: this.name,
          available: false,
          model: this.model,
          reason: `Ollama responded ${res.status}`,
        };
      }
      const data = (await res.json()) as { models?: { name: string }[] };
      const hasModel = data.models?.some(
        (m) => m.name === this.model || m.name.startsWith(`${this.model}:`),
      );
      return {
        provider: this.name,
        available: true,
        model: this.model,
        reason: hasModel
          ? undefined
          : `Model ${this.model} not pulled; generation will fall back`,
      };
    } catch (err) {
      return {
        provider: this.name,
        available: false,
        model: this.model,
        reason: `Cannot reach Ollama at ${this.host}: ${(err as Error).message}`,
      };
    }
  }
}
