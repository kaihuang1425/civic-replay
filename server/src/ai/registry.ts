import { config } from "../config.js";
import { OllamaProvider } from "./providers/ollama.js";
import type { AIProvider } from "./types.js";

/** Provider factories keyed by `AI_PROVIDER` value. Add a provider here only. */
const PROVIDERS: Record<string, () => AIProvider> = {
  ollama: () => new OllamaProvider(),
};

export const REGISTERED_PROVIDERS = Object.keys(PROVIDERS);

let active: AIProvider | null = null;

/** Resolve the configured provider, failing fast on an unknown name. */
export function getProvider(): AIProvider {
  if (active) return active;
  const name = config.aiProvider;
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(
      `Unknown AI_PROVIDER "${name}". Registered providers: ${REGISTERED_PROVIDERS.join(
        ", ",
      )}`,
    );
  }
  active = factory();
  return active;
}

/** Test hook: force a specific provider instance. */
export function setProvider(provider: AIProvider | null): void {
  active = provider;
}
